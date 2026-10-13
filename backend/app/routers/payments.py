import json
from decimal import Decimal
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)

from fastapi.responses import JSONResponse

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import require_customer
from app.database.session import get_db

from app.models.payment import PaymentAttempt
from app.models.user import User

from app.schemas.order import (
    OrderCreate,
    OrderResponse,
)

from app.schemas.payment import (
    CashfreePaymentCreate,
    CashfreePaymentCreateResponse,
)

from app.services.cashfree_service import (
    CashfreeService,
)

from app.services.notification_service import (
    NotificationService,
)

from app.services.order_service import (
    OrderService,
)

router = APIRouter(
    prefix="/payments",
    tags=["Payments"],
)


# ============================================================
# SAFE ADMIN NOTIFICATION
# ============================================================


def _notify_admins_safely(
    db: Session,
    *,
    event_type: str,
    title: str,
    message: str,
    order_id: int | None,
) -> None:

    try:

        NotificationService(
            db,
        ).notify_all_admins(
            event_type=event_type,
            title=title,
            message=message,
            order_id=order_id,
        )

    except Exception:

        db.rollback()


# ============================================================
# SAFE CUSTOMER NOTIFICATION
# ============================================================


def _notify_customer_safely(
    db: Session,
    *,
    user_id: int,
    event_type: str,
    title: str,
    message: str,
    order_id: int | None,
) -> None:

    try:

        NotificationService(
            db,
        ).notify_user(
            user_id,
            event_type=event_type,
            title=title,
            message=message,
            order_id=order_id,
        )

    except Exception:

        db.rollback()


# ============================================================
# CASHFREE CREATE PAYMENT
# ============================================================


@router.post(
    "/cashfree/create",
    response_model=CashfreePaymentCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_cashfree_payment(
    data: CashfreePaymentCreate,
    db: Session = Depends(
        get_db,
    ),
    current_user: User = Depends(
        require_customer,
    ),
):

    order_data = OrderCreate(
        items=data.items,
        address_id=data.address_id,
        full_name=data.full_name,
        phone=data.phone,
        address_line=data.address_line,
        city=data.city,
        state=data.state,
        postal_code=data.postal_code,
        payment_method="cash_on_delivery",
    )

    order_service = OrderService(
        db,
    )

    amount = order_service.calculate_order_total(
        order_data,
        current_user,
    )

    delivery = order_service._resolve_delivery_details(
        order_data,
        current_user.id,
    )

    customer_phone = delivery["phone"]

    if not customer_phone:

        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=("A valid phone number is required " "for online payment."),
        )

    cashfree = CashfreeService()

    return_url = f"{settings.frontend_url}" f"/checkout?cashfree_order_id={{order_id}}"

    response = cashfree.create_order(
        amount=amount,
        customer_id=str(
            current_user.id,
        ),
        customer_name=(delivery["full_name"] or current_user.name),
        customer_email=current_user.email,
        customer_phone=customer_phone,
        return_url=return_url,
    )

    payment_attempt = PaymentAttempt(
        user_id=current_user.id,
        provider="cashfree",
        provider_order_id=response["provider_order_id"],
        payment_session_id=response["payment_session_id"],
        amount=amount,
        currency="INR",
        status="pending",
    )

    try:

        db.add(
            payment_attempt,
        )

        db.commit()

        db.refresh(
            payment_attempt,
        )

    except Exception:

        db.rollback()

        raise

    return CashfreePaymentCreateResponse(
        payment_attempt_id=payment_attempt.id,
        provider="cashfree",
        provider_order_id=payment_attempt.provider_order_id,
        payment_session_id=payment_attempt.payment_session_id,
        amount=payment_attempt.amount,
        currency=payment_attempt.currency,
    )


# ============================================================
# CASHFREE STATUS REQUEST
# ============================================================


def _get_cashfree_payment_status(
    provider_order_id: str,
) -> str:

    if settings.cashfree_environment.lower() == "production":

        base_url = "https://api.cashfree.com/pg"

    else:

        base_url = "https://sandbox.cashfree.com/pg"

    url = f"{base_url}/orders/" f"{provider_order_id}/payments"

    request = Request(
        url,
        method="GET",
        headers={
            "x-client-id": settings.cashfree_app_id,
            "x-client-secret": (settings.cashfree_secret_key.get_secret_value()),
            "x-api-version": settings.cashfree_api_version,
            "Accept": "application/json",
        },
    )

    try:

        with urlopen(
            request,
            timeout=20,
        ) as response:

            raw_body = response.read().decode("utf-8")

    except HTTPError as exc:

        body = exc.read().decode(
            "utf-8",
            errors="replace",
        )

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "Cashfree payment verification failed. "
                f"Provider response: {body[:500]}"
            ),
        ) from exc

    except URLError as exc:

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=("Unable to connect to Cashfree while " "verifying the payment."),
        ) from exc

    try:

        transactions = json.loads(
            raw_body,
        )

    except json.JSONDecodeError as exc:

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=("Cashfree returned an invalid " "payment response."),
        ) from exc

    if not isinstance(
        transactions,
        list,
    ):

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=("Unexpected payment response " "from Cashfree."),
        )

    payment_statuses = [
        str(
            transaction.get(
                "payment_status",
                "",
            )
        ).upper()
        for transaction in transactions
        if isinstance(
            transaction,
            dict,
        )
    ]

    if "SUCCESS" in payment_statuses:
        return "success"

    if "PENDING" in payment_statuses:
        return "pending"

    return "failure"


# ============================================================
# CASHFREE VERIFY + CREATE SHOPSPHERE ORDER
# ============================================================


@router.post(
    "/cashfree/{payment_attempt_id}/verify",
    response_model=OrderResponse,
)
def verify_cashfree_payment(
    payment_attempt_id: int,
    data: CashfreePaymentCreate,
    db: Session = Depends(
        get_db,
    ),
    current_user: User = Depends(
        require_customer,
    ),
):

    payment_attempt = db.scalar(
        select(
            PaymentAttempt,
        ).where(
            PaymentAttempt.id == payment_attempt_id,
            PaymentAttempt.user_id == current_user.id,
            PaymentAttempt.provider == "cashfree",
        )
    )

    if payment_attempt is None:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment attempt not found.",
        )

    # --------------------------------------------------------
    # IDEMPOTENCY
    # --------------------------------------------------------

    if payment_attempt.order_id is not None:

        order = OrderService(
            db,
        ).get_order(
            payment_attempt.order_id,
        )

        return order

    if payment_attempt.status == "paid":

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Payment was already marked successful, "
                "but no order is attached to it."
            ),
        )

    # --------------------------------------------------------
    # REBUILD ORDER DATA
    # --------------------------------------------------------

    order_data = OrderCreate(
        items=data.items,
        address_id=data.address_id,
        full_name=data.full_name,
        phone=data.phone,
        address_line=data.address_line,
        city=data.city,
        state=data.state,
        postal_code=data.postal_code,
        payment_method="online_payment",
    )

    order_service = OrderService(
        db,
    )

    # --------------------------------------------------------
    # RECALCULATE TOTAL
    # --------------------------------------------------------

    amount = order_service.calculate_order_total(
        order_data,
        current_user,
    )

    if Decimal(str(amount)) != Decimal(
        str(
            payment_attempt.amount,
        )
    ):

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "The cart total changed after the payment "
                "was started. Please restart the payment."
            ),
        )

    # --------------------------------------------------------
    # VERIFY WITH CASHFREE
    # --------------------------------------------------------

    provider_status = _get_cashfree_payment_status(
        payment_attempt.provider_order_id,
    )

    # --------------------------------------------------------
    # PAYMENT STILL PROCESSING
    # --------------------------------------------------------

    if provider_status == "pending":

        payment_attempt.status = "pending"

        db.commit()

        return JSONResponse(
            status_code=status.HTTP_202_ACCEPTED,
            content={
                "status": "pending",
                "message": ("Payment is still being processed. " "Please check again."),
                "payment_attempt_id": (payment_attempt.id),
            },
        )

    # --------------------------------------------------------
    # PAYMENT FAILED
    # --------------------------------------------------------

    if provider_status == "failure":

        payment_attempt.status = "failed"

        db.commit()

        _notify_customer_safely(
            db,
            user_id=current_user.id,
            event_type="payment_failed",
            title="Payment failed",
            message=(
                "Your Cashfree payment was not successful. "
                "No ShopSphere order was created."
            ),
            order_id=None,
        )

        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=(
                "Cashfree payment was not successful. "
                "No ShopSphere order was created."
            ),
        )

    # --------------------------------------------------------
    # PAYMENT SUCCESS
    # --------------------------------------------------------

    try:

        order = order_service.place_order(
            order_data,
            current_user,
        )

        payment_attempt.status = "paid"

        payment_attempt.order_id = order.id

        db.commit()

        # ----------------------------------------------------
        # ADMIN NOTIFICATION
        # ----------------------------------------------------

        _notify_admins_safely(
            db,
            event_type="order_placed",
            title="New online order placed",
            message=(
                f"{current_user.name} placed "
                f"online Order #{order.id} "
                f"for ₹{order.total_amount}. "
                "Payment confirmed."
            ),
            order_id=order.id,
        )

        # ----------------------------------------------------
        # CUSTOMER NOTIFICATION
        # ----------------------------------------------------

        _notify_customer_safely(
            db,
            user_id=current_user.id,
            event_type="payment_success",
            title="Payment successful",
            message=(
                f"Payment for Order #{order.id} "
                "was confirmed successfully. "
                "Your order is now being processed."
            ),
            order_id=order.id,
        )

        return order

    except Exception:

        db.rollback()

        raise
