import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import Literal

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.order import Order
from app.models.payment import PaymentAttempt
from app.models.refund import Refund
from app.models.user import User
from app.services.cashfree_service import (
    CashfreeAPIError,
    CashfreeService,
)

logger = logging.getLogger(__name__)


ManualRefundMethod = Literal[
    "manual_upi",
    "manual_bank_transfer",
]

ACTIVE_REFUND_STATUSES = {
    "pending",
    "processing",
}

RESERVED_REFUND_STATUSES = {
    "pending",
    "processing",
    "completed",
}

TERMINAL_CASHFREE_FAILURES = {
    "FAILED",
    "REJECTED",
    "CANCELLED",
}


class RefundService:
    def __init__(self, db: Session):
        self.db = db

    def initiate_refund(
        self,
        *,
        order_id: int,
        admin: User,
        reason: str | None = None,
        manual_method: ManualRefundMethod | None = None,
    ) -> Refund:
        """
        Create one full-order refund request.

        Cashfree refunds are sent to Cashfree after the DB record
        is committed. COD refunds wait for manual confirmation.
        """

        order = self.db.scalar(
            select(Order).where(Order.id == order_id).with_for_update()
        )

        if order is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found.",
            )

        # "returned" means the item was received/processed by admin.
        if order.status != "returned":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "A refund can only be initiated after the returned "
                    "item has been received and the order is marked returned."
                ),
            )

        existing_refunds = list(
            self.db.scalars(
                select(Refund).where(Refund.order_id == order.id).with_for_update()
            ).all()
        )

        if any(
            refund.status in RESERVED_REFUND_STATUSES for refund in existing_refunds
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "A refund already exists or is being processed "
                    "for this order. Check its status before retrying."
                ),
            )

        if any(refund.status == "completed" for refund in existing_refunds):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This order has already been refunded.",
            )

        amount = Decimal(str(order.total_amount)).quantize(Decimal("0.01"))

        if amount <= Decimal("0.00"):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="The order has no refundable amount.",
            )

        payment_attempt = None

        if order.payment_method == "online_payment":
            attempts = list(
                self.db.scalars(
                    select(PaymentAttempt)
                    .where(
                        PaymentAttempt.order_id == order.id,
                        PaymentAttempt.user_id == order.user_id,
                        PaymentAttempt.provider == "cashfree",
                    )
                    .with_for_update()
                ).all()
            )

            successful_attempts = [
                attempt for attempt in attempts if attempt.status.lower() == "paid"
            ]

            if len(successful_attempts) != 1:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        "A single successful Cashfree payment could not "
                        "be verified for this order. Refund initiation "
                        "has been blocked for safety."
                    ),
                )

            payment_attempt = successful_attempts[0]

            paid_amount = Decimal(str(payment_attempt.amount)).quantize(Decimal("0.01"))

            if paid_amount != amount:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        "The order total does not match the successful "
                        "payment amount. Manual review is required."
                    ),
                )

            refund_method = "cashfree"

        elif order.payment_method == "cash_on_delivery":
            if manual_method not in {
                "manual_upi",
                "manual_bank_transfer",
            }:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=(
                        "For COD orders, select manual_upi or "
                        "manual_bank_transfer. The admin must make "
                        "the transfer before marking it completed."
                    ),
                )

            refund_method = manual_method

        else:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "This order's payment method is not supported "
                    "by the current refund workflow."
                ),
            )

        refund = Refund(
            order_id=order.id,
            payment_attempt_id=(payment_attempt.id if payment_attempt else None),
            initiated_by_user_id=admin.id,
            refund_method=refund_method,
            amount=amount,
            currency="INR",
            status=("processing" if refund_method == "cashfree" else "pending"),
            reason=(reason or order.return_reason or "Customer return"),
        )

        try:
            self.db.add(refund)
            self.db.flush()

            # Cashfree's merchant refund ID must be alphanumeric and
            # 3-40 characters. Persist it before the external request
            # so a timed-out request can later be looked up safely.
            if refund_method == "cashfree":
                refund.provider_refund_id = (
                    f"SSR{refund.id}{refund.idempotency_key[:12]}"
                )

            # Commit before contacting the provider. A concurrent
            # click sees the pending/processing row and is rejected.
            self.db.commit()
            self.db.refresh(refund)

        except Exception:
            self.db.rollback()
            raise

        if refund_method != "cashfree":
            # COD: the money hasn't been transferred automatically.
            # It remains pending until the admin confirms the transfer.
            return refund

        try:
            gateway = CashfreeService()

            provider_response = gateway.create_refund(
                provider_order_id=payment_attempt.provider_order_id,
                refund_id=refund.provider_refund_id,
                amount=refund.amount,
                note=f"ShopSphere return order {order.id}",
                idempotency_key=refund.idempotency_key,
            )

        except CashfreeAPIError as exc:
            logger.error(
                "Cashfree refund request failed for internal refund "
                "id=%s, HTTP status=%s, details=%s",
                refund.id,
                exc.http_status,
                exc.details,
            )

            if exc.uncertain:
                # Do not mark failed or create a second refund if
                # Cashfree might already have accepted this request.
                refund.status = "processing"
                refund.failure_reason = (
                    "The provider response is inconclusive. Refresh "
                    "the refund status before attempting any retry."
                )
                self.db.commit()
                self.db.refresh(refund)
                return refund

            refund.status = "failed"
            refund.failure_reason = (
                exc.details or "Cashfree rejected the refund request."
            )[:500]

            self.db.commit()
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=(
                    "Cashfree rejected the refund request. The refund "
                    "record was retained for admin review."
                ),
            ) from exc

        except HTTPException as exc:
            # For example, missing server-side Cashfree credentials.
            refund.status = "failed"
            refund.failure_reason = str(exc.detail)[:500]
            self.db.commit()
            raise

        self._apply_cashfree_status(
            refund=refund,
            order=order,
            provider_response=provider_response,
        )

        self.db.commit()
        self.db.refresh(refund)
        return refund

    def refresh_cashfree_refund(
        self,
        refund_id: int,
    ) -> Refund:
        """Refresh a Cashfree refund without creating a new refund."""

        refund = self.db.scalar(
            select(Refund).where(Refund.id == refund_id).with_for_update()
        )

        if refund is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Refund not found.",
            )

        if refund.refund_method != "cashfree":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This refund is not a Cashfree refund.",
            )

        if refund.status in {"completed", "failed"}:
            return refund

        payment_attempt = self.db.get(
            PaymentAttempt,
            refund.payment_attempt_id,
        )

        if payment_attempt is None or not refund.provider_refund_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "The original payment or provider refund reference "
                    "is missing. Manual review is required."
                ),
            )

        try:
            provider_response = CashfreeService().get_refund(
                provider_order_id=payment_attempt.provider_order_id,
                refund_id=refund.provider_refund_id,
            )

        except CashfreeAPIError as exc:
            logger.error(
                "Could not refresh Cashfree refund id=%s: %s",
                refund.id,
                exc.details,
            )
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=(
                    "Unable to verify the refund with Cashfree. "
                    "The stored status has not been changed."
                ),
            ) from exc

        order = self.db.scalar(
            select(Order).where(Order.id == refund.order_id).with_for_update()
        )

        if order is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="The order associated with this refund was not found.",
            )

        self._apply_cashfree_status(
            refund=refund,
            order=order,
            provider_response=provider_response,
        )

        self.db.commit()
        self.db.refresh(refund)
        return refund

    def complete_manual_refund(
        self,
        *,
        refund_id: int,
        transaction_reference: str,
    ) -> Refund:
        """
        Record an admin-confirmed COD refund transfer.

        This does not transfer money or independently verify a bank/UPI
        transaction. The admin must verify the payment before confirming.
        """

        refund = self.db.scalar(
            select(Refund).where(Refund.id == refund_id).with_for_update()
        )

        if refund is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Refund not found.",
            )

        if refund.refund_method not in {
            "manual_upi",
            "manual_bank_transfer",
        }:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Only manual COD refunds can use this action.",
            )

        reference = transaction_reference.strip()

        if not reference:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="A valid transaction reference is required.",
            )

        if refund.status == "completed":
            if refund.manual_transaction_reference == reference:
                return refund

            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "This refund is already completed with another "
                    "transaction reference."
                ),
            )

        if refund.status not in {"pending", "processing"}:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Only pending manual refunds can be completed.",
            )

        order = self.db.scalar(
            select(Order).where(Order.id == refund.order_id).with_for_update()
        )

        if order is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="The order associated with this refund was not found.",
            )

        if order.status != "returned":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="The order must remain in returned status until the refund is verified.",
            )

        refund.manual_transaction_reference = reference
        refund.status = "completed"
        refund.failure_reason = None
        refund.completed_at = datetime.now(timezone.utc)

        self._mark_order_refunded_if_fully_refunded(order)
        self.db.commit()
        self.db.refresh(refund)
        return refund

    def _apply_cashfree_status(
        self,
        *,
        refund: Refund,
        order: Order,
        provider_response: dict,
    ) -> None:
        provider_status = str(provider_response.get("refund_status", "")).upper()

        returned_refund_id = provider_response.get("refund_id")
        if returned_refund_id:
            # This is the merchant's refund_id, used by Cashfree's
            # Get Refund endpoint.
            refund.provider_refund_id = str(returned_refund_id)

        if provider_status == "SUCCESS":
            refund.status = "completed"
            refund.failure_reason = None
            refund.completed_at = datetime.now(timezone.utc)

            self._mark_order_refunded_if_fully_refunded(order)

        elif provider_status in TERMINAL_CASHFREE_FAILURES:
            refund.status = "failed"
            refund.failure_reason = (
                str(
                    provider_response.get("status_description")
                    or f"Cashfree refund status: {provider_status}"
                )
            )[:500]

        else:
            # Pending, pending approval, on hold or an unrecognized
            # status must not be shown as a completed refund.
            refund.status = "processing"
            refund.failure_reason = None

    def _mark_order_refunded_if_fully_refunded(
        self,
        order: Order,
    ) -> None:
        """Update order status only after completed refunds cover its total."""

        completed_refunds = list(
            self.db.scalars(
                select(Refund).where(
                    Refund.order_id == order.id,
                    Refund.status == "completed",
                )
            ).all()
        )

        completed_amount = sum(
            (Decimal(str(refund.amount)) for refund in completed_refunds),
            start=Decimal("0.00"),
        )

        order_total = Decimal(str(order.total_amount))

        if completed_amount >= order_total:
            order.status = "refunded"
            order.return_processed_at = datetime.now(timezone.utc)
