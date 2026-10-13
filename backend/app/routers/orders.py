import logging

from fastapi import (
    APIRouter,
    Depends,
    status,
)

from sqlalchemy.orm import Session

from app.core.security import (
    get_current_user,
    require_admin,
    require_customer,
)

from app.database.session import get_db

from app.models.user import User

from app.schemas.order import (
    OrderCancellationCreate,
    OrderCreate,
    OrderResponse,
    OrderStatusUpdate,
    ReturnRequestCreate,
)

from app.services.notification_service import (
    NotificationService,
)

from app.services.order_service import (
    OrderService,
)

logger = logging.getLogger(
    "shopsphere.orders",
)


router = APIRouter(
    prefix="/orders",
    tags=["Orders"],
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

        logger.exception(
            "Failed to create admin notification " "event_type=%s order_id=%s",
            event_type,
            order_id,
        )


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

        logger.exception(
            "Failed to create customer notification "
            "event_type=%s user_id=%s order_id=%s",
            event_type,
            user_id,
            order_id,
        )


# ============================================================
# PLACE ORDER
# ============================================================


@router.post(
    "",
    response_model=OrderResponse,
    status_code=status.HTTP_201_CREATED,
)
def place_order(
    data: OrderCreate,
    db: Session = Depends(
        get_db,
    ),
    current_user: User = Depends(
        require_customer,
    ),
):

    service = OrderService(
        db,
    )

    order = service.place_order(
        data,
        current_user,
    )

    # --------------------------------------------------------
    # ADMIN NOTIFICATION
    # --------------------------------------------------------

    _notify_admins_safely(
        db,
        event_type="order_placed",
        title="New order placed",
        message=(
            f"{current_user.name} placed "
            f"Order #{order.id} "
            f"for ₹{order.total_amount}."
        ),
        order_id=order.id,
    )

    # --------------------------------------------------------
    # CUSTOMER NOTIFICATION
    # --------------------------------------------------------

    _notify_customer_safely(
        db,
        user_id=current_user.id,
        event_type="order_placed",
        title="Order placed successfully",
        message=(
            f"Your ShopSphere Order #{order.id} has been placed "
            f"for ₹{order.total_amount}."
        ),
        order_id=order.id,
    )

    return service.get_order(
        order.id,
    )


# ============================================================
# CUSTOMER ORDER HISTORY
# ============================================================


@router.get(
    "",
    response_model=list[OrderResponse],
)
def get_order_history(
    db: Session = Depends(
        get_db,
    ),
    current_user: User = Depends(
        get_current_user,
    ),
):

    return OrderService(
        db,
    ).list_orders(
        current_user.id,
    )


# ============================================================
# ADMIN ALL ORDERS
# ============================================================


@router.get(
    "/admin",
    response_model=list[OrderResponse],
)
def get_all_orders(
    db: Session = Depends(
        get_db,
    ),
    current_user: User = Depends(
        require_admin,
    ),
):

    del current_user

    return OrderService(
        db,
    ).list_all_orders()


# ============================================================
# GET ONE ORDER
# ============================================================


@router.get(
    "/{order_id}",
    response_model=OrderResponse,
)
def get_order(
    order_id: int,
    db: Session = Depends(
        get_db,
    ),
    current_user: User = Depends(
        get_current_user,
    ),
):

    return OrderService(
        db,
    ).get_order_for_user(
        order_id,
        current_user,
    )


# ============================================================
# CUSTOMER CANCEL ORDER
# ============================================================


@router.post(
    "/{order_id}/cancel",
    response_model=OrderResponse,
)
def cancel_order(
    order_id: int,
    data: OrderCancellationCreate,
    db: Session = Depends(
        get_db,
    ),
    current_user: User = Depends(
        require_customer,
    ),
):

    service = OrderService(
        db,
    )

    order = service.cancel_order(
        order_id,
        data,
        current_user,
    )

    # --------------------------------------------------------
    # ADMIN NOTIFICATION
    # --------------------------------------------------------

    _notify_admins_safely(
        db,
        event_type="order_cancelled",
        title="Order cancelled by customer",
        message=(
            f"{current_user.name} cancelled "
            f"Order #{order.id}. "
            f"Reason: {data.reason}"
        ),
        order_id=order.id,
    )

    # --------------------------------------------------------
    # CUSTOMER NOTIFICATION
    # --------------------------------------------------------

    _notify_customer_safely(
        db,
        user_id=current_user.id,
        event_type="order_cancelled",
        title="Order cancelled",
        message=(
            f"Your Order #{order.id} was cancelled successfully. "
            f"Reason: {data.reason}"
        ),
        order_id=order.id,
    )

    return service.get_order(
        order.id,
    )


# ============================================================
# CUSTOMER REQUEST RETURN
# ============================================================


@router.post(
    "/{order_id}/return",
    response_model=OrderResponse,
)
def request_return(
    order_id: int,
    data: ReturnRequestCreate,
    db: Session = Depends(
        get_db,
    ),
    current_user: User = Depends(
        require_customer,
    ),
):

    service = OrderService(
        db,
    )

    order = service.request_return(
        order_id,
        data,
        current_user,
    )

    # --------------------------------------------------------
    # ADMIN NOTIFICATION
    # --------------------------------------------------------

    _notify_admins_safely(
        db,
        event_type="return_requested",
        title="New return request",
        message=(
            f"{current_user.name} requested "
            f"a return for Order #{order.id}. "
            f"Reason: {data.reason}"
        ),
        order_id=order.id,
    )

    # --------------------------------------------------------
    # CUSTOMER NOTIFICATION
    # --------------------------------------------------------

    _notify_customer_safely(
        db,
        user_id=current_user.id,
        event_type="return_requested",
        title="Return request submitted",
        message=(
            f"Your return request for Order #{order.id} has been "
            "submitted and is waiting for admin review."
        ),
        order_id=order.id,
    )

    return service.get_order(
        order.id,
    )


# ============================================================
# ADMIN UPDATE ORDER STATUS
# ============================================================


@router.patch(
    "/{order_id}/status",
    response_model=OrderResponse,
)
def update_order_status(
    order_id: int,
    data: OrderStatusUpdate,
    db: Session = Depends(
        get_db,
    ),
    current_user: User = Depends(
        require_admin,
    ),
):

    del current_user

    service = OrderService(
        db,
    )

    order = service.update_order_status(
        order_id,
        data,
    )

    # --------------------------------------------------------
    # CUSTOMER NOTIFICATION
    # --------------------------------------------------------

    status_notifications = {
        "processing": (
            "order_processing",
            "Order is being processed",
            f"Your Order #{order.id} is now being processed.",
        ),
        "shipped": (
            "order_shipped",
            "Order shipped",
            f"Your Order #{order.id} has been shipped.",
        ),
        "delivered": (
            "order_delivered",
            "Order delivered",
            f"Your Order #{order.id} has been delivered successfully.",
        ),
        "return_approved": (
            "return_approved",
            "Return approved",
            f"Your return request for Order #{order.id} has been approved.",
        ),
        "return_rejected": (
            "return_rejected",
            "Return request rejected",
            f"Your return request for Order #{order.id} has been rejected.",
        ),
        "returned": (
            "returned",
            "Return received",
            f"Your returned item for Order #{order.id} has been received.",
        ),
        "refunded": (
            "refunded",
            "Refund processed",
            f"Your refund for Order #{order.id} has been processed.",
        ),
    }

    event_type, title, message = status_notifications.get(
        data.status,
        (
            f"order_{data.status}",
            "Order status updated",
            (f"Your Order #{order.id} is now " f"{data.status.replace('_', ' ')}."),
        ),
    )

    _notify_customer_safely(
        db,
        user_id=order.user_id,
        event_type=event_type,
        title=title,
        message=message,
        order_id=order.id,
    )

    return order
