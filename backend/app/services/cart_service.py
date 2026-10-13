from fastapi import HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.cart import CartItem
from app.models.product import Product
from app.schemas.cart import CartItemRequest, CartSyncRequest


class CartService:
    MAX_ITEM_QUANTITY = 10

    def __init__(self, db: Session):
        self.db = db

    def get_cart(self, user_id: int) -> list[CartItem]:
        statement = (
            select(CartItem)
            .join(Product, CartItem.product_id == Product.id)
            .where(
                CartItem.user_id == user_id,
                Product.is_active.is_(True),
            )
            .order_by(
                CartItem.created_at.desc(),
                CartItem.id.desc(),
            )
        )

        return list(self.db.scalars(statement).all())

    def add_item(
        self,
        user_id: int,
        data: CartItemRequest,
    ) -> list[CartItem]:
        product = self._get_product(data.product_id)

        existing = self.db.scalar(
            select(CartItem).where(
                CartItem.user_id == user_id,
                CartItem.product_id == data.product_id,
            )
        )

        current_quantity = existing.quantity if existing else 0

        max_allowed = min(
            product.stock_quantity,
            self.MAX_ITEM_QUANTITY,
        )

        next_quantity = current_quantity + data.quantity

        if max_allowed <= 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This product is out of stock.",
            )

        if next_quantity > max_allowed:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Maximum available quantity for "
                    f"{product.name} is {max_allowed}."
                ),
            )

        if existing:
            existing.quantity = next_quantity
        else:
            self.db.add(
                CartItem(
                    user_id=user_id,
                    product_id=data.product_id,
                    quantity=data.quantity,
                )
            )

        self.db.commit()

        return self.get_cart(user_id)

    def update_item(
        self,
        user_id: int,
        product_id: int,
        quantity: int,
    ) -> list[CartItem]:
        product = self._get_product(product_id)

        existing = self.db.scalar(
            select(CartItem).where(
                CartItem.user_id == user_id,
                CartItem.product_id == product_id,
            )
        )

        if existing is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cart item not found.",
            )

        max_allowed = min(
            product.stock_quantity,
            self.MAX_ITEM_QUANTITY,
        )

        if quantity > max_allowed:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Maximum available quantity for "
                    f"{product.name} is {max_allowed}."
                ),
            )

        if max_allowed <= 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This product is out of stock.",
            )

        existing.quantity = quantity

        self.db.commit()

        return self.get_cart(user_id)

    def remove_item(
        self,
        user_id: int,
        product_id: int,
    ) -> list[CartItem]:
        existing = self.db.scalar(
            select(CartItem).where(
                CartItem.user_id == user_id,
                CartItem.product_id == product_id,
            )
        )

        if existing is not None:
            self.db.delete(existing)
            self.db.commit()

        return self.get_cart(user_id)

    def clear_cart(
        self,
        user_id: int,
    ) -> None:
        self.db.execute(
            delete(CartItem).where(
                CartItem.user_id == user_id,
            )
        )

        self.db.commit()

    def sync_cart(
        self,
        user_id: int,
        data: CartSyncRequest,
    ) -> list[CartItem]:
        requested: dict[int, int] = {}

        for item in data.items:
            requested[item.product_id] = (
                requested.get(item.product_id, 0) + item.quantity
            )

        for product_id, quantity in requested.items():
            product = self._get_product(product_id)

            max_allowed = min(
                product.stock_quantity,
                self.MAX_ITEM_QUANTITY,
            )

            if max_allowed <= 0:
                continue

            quantity = min(
                quantity,
                max_allowed,
            )

            existing = self.db.scalar(
                select(CartItem).where(
                    CartItem.user_id == user_id,
                    CartItem.product_id == product_id,
                )
            )

            if existing:
                existing.quantity = min(
                    existing.quantity + quantity,
                    max_allowed,
                )
            else:
                self.db.add(
                    CartItem(
                        user_id=user_id,
                        product_id=product_id,
                        quantity=quantity,
                    )
                )

        self.db.commit()

        return self.get_cart(user_id)

    def _get_product(
        self,
        product_id: int,
    ) -> Product:
        product = self.db.scalar(
            select(Product).where(
                Product.id == product_id,
                Product.is_active.is_(True),
            )
        )

        if product is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found.",
            )

        return product
