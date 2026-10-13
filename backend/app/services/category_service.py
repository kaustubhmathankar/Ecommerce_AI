from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.product import Product
from app.repositories.category_repository import CategoryRepository
from app.schemas.category import CategoryCreate


class CategoryService:

    def __init__(self, db: Session):
        self.repository = CategoryRepository(db)

    def get_categories(self) -> list[Category]:
        return self.repository.list_categories()

    def create_category(
        self,
        data: CategoryCreate,
    ) -> Category:

        existing = self.repository.get_by_slug(data.slug) or self.repository.get_by_name(data.name)

        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A category with this name or slug already exists.",
            )

        category = Category(**data.model_dump())

        return self.repository.create(category)

    def update_category(
        self,
        category_id: int,
        data: CategoryCreate,
    ) -> Category:
        category = self.repository.get_by_id(category_id)

        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found.",
            )

        slug_conflict = self.repository.get_by_slug(data.slug)
        name_conflict = self.repository.get_by_name(data.name)
        if (slug_conflict and slug_conflict.id != category_id) or (
            name_conflict and name_conflict.id != category_id
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A category with this name or slug already exists.",
            )

        for field, value in data.model_dump().items():
            setattr(category, field, value)

        return self.repository.update(category)

    def delete_category(self, category_id: int) -> None:
        category = self.repository.get_by_id(category_id)

        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found.",
            )

        has_products = self.repository.db.scalar(
            select(Product.id).where(Product.category_id == category_id).limit(1)
        )
        if has_products is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Move or remove this category's products before deleting it.",
            )

        self.repository.delete(category)
