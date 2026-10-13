from statistics import mean

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.review import Review
from app.models.user import User

from app.schemas.review import (
    AdminReviewListResponse,
    AdminReviewResponse,
    ReviewCreate,
    ReviewListResponse,
    ReviewResponse,
    ReviewUpdate,
)


class ReviewService:
    REVIEWABLE_ORDER_STATUSES = {
        "delivered",
        "return_requested",
        "return_approved",
        "return_rejected",
        "returned",
        "refunded",
    }

    def __init__(self, db: Session):
        self.db = db

    # ============================================================
    # PUBLIC REVIEW LIST + SUMMARY
    # ============================================================

    def list_for_product(
        self,
        product_id: int,
    ) -> ReviewListResponse:

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

        rows = self.db.execute(
            select(
                Review,
                User.name,
            )
            .join(
                User,
                User.id == Review.user_id,
            )
            .where(
                Review.product_id == product_id,
            )
            .order_by(
                Review.created_at.desc(),
                Review.id.desc(),
            )
        ).all()

        items = [
            self._serialize_public(
                review,
                customer_name,
            )
            for review, customer_name in rows
        ]

        distribution = {
            "1": 0,
            "2": 0,
            "3": 0,
            "4": 0,
            "5": 0,
        }

        for review, _customer_name in rows:
            distribution[str(review.rating)] += 1

        average_rating = (
            round(
                mean([review.rating for review, _customer_name in rows]),
                1,
            )
            if rows
            else 0.0
        )

        return ReviewListResponse(
            items=items,
            total=len(items),
            average_rating=average_rating,
            rating_distribution=distribution,
        )

    # ============================================================
    # CREATE REVIEW
    # ============================================================

    def create_review(
        self,
        product_id: int,
        user: User,
        data: ReviewCreate,
    ) -> ReviewResponse:

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

        existing_review = self.db.scalar(
            select(Review).where(
                Review.product_id == product_id,
                Review.user_id == user.id,
            )
        )

        if existing_review is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "You have already reviewed this product. "
                    "Edit your existing review instead."
                ),
            )

        purchase = self.db.execute(
            select(
                Order,
                OrderItem,
            )
            .join(
                OrderItem,
                OrderItem.order_id == Order.id,
            )
            .where(
                Order.user_id == user.id,
                OrderItem.product_id == product_id,
                Order.status.in_(
                    self.REVIEWABLE_ORDER_STATUSES,
                ),
            )
            .order_by(
                Order.created_at.desc(),
                Order.id.desc(),
            )
            .limit(1)
        ).first()

        if purchase is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "You can review this product only after "
                    "purchasing it and receiving the order."
                ),
            )

        order, order_item = purchase

        review = Review(
            product_id=product_id,
            user_id=user.id,
            order_id=order.id,
            order_item_id=order_item.id,
            rating=data.rating,
            title=data.title,
            comment=data.comment,
            is_verified_purchase=True,
        )

        self.db.add(review)

        try:
            self.db.commit()

        except IntegrityError as exc:
            self.db.rollback()

            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "You have already reviewed this product. "
                    "Edit your existing review instead."
                ),
            ) from exc

        self.db.refresh(review)

        return self._serialize_public(
            review,
            user.name,
        )

    # ============================================================
    # UPDATE OWN REVIEW
    # ============================================================

    def update_review(
        self,
        review_id: int,
        user: User,
        data: ReviewUpdate,
    ) -> ReviewResponse:

        review = self.db.scalar(
            select(Review).where(
                Review.id == review_id,
            )
        )

        if review is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Review not found.",
            )

        if review.user_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only edit your own review.",
            )

        review.rating = data.rating
        review.title = data.title
        review.comment = data.comment

        self.db.commit()

        self.db.refresh(
            review,
        )

        return self._serialize_public(
            review,
            user.name,
        )

    # ============================================================
    # DELETE OWN REVIEW
    # ============================================================

    def delete_own_review(
        self,
        review_id: int,
        user: User,
    ) -> None:

        review = self.db.scalar(
            select(Review).where(
                Review.id == review_id,
            )
        )

        if review is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Review not found.",
            )

        if review.user_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only delete your own review.",
            )

        self.db.delete(review)

        self.db.commit()

    # ============================================================
    # ADMIN LIST
    # ============================================================

    def list_for_admin(
        self,
    ) -> AdminReviewListResponse:

        rows = self.db.execute(
            select(
                Review,
                User.name,
                User.email,
                Product.name,
            )
            .join(
                User,
                User.id == Review.user_id,
            )
            .join(
                Product,
                Product.id == Review.product_id,
            )
            .order_by(
                Review.created_at.desc(),
                Review.id.desc(),
            )
        ).all()

        items = [
            self._serialize_admin(
                review,
                customer_name,
                customer_email,
                product_name,
            )
            for (
                review,
                customer_name,
                customer_email,
                product_name,
            ) in rows
        ]

        return AdminReviewListResponse(
            items=items,
            total=len(items),
        )

    # ============================================================
    # ADMIN DELETE
    # ============================================================

    def delete_review_as_admin(
        self,
        review_id: int,
    ) -> None:

        review = self.db.scalar(
            select(Review).where(
                Review.id == review_id,
            )
        )

        if review is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Review not found.",
            )

        self.db.delete(review)

        self.db.commit()

    # ============================================================
    # SERIALIZERS
    # ============================================================

    @staticmethod
    def _serialize_public(
        review: Review,
        customer_name: str,
    ) -> ReviewResponse:

        return ReviewResponse(
            id=review.id,
            product_id=review.product_id,
            user_id=review.user_id,
            order_id=review.order_id,
            order_item_id=review.order_item_id,
            customer_name=customer_name,
            rating=review.rating,
            title=review.title,
            comment=review.comment,
            is_verified_purchase=review.is_verified_purchase,
            created_at=review.created_at,
            updated_at=review.updated_at,
        )

    @staticmethod
    def _serialize_admin(
        review: Review,
        customer_name: str,
        customer_email: str,
        product_name: str,
    ) -> AdminReviewResponse:

        return AdminReviewResponse(
            id=review.id,
            product_id=review.product_id,
            user_id=review.user_id,
            order_id=review.order_id,
            order_item_id=review.order_item_id,
            customer_name=customer_name,
            customer_email=customer_email,
            product_name=product_name,
            rating=review.rating,
            title=review.title,
            comment=review.comment,
            is_verified_purchase=review.is_verified_purchase,
            created_at=review.created_at,
            updated_at=review.updated_at,
        )
