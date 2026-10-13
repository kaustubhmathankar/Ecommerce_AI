import math
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.product import Product
from app.repositories.category_repository import CategoryRepository
from app.repositories.product_repository import ProductRepository
from app.schemas.pagination import PaginationMeta
from app.schemas.product import (
    ProductCreate,
    ProductFilterOptionsResponse,
    ProductListResponse,
)


class ProductService:

    def __init__(self, db: Session):
        self.product_repository = ProductRepository(db)
        self.category_repository = CategoryRepository(db)

    def get_product(
        self,
        product_id: int,
    ) -> Product:

        product = self.product_repository.get_by_id(product_id)

        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found.",
            )

        return product

    def get_product_by_slug(
        self,
        slug: str,
    ) -> Product:

        product = self.product_repository.get_by_slug(slug)

        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found.",
            )

        return product

    def get_products(
        self,
        *,
        page: int = 1,
        limit: int = 20,
        search: str | None = None,
        category_id: int | None = None,
        brand: str | None = None,
        min_price: Decimal | None = None,
        max_price: Decimal | None = None,
        in_stock: bool | None = None,
        featured: bool | None = None,
        on_sale: bool | None = None,
        min_discount: Decimal | None = None,
        sort_by: str = "newest",
    ) -> ProductListResponse:

        self._validate_price_range(
            min_price,
            max_price,
        )

        skip = (page - 1) * limit

        products = self.product_repository.list_products(
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
            skip=skip,
            limit=limit,
        )

        total = self.product_repository.count_products(
            search=search,
            category_id=category_id,
            brand=brand,
            min_price=min_price,
            max_price=max_price,
            in_stock=in_stock,
            featured=featured,
            on_sale=on_sale,
            min_discount=min_discount,
        )

        total_pages = math.ceil(total / limit) if total > 0 else 0

        return ProductListResponse(
            items=products,
            pagination=PaginationMeta(
                page=page,
                limit=limit,
                total=total,
                total_pages=total_pages,
                has_next=page < total_pages,
                has_previous=page > 1,
            ),
        )

    def get_filter_options(
        self,
    ) -> ProductFilterOptionsResponse:

        return ProductFilterOptionsResponse(
            brands=self.product_repository.list_brands()
        )

    @staticmethod
    def _validate_price_range(
        min_price: Decimal | None,
        max_price: Decimal | None,
    ) -> None:

        if min_price is not None and max_price is not None and min_price > max_price:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=("Minimum price cannot be greater " "than maximum price."),
            )

    def create_product(
        self,
        data: ProductCreate,
    ) -> Product:

        existing_slug = self.product_repository.get_by_slug_any(data.slug)

        if existing_slug:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=("A product with this slug " "already exists."),
            )

        existing_sku = self.product_repository.get_by_sku(data.sku)

        if existing_sku:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=("A product with this SKU " "already exists."),
            )

        category = self.category_repository.get_by_id(data.category_id)

        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found.",
            )

        product = Product(**data.model_dump())

        return self.product_repository.create(product)

    def update_product(
        self,
        product_id: int,
        data: ProductCreate,
    ) -> Product:

        product = self.product_repository.get_by_id(product_id)

        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found.",
            )

        slug_conflict = self.product_repository.get_by_slug_any(data.slug)

        if slug_conflict and slug_conflict.id != product_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=("A product with this slug " "already exists."),
            )

        sku_conflict = self.product_repository.get_by_sku(data.sku)

        if sku_conflict and sku_conflict.id != product_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=("A product with this SKU " "already exists."),
            )

        category = self.category_repository.get_by_id(data.category_id)

        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found.",
            )

        for field, value in data.model_dump().items():
            setattr(product, field, value)

        return self.product_repository.update(product)

    def delete_product(
        self,
        product_id: int,
    ) -> None:

        product = self.product_repository.get_by_id(product_id)

        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found.",
            )

        self.product_repository.delete(product)
