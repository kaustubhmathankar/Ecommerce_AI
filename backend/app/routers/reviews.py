from fastapi import (
    APIRouter,
    Depends,
    status,
)

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import (
    require_admin,
    require_customer,
)

from app.database.session import get_db

from app.models.product import Product
from app.models.user import User

from app.schemas.review import (
    AdminReviewListResponse,
    ReviewCreate,
    ReviewListResponse,
    ReviewResponse,
    ReviewUpdate,
)

from app.services.notification_service import (
    NotificationService,
)

from app.services.review_service import (
    ReviewService,
)

router = APIRouter(
    prefix="/products",
    tags=["Reviews"],
)

admin_router = APIRouter(
    prefix="/admin/reviews",
    tags=["Admin Reviews"],
)


# ============================================================
# PUBLIC REVIEWS
# ============================================================


@router.get(
    "/{product_id}/reviews",
    response_model=ReviewListResponse,
)
def get_product_reviews(
    product_id: int,
    db: Session = Depends(get_db),
):

    return ReviewService(
        db,
    ).list_for_product(
        product_id,
    )


# ============================================================
# CUSTOMER CREATE REVIEW
# ============================================================


@router.post(
    "/{product_id}/reviews",
    response_model=ReviewResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_product_review(
    product_id: int,
    data: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_customer,
    ),
):

    review = ReviewService(
        db,
    ).create_review(
        product_id,
        current_user,
        data,
    )

    try:

        product_name = (
            db.scalar(
                select(Product.name).where(
                    Product.id == review.product_id,
                )
            )
            or f"Product #{review.product_id}"
        )

        NotificationService(
            db,
        ).notify_all_admins(
            event_type="review_created",
            title="New product review",
            message=(
                f"{current_user.name} submitted a "
                f"{review.rating}-star review for "
                f"{product_name}."
            ),
        )

    except Exception:
        db.rollback()

    return review


# ============================================================
# CUSTOMER UPDATE OWN REVIEW
# ============================================================


@router.patch(
    "/reviews/{review_id}",
    response_model=ReviewResponse,
)
def update_product_review(
    review_id: int,
    data: ReviewUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_customer,
    ),
):

    return ReviewService(
        db,
    ).update_review(
        review_id,
        current_user,
        data,
    )


# ============================================================
# CUSTOMER DELETE OWN REVIEW
# ============================================================


@router.delete(
    "/reviews/{review_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_product_review(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_customer,
    ),
):

    ReviewService(
        db,
    ).delete_own_review(
        review_id,
        current_user,
    )

    return None


# ============================================================
# ADMIN LIST REVIEWS
# ============================================================


@admin_router.get(
    "",
    response_model=AdminReviewListResponse,
)
def get_admin_reviews(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_admin,
    ),
):

    del current_user

    return ReviewService(
        db,
    ).list_for_admin()


# ============================================================
# ADMIN DELETE REVIEW
# ============================================================


@admin_router.delete(
    "/{review_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_admin_review(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_admin,
    ),
):

    del current_user

    ReviewService(
        db,
    ).delete_review_as_admin(
        review_id,
    )

    return None
