from datetime import datetime, timedelta, timezone
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.orm import Session, selectinload

from app.models.address import Address
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.user import User
from app.schemas.order import (
    OrderCancellationCreate,
    OrderCreate,
    OrderStatusUpdate,
    ReturnRequestCreate,
)


class OrderService:
    FREE_SHIPPING_THRESHOLD = Decimal("1999.00")
    SHIPPING_FEE = Decimal("99.00")
    RETURN_WINDOW_DAYS = 30

    USER_CANCELLABLE_STATUSES = {
        "placed",
        "processing",
    }

    # Order status transitions controlled by an administrator.
    # Refund completion is deliberately excluded and handled by
    # RefundService only after payment/refund verification.
    ADMIN_TRANSITIONS = {
        "placed": {"processing"},
        "processing": {"shipped"},
        "shipped": {"delivered"},
        "delivered": {"return_requested"},
        "return_requested": {
            "return_approved",
            "return_rejected",
        },
        "return_approved": {"returned"},
    }

    def __init__(self, db: Session):
        self.db = db

    # ------------------------------------------------------------
    # CALCULATE ORDER TOTAL
    # ------------------------------------------------------------

    def calculate_order_total(
        self,
        data: OrderCreate,
        user: User,
    ) -> Decimal:
        # Resolve delivery details to validate the selected address.
        delivery = self._resolve_delivery_details(
            data,
            user.id,
        )
        del delivery

        requested = {item.product_id: item.quantity for item in data.items}

        products = self.db.scalars(
            select(Product).where(
                Product.id.in_(requested),
                Product.is_active.is_(True),
            )
        ).all()

        products_by_id = {product.id: product for product in products}

        if len(products_by_id) != len(requested):
            self.db.rollback()

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="One or more products are unavailable.",
            )

        total = Decimal("0.00")

        for product_id, quantity in requested.items():
            product = products_by_id[product_id]

            if product.stock_quantity < quantity:
                self.db.rollback()

                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(f"Insufficient stock for product " f"{product_id}."),
                )

            total += Decimal(str(product.price)) * quantity

        shipping_amount = (
            self.SHIPPING_FEE
            if total < self.FREE_SHIPPING_THRESHOLD
            else Decimal("0.00")
        )

        return total + shipping_amount

    # ------------------------------------------------------------
    # PLACE ORDER
    # ------------------------------------------------------------

    def place_order(
        self,
        data: OrderCreate,
        user: User,
    ) -> Order:
        delivery = self._resolve_delivery_details(
            data,
            user.id,
        )

        requested = {item.product_id: item.quantity for item in data.items}

        products = self.db.scalars(
            select(Product).where(
                Product.id.in_(requested),
                Product.is_active.is_(True),
            )
        ).all()

        products_by_id = {product.id: product for product in products}

        if len(products_by_id) != len(requested):
            self.db.rollback()

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="One or more products are unavailable.",
            )

        for product_id, quantity in requested.items():
            if products_by_id[product_id].stock_quantity < quantity:
                self.db.rollback()

                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(f"Insufficient stock for product " f"{product_id}."),
                )

        order_items: list[OrderItem] = []
        total = Decimal("0.00")

        try:
            # Lock stock through conditional updates to reduce the
            # risk of selling more items than are available.
            for product_id in sorted(requested):
                product = products_by_id[product_id]
                quantity = requested[product_id]

                result = self.db.execute(
                    update(Product)
                    .where(
                        Product.id == product_id,
                        Product.is_active.is_(True),
                        Product.stock_quantity >= quantity,
                    )
                    .values(stock_quantity=(Product.stock_quantity - quantity))
                    .execution_options(synchronize_session=False)
                )

                if result.rowcount != 1:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=(f"Insufficient stock for product " f"{product_id}."),
                    )

                unit_price = Decimal(str(product.price))
                line_total = unit_price * quantity

                total += line_total

                order_items.append(
                    OrderItem(
                        product_id=product.id,
                        product_name=product.name,
                        unit_price=unit_price,
                        quantity=quantity,
                        line_total=line_total,
                    )
                )

            shipping_amount = (
                self.SHIPPING_FEE
                if total < self.FREE_SHIPPING_THRESHOLD
                else Decimal("0.00")
            )

            order = Order(
                user_id=user.id,
                full_name=delivery["full_name"],
                phone=delivery["phone"],
                address_line=delivery["address_line"],
                city=delivery["city"],
                state=delivery["state"],
                postal_code=delivery["postal_code"],
                payment_method=data.payment_method,
                shipping_amount=shipping_amount,
                total_amount=total + shipping_amount,
                items=order_items,
            )

            self.db.add(order)
            self.db.commit()

            return self.get_order(order.id)

        except Exception:
            self.db.rollback()
            raise

    # ------------------------------------------------------------
    # RESOLVE DELIVERY DETAILS
    # ------------------------------------------------------------

    def _resolve_delivery_details(
        self,
        data: OrderCreate,
        user_id: int,
    ) -> dict[str, str]:
        if data.address_id is not None:
            address = self.db.scalar(
                select(Address).where(
                    Address.id == data.address_id,
                    Address.user_id == user_id,
                )
            )

            if address is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=("The selected delivery address " "was not found."),
                )

            return {
                "full_name": address.full_name,
                "phone": address.phone,
                "address_line": address.address_line,
                "city": address.city,
                "state": address.state,
                "postal_code": address.postal_code,
            }

        return {
            "full_name": data.full_name or "",
            "phone": data.phone or "",
            "address_line": data.address_line or "",
            "city": data.city or "",
            "state": data.state or "",
            "postal_code": data.postal_code or "",
        }

    # ------------------------------------------------------------
    # CUSTOMER ORDER LIST
    # ------------------------------------------------------------

    def list_orders(
        self,
        user_id: int,
    ) -> list[Order]:
        statement = (
            select(Order)
            .options(selectinload(Order.items))
            .where(Order.user_id == user_id)
            .order_by(
                Order.created_at.desc(),
                Order.id.desc(),
            )
        )

        return list(self.db.scalars(statement).all())

    # ------------------------------------------------------------
    # ADMIN ORDER LIST
    # ------------------------------------------------------------

    def list_all_orders(self) -> list[Order]:
        statement = (
            select(Order)
            .options(selectinload(Order.items))
            .order_by(
                Order.created_at.desc(),
                Order.id.desc(),
            )
        )

        return list(self.db.scalars(statement).all())

    # ------------------------------------------------------------
    # ADMIN UPDATE ORDER STATUS
    # ------------------------------------------------------------

    def update_order_status(
        self,
        order_id: int,
        data: OrderStatusUpdate,
    ) -> Order:
        order = self.get_order(order_id)

        # IMPORTANT:
        # An admin must not mark an order refunded using the regular
        # order-status endpoint. A refund must be initiated and
        # verified through RefundService.
        if data.status == "refunded":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "An order cannot be marked refunded through "
                    "the order status endpoint. Use Refund "
                    "Management to initiate or verify the refund."
                ),
            )

        allowed = self.ADMIN_TRANSITIONS.get(
            order.status,
            set(),
        )

        if data.status not in allowed:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(f"Order cannot move from {order.status} " f"to {data.status}."),
            )

        now = self._now()

        if data.status == "return_approved":
            order.return_processed_at = now

        elif data.status == "return_rejected":
            order.return_processed_at = now

        elif data.status == "returned":
            order.return_processed_at = now

            # Restore inventory only once, after the return has
            # been received and the order is marked returned.
            self._restore_stock(order)

        # Do not add a "refunded" branch here.
        # RefundService owns verified refund completion.

        order.status = data.status

        self.db.commit()

        return self.get_order(order_id)

    # ------------------------------------------------------------
    # CUSTOMER CANCEL ORDER
    # ------------------------------------------------------------

    def cancel_order(
        self,
        order_id: int,
        data: OrderCancellationCreate,
        user: User,
    ) -> Order:
        order = self.get_order_for_user(
            order_id,
            user,
        )

        if order.status not in self.USER_CANCELLABLE_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=("This order can no longer be cancelled."),
            )

        order.status = "cancelled"
        order.cancellation_reason = data.reason
        order.cancelled_at = self._now()

        self._restore_stock(order)

        self.db.commit()

        return self.get_order(order_id)

    # ------------------------------------------------------------
    # CUSTOMER REQUEST RETURN
    # ------------------------------------------------------------

    def request_return(
        self,
        order_id: int,
        data: ReturnRequestCreate,
        user: User,
    ) -> Order:
        order = self.get_order_for_user(
            order_id,
            user,
        )

        if order.status != "delivered":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=("Only delivered orders can be returned."),
            )

        created_at = self._as_utc(order.created_at)

        if self._now() > created_at + timedelta(days=self.RETURN_WINDOW_DAYS):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"The {self.RETURN_WINDOW_DAYS}-day " "return window has expired."
                ),
            )

        order.status = "return_requested"
        order.return_reason = data.reason
        order.return_requested_at = self._now()
        order.return_processed_at = None

        self.db.commit()

        return self.get_order(order_id)

    # ------------------------------------------------------------
    # GET ORDER
    # ------------------------------------------------------------

    def get_order(
        self,
        order_id: int,
    ) -> Order:
        statement = (
            select(Order).options(selectinload(Order.items)).where(Order.id == order_id)
        )

        order = self.db.scalar(statement)

        if order is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found.",
            )

        return order

    # ------------------------------------------------------------
    # GET ORDER FOR CUSTOMER OR ADMIN
    # ------------------------------------------------------------

    def get_order_for_user(
        self,
        order_id: int,
        user: User,
    ) -> Order:
        order = self.get_order(order_id)

        if order.user_id != user.id and user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=("You are not allowed to access this order."),
            )

        return order

    # ------------------------------------------------------------
    # RESTORE PRODUCT STOCK
    # ------------------------------------------------------------

    def _restore_stock(
        self,
        order: Order,
    ) -> None:
        if order.stock_restored:
            return

        for item in order.items:
            self.db.execute(
                update(Product)
                .where(Product.id == item.product_id)
                .values(stock_quantity=(Product.stock_quantity + item.quantity))
                .execution_options(synchronize_session=False)
            )

        order.stock_restored = True

    # ------------------------------------------------------------
    # DATETIME HELPERS
    # ------------------------------------------------------------

    @staticmethod
    def _now() -> datetime:
        return datetime.now(timezone.utc)

    @staticmethod
    def _as_utc(
        value: datetime,
    ) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)

        return value.astimezone(timezone.utc)
