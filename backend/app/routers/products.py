from decimal import Decimal

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.security import require_admin
from app.database.session import get_db
from app.models.user import User
from app.schemas.product import (
    ProductCreate,
    ProductFilterOptionsResponse,
    ProductListResponse,
    ProductResponse,
)
from app.services.product_service import ProductService

router = APIRouter(
    prefix="/products",
    tags=["Products"],
)


@router.get(
    "/filters",
    response_model=ProductFilterOptionsResponse,
)
def get_product_filter_options(
    db: Session = Depends(get_db),
):
    return ProductService(db).get_filter_options()


@router.get(
    "",
    response_model=ProductListResponse,
)
def get_products(
    page: int = Query(
        default=1,
        ge=1,
        description="Page number",
    ),
    limit: int = Query(
        default=12,
        ge=1,
        le=100,
        description="Products per page",
    ),
    search: str | None = Query(
        default=None,
        max_length=100,
    ),
    category_id: int | None = Query(
        default=None,
        ge=1,
    ),
    brand: str | None = Query(
        default=None,
        max_length=100,
    ),
    min_price: Decimal | None = Query(
        default=None,
        ge=0,
    ),
    max_price: Decimal | None = Query(
        default=None,
        ge=0,
    ),
    in_stock: bool | None = Query(
        default=None,
    ),
    featured: bool | None = Query(
        default=None,
    ),
    on_sale: bool | None = Query(
        default=None,
    ),
    min_discount: Decimal | None = Query(
        default=None,
        ge=0,
        le=100,
    ),
    sort_by: str = Query(
        default="newest",
        pattern=(
            "^(newest|oldest|price_asc|price_desc|" "name_asc|featured|discount)$"
        ),
    ),
    db: Session = Depends(get_db),
):
    return ProductService(db).get_products(
        page=page,
        limit=limit,
        search=search,
        category_id=category_id,
        brand=brand,
        min_price=min_price,
        max_price=max_price,
        in_stock=in_stock,
        featured=featured,
        on_sale=on_sale,
        min_discount=min_discount,
        sort_by=sort_by,
    )


@router.get(
    "/slug/{slug}",
    response_model=ProductResponse,
)
def get_product_by_slug(
    slug: str,
    db: Session = Depends(get_db),
):
    return ProductService(db).get_product_by_slug(slug)


@router.get(
    "/{product_id}",
    response_model=ProductResponse,
)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
):
    return ProductService(db).get_product(product_id)


@router.post(
    "",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_product(
    data: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    del current_user

    return ProductService(db).create_product(data)


@router.put(
    "/{product_id}",
    response_model=ProductResponse,
)
def update_product(
    product_id: int,
    data: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    del current_user

    return ProductService(db).update_product(
        product_id,
        data,
    )


@router.delete(
    "/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    del current_user

    ProductService(db).delete_product(product_id)

    return None
