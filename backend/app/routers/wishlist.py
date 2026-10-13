from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.wishlist import (
    WishlistResponse,
    WishlistSyncRequest,
    WishlistToggleRequest,
)
from app.services.wishlist_service import WishlistService

router = APIRouter(
    prefix="/wishlist",
    tags=["Wishlist"],
)


def build_response(
    service: WishlistService,
    user_id: int,
) -> WishlistResponse:
    product_ids = service.get_product_ids(user_id)

    return WishlistResponse(
        product_ids=product_ids,
        wishlist_count=len(product_ids),
    )


@router.get(
    "",
    response_model=WishlistResponse,
)
def get_wishlist(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = WishlistService(db)

    return build_response(
        service,
        current_user.id,
    )


@router.post(
    "/sync",
    response_model=WishlistResponse,
)
def sync_wishlist(
    data: WishlistSyncRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = WishlistService(db)

    service.sync(
        current_user.id,
        data,
    )

    return build_response(
        service,
        current_user.id,
    )


@router.post(
    "/toggle",
    response_model=WishlistResponse,
)
def toggle_wishlist(
    data: WishlistToggleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = WishlistService(db)

    service.toggle(
        current_user.id,
        data.product_id,
    )

    return build_response(
        service,
        current_user.id,
    )


@router.delete(
    "",
    status_code=204,
)
def clear_wishlist(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    WishlistService(db).clear(current_user.id)
