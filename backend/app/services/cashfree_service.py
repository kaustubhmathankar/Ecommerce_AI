import json
import logging
from decimal import Decimal
from urllib import error, request
from urllib.parse import quote
from uuid import UUID, uuid4

from fastapi import HTTPException, status

from app.core.config import settings

logger = logging.getLogger(__name__)


class CashfreeAPIError(Exception):
    """Cashfree API error with safe retry/outcome information."""

    def __init__(
        self,
        message: str,
        *,
        details: str = "",
        uncertain: bool = False,
        http_status: int | None = None,
    ):
        super().__init__(message)
        self.details = details
        self.uncertain = uncertain
        self.http_status = http_status


class CashfreeService:
    SANDBOX_URL = "https://sandbox.cashfree.com/pg"
    PRODUCTION_URL = "https://api.cashfree.com/pg"

    def __init__(self):
        self.app_id = settings.cashfree_app_id.strip()
        self.secret_key = settings.cashfree_secret_key.get_secret_value().strip()

        if settings.cashfree_environment.strip().lower() == "production":
            self.base_url = self.PRODUCTION_URL
        else:
            self.base_url = self.SANDBOX_URL

        if not self.app_id or not self.secret_key:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=(
                    "Cashfree payment gateway is not configured. "
                    "Check CASHFREE_APP_ID and CASHFREE_SECRET_KEY "
                    "in the backend environment."
                ),
            )

    @staticmethod
    def _safe_error_details(raw_body: str) -> str:
        """Extract useful provider error fields without logging secrets."""

        try:
            data = json.loads(raw_body)
        except (json.JSONDecodeError, TypeError):
            return (raw_body or "No provider error details.")[:500]

        if isinstance(data, dict):
            safe = {
                key: data[key] for key in ("type", "code", "message") if key in data
            }
            if safe:
                return json.dumps(safe, ensure_ascii=False)[:500]

        return "Cashfree returned an error without recognized details."

    def _request_json(
        self,
        *,
        method: str,
        path: str,
        payload: dict | None = None,
        idempotency_key: str | None = None,
    ) -> dict:
        body = json.dumps(payload).encode("utf-8") if payload is not None else None

        headers = {
            "x-client-id": self.app_id,
            "x-client-secret": self.secret_key,
            "x-api-version": settings.cashfree_api_version,
            "x-request-id": str(uuid4()),
            "Accept": "application/json",
            "Content-Type": "application/json",
        }

        if idempotency_key:
            # Cashfree expects a UUID-formatted idempotency key.
            headers["x-idempotency-key"] = str(UUID(hex=idempotency_key))

        http_request = request.Request(
            url=f"{self.base_url}{path}",
            data=body,
            method=method,
            headers=headers,
        )

        try:
            with request.urlopen(
                http_request,
                timeout=25,
            ) as response:
                raw_body = response.read().decode(
                    "utf-8",
                    errors="replace",
                )

        except error.HTTPError as exc:
            raw_body = exc.read().decode(
                "utf-8",
                errors="replace",
            )
            details = self._safe_error_details(raw_body)

            # A provider 5xx response can leave the outcome uncertain.
            raise CashfreeAPIError(
                "Cashfree returned an HTTP error.",
                details=details,
                uncertain=exc.code >= 500,
                http_status=exc.code,
            ) from exc

        except (error.URLError, TimeoutError, OSError) as exc:
            # A POST may have reached Cashfree even if its response
            # was lost. Never blindly issue a new refund in this case.
            raise CashfreeAPIError(
                "Unable to establish a confirmed response from Cashfree.",
                details=str(getattr(exc, "reason", exc))[:300],
                uncertain=(method.upper() == "POST"),
            ) from exc

        try:
            response_data = json.loads(raw_body)
        except json.JSONDecodeError as exc:
            raise CashfreeAPIError(
                "Cashfree returned an invalid JSON response.",
                details="The provider response could not be parsed.",
                uncertain=(method.upper() == "POST"),
            ) from exc

        # Some Cashfree refund examples return a one-item array.
        if isinstance(response_data, list):
            if len(response_data) != 1 or not isinstance(response_data[0], dict):
                raise CashfreeAPIError(
                    "Cashfree returned an unexpected response.",
                    details="Unexpected response structure.",
                    uncertain=(method.upper() == "POST"),
                )
            response_data = response_data[0]

        if not isinstance(response_data, dict):
            raise CashfreeAPIError(
                "Cashfree returned an unexpected response.",
                details="Expected a JSON object.",
                uncertain=(method.upper() == "POST"),
            )

        return response_data

    def create_order(
        self,
        *,
        amount: Decimal,
        customer_id: str,
        customer_name: str,
        customer_email: str,
        customer_phone: str,
        return_url: str,
    ) -> dict:
        """Create a Cashfree payment order; preserves the existing API."""

        provider_order_id = f"shopsphere_{uuid4().hex}"

        payload = {
            "order_id": provider_order_id,
            "order_amount": float(amount),
            "order_currency": "INR",
            "customer_details": {
                "customer_id": customer_id,
                "customer_name": customer_name,
                "customer_email": customer_email,
                "customer_phone": customer_phone,
            },
            "order_meta": {
                "return_url": return_url,
            },
        }

        try:
            response_data = self._request_json(
                method="POST",
                path="/orders",
                payload=payload,
            )
        except CashfreeAPIError as exc:
            logger.error(
                "Cashfree order creation failed: status=%s details=%s",
                exc.http_status,
                exc.details,
            )
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Cashfree could not create the payment order.",
            ) from exc

        payment_session_id = response_data.get("payment_session_id")

        if not payment_session_id:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Cashfree did not return a payment session.",
            )

        return {
            "provider_order_id": provider_order_id,
            "payment_session_id": payment_session_id,
            "raw_response": response_data,
        }

    def create_refund(
        self,
        *,
        provider_order_id: str,
        refund_id: str,
        amount: Decimal,
        note: str,
        idempotency_key: str,
    ) -> dict:
        """Initiate a refund against the original Cashfree order."""

        payload = {
            "refund_amount": float(amount),
            "refund_id": refund_id,
            "refund_note": (note.strip() or "ShopSphere customer return")[:100],
            "refund_speed": "STANDARD",
        }

        return self._request_json(
            method="POST",
            path=(f"/orders/{quote(provider_order_id, safe='')}" f"/refunds"),
            payload=payload,
            idempotency_key=idempotency_key,
        )

    def get_refund(
        self,
        *,
        provider_order_id: str,
        refund_id: str,
    ) -> dict:
        """Fetch the current Cashfree status for a particular refund."""

        return self._request_json(
            method="GET",
            path=(
                f"/orders/{quote(provider_order_id, safe='')}"
                f"/refunds/{quote(refund_id, safe='')}"
            ),
        )
