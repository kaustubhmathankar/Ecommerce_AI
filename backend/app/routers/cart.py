from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.cart import (
    CartItemRequest,
    CartResponse,
    CartSyncRequest,
)
from app.services.cart_service import CartService

router = APIRouter(
    prefix="/cart",
    tags=["Cart"],
)


def build_response(
    service: CartService,
    user_id: int,
) -> CartResponse:
    items = service.get_cart(user_id)

    return CartResponse(
        items=items,
        cart_count=sum(item.quantity for item in items),
    )


@router.get(
    "",
    response_model=CartResponse,
)
def get_cart(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = CartService(db)

    return build_response(
        service,
        current_user.id,
    )


@router.post(
    "/sync",
    response_model=CartResponse,
)
def sync_cart(
    data: CartSyncRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = CartService(db)

    service.sync_cart(
        current_user.id,
        data,
    )

    return build_response(
        service,
        current_user.id,
    )


@router.post(
    "/items",
    response_model=CartResponse,
)
def add_cart_item(
    data: CartItemRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = CartService(db)

    service.add_item(
        current_user.id,
        data,
    )

    return build_response(
        service,
        current_user.id,
    )


@router.patch(
    "/items/{product_id}",
    response_model=CartResponse,
)
def update_cart_item(
    product_id: int,
    data: CartItemRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # The URL identifies the product.
    # The body quantity is authoritative.
    service = CartService(db)

    service.update_item(
        current_user.id,
        product_id,
        data.quantity,
    )

    return build_response(
        service,
        current_user.id,
    )


@router.delete(
    "/items/{product_id}",
    response_model=CartResponse,
)
def remove_cart_item(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = CartService(db)

    service.remove_item(
        current_user.id,
        product_id,
    )

    return build_response(
        service,
        current_user.id,
    )


@router.delete(
    "",
    status_code=204,
)
def clear_cart(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    CartService(db).clear_cart(current_user.id)
