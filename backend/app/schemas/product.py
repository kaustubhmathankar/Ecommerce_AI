from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.pagination import PaginationMeta


class ProductBase(BaseModel):
    name: str = Field(
        min_length=2,
        max_length=200,
    )

    slug: str = Field(
        min_length=2,
        max_length=220,
    )

    sku: str = Field(
        min_length=2,
        max_length=100,
    )

    description: str | None = None

    short_description: str | None = Field(
        default=None,
        max_length=500,
    )

    price: Decimal = Field(
        gt=0,
        decimal_places=2,
    )

    compare_at_price: Decimal | None = Field(
        default=None,
        gt=0,
        decimal_places=2,
    )

    stock_quantity: int = Field(
        default=0,
        ge=0,
    )

    brand: str | None = Field(
        default=None,
        max_length=100,
    )

    image_url: str | None = Field(
        default=None,
        max_length=500,
    )

    category_id: int = Field(
        gt=0,
    )

    is_featured: bool = False


class ProductCreate(ProductBase):
    pass


class ProductResponse(ProductBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )


class ProductListResponse(BaseModel):
    items: list[ProductResponse]
    pagination: PaginationMeta


class ProductFilterOptionsResponse(BaseModel):
    brands: list[str]
