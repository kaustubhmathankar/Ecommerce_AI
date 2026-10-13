from decimal import Decimal

from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session

from app.models.product import Product


class ProductRepository:

    def __init__(self, db: Session):
        self.db = db

    def get_by_id(
        self,
        product_id: int,
    ) -> Product | None:
        statement = select(Product).where(
            Product.id == product_id,
            Product.is_active.is_(True),
        )

        return self.db.scalar(statement)

    def get_by_slug(
        self,
        slug: str,
    ) -> Product | None:
        statement = select(Product).where(
            Product.slug == slug,
            Product.is_active.is_(True),
        )

        return self.db.scalar(statement)

    def get_by_slug_any(
        self,
        slug: str,
    ) -> Product | None:
        return self.db.scalar(
            select(Product).where(
                Product.slug == slug,
            )
        )

    def get_by_sku(
        self,
        sku: str,
    ) -> Product | None:
        statement = select(Product).where(
            Product.sku == sku,
        )

        return self.db.scalar(statement)

    def _apply_filters(
        self,
        statement: Select,
        *,
        search: str | None = None,
        category_id: int | None = None,
        brand: str | None = None,
        min_price: Decimal | None = None,
        max_price: Decimal | None = None,
        in_stock: bool | None = None,
        featured: bool | None = None,
        on_sale: bool | None = None,
        min_discount: Decimal | None = None,
    ) -> Select:

        if search and search.strip():
            search_term = f"%{search.strip()}%"

            statement = statement.where(
                or_(
                    Product.name.ilike(search_term),
                    Product.brand.ilike(search_term),
                    Product.short_description.ilike(search_term),
                )
            )
            search_term = f"%{search.strip()}%"

            statement = statement.where(
                or_(
                    Product.name.ilike(search_term),
                    Product.brand.ilike(search_term),
                    Product.sku.ilike(search_term),
                    Product.slug.ilike(search_term),
                    Product.short_description.ilike(search_term),
                    Product.description.ilike(search_term),
                )
            )

        if category_id is not None:
            statement = statement.where(
                Product.category_id == category_id,
            )

        if brand and brand.strip():
            statement = statement.where(
                func.lower(Product.brand) == brand.strip().lower(),
            )

        if min_price is not None:
            statement = statement.where(
                Product.price >= min_price,
            )

        if max_price is not None:
            statement = statement.where(
                Product.price <= max_price,
            )

        if in_stock is True:
            statement = statement.where(
                Product.stock_quantity > 0,
            )

        if in_stock is False:
            statement = statement.where(
                Product.stock_quantity <= 0,
            )

        if featured is True:
            statement = statement.where(
                Product.is_featured.is_(True),
            )

        if featured is False:
            statement = statement.where(
                Product.is_featured.is_(False),
            )

        sale_condition = Product.compare_at_price.is_not(None) & (
            Product.compare_at_price > Product.price
        )

        if on_sale is True:
            statement = statement.where(
                sale_condition,
            )

        if on_sale is False:
            statement = statement.where(
                ~sale_condition,
            )

        if min_discount is not None:
            discount_percentage = (
                (Product.compare_at_price - Product.price)
                / Product.compare_at_price
                * 100
            )

            statement = statement.where(
                sale_condition,
                discount_percentage >= min_discount,
            )

        return statement

    @staticmethod
    def _discount_expression():
        return (
            (Product.compare_at_price - Product.price) / Product.compare_at_price * 100
        )

    def list_products(
        self,
        *,
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
        skip: int = 0,
        limit: int = 20,
    ) -> list[Product]:

        statement: Select[tuple[Product]] = select(Product).where(
            Product.is_active.is_(True),
        )

        statement = self._apply_filters(
            statement,
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

        discount_expression = self._discount_expression()

        if sort_by == "price_asc":
            statement = statement.order_by(
                Product.price.asc(),
                Product.id.desc(),
            )

        elif sort_by == "price_desc":
            statement = statement.order_by(
                Product.price.desc(),
                Product.id.desc(),
            )

        elif sort_by == "name_asc":
            statement = statement.order_by(
                func.lower(Product.name).asc(),
                Product.id.desc(),
            )

        elif sort_by == "featured":
            statement = statement.order_by(
                Product.is_featured.desc(),
                Product.created_at.desc(),
                Product.id.desc(),
            )

        elif sort_by == "discount":
            statement = statement.order_by(
                discount_expression.desc().nulls_last(),
                Product.created_at.desc(),
                Product.id.desc(),
            )

        elif sort_by == "oldest":
            statement = statement.order_by(
                Product.created_at.asc(),
                Product.id.asc(),
            )

        else:
            statement = statement.order_by(
                Product.created_at.desc(),
                Product.id.desc(),
            )

        statement = statement.offset(skip).limit(limit)

        return list(self.db.scalars(statement).all())

    def count_products(
        self,
        *,
        search: str | None = None,
        category_id: int | None = None,
        brand: str | None = None,
        min_price: Decimal | None = None,
        max_price: Decimal | None = None,
        in_stock: bool | None = None,
        featured: bool | None = None,
        on_sale: bool | None = None,
        min_discount: Decimal | None = None,
    ) -> int:

        statement = select(func.count(Product.id)).where(
            Product.is_active.is_(True),
        )

        statement = self._apply_filters(
            statement,
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

        return self.db.scalar(statement) or 0

    def list_brands(self) -> list[str]:
        statement = (
            select(Product.brand)
            .where(
                Product.is_active.is_(True),
                Product.brand.is_not(None),
                func.trim(Product.brand) != "",
            )
            .distinct()
            .order_by(Product.brand.asc())
        )

        return [brand for brand in self.db.scalars(statement).all() if brand]

    def create(
        self,
        product: Product,
    ) -> Product:

        self.db.add(product)
        self.db.commit()
        self.db.refresh(product)

        return product

    def update(
        self,
        product: Product,
    ) -> Product:

        self.db.add(product)
        self.db.commit()
        self.db.refresh(product)

        return product

    def delete(
        self,
        product: Product,
    ) -> None:

        product.is_active = False

        self.db.add(product)
        self.db.commit()
