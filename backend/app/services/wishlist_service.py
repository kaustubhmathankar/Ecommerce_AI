from fastapi import HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.wishlist import WishlistItem
from app.schemas.wishlist import WishlistSyncRequest


class WishlistService:

    def __init__(self, db: Session):
        self.db = db

    def get_product_ids(
        self,
        user_id: int,
    ) -> list[int]:
        statement = (
            select(WishlistItem.product_id)
            .join(
                Product,
                WishlistItem.product_id == Product.id,
            )
            .where(
                WishlistItem.user_id == user_id,
                Product.is_active.is_(True),
            )
            .order_by(
                WishlistItem.created_at.desc(),
                WishlistItem.id.desc(),
            )
        )

        return list(self.db.scalars(statement).all())

    def toggle(
        self,
        user_id: int,
        product_id: int,
    ) -> list[int]:
        existing = self.db.scalar(
            select(WishlistItem).where(
                WishlistItem.user_id == user_id,
                WishlistItem.product_id == product_id,
            )
        )

        if existing:
            self.db.delete(existing)
            self.db.commit()

            return self.get_product_ids(user_id)

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

        self.db.add(
            WishlistItem(
                user_id=user_id,
                product_id=product_id,
            )
        )

        self.db.commit()

        return self.get_product_ids(user_id)

    def sync(
        self,
        user_id: int,
        data: WishlistSyncRequest,
    ) -> list[int]:
        product_ids = set(data.product_ids)

        if product_ids:
            products = self.db.scalars(
                select(Product).where(
                    Product.id.in_(product_ids),
                    Product.is_active.is_(True),
                )
            ).all()

            active_product_ids = {product.id for product in products}

            existing_ids = set(
                self.db.scalars(
                    select(WishlistItem.product_id).where(
                        WishlistItem.user_id == user_id,
                        WishlistItem.product_id.in_(active_product_ids),
                    )
                ).all()
            )

            for product_id in active_product_ids - existing_ids:
                self.db.add(
                    WishlistItem(
                        user_id=user_id,
                        product_id=product_id,
                    )
                )

        self.db.commit()

        return self.get_product_ids(user_id)

    def clear(
        self,
        user_id: int,
    ) -> None:
        self.db.execute(
            delete(WishlistItem).where(
                WishlistItem.user_id == user_id,
            )
        )

        self.db.commit()
