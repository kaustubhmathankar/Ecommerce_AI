from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.category import Category


class CategoryRepository:

    def __init__(self, db: Session):
        self.db = db

    def get_by_id(
        self,
        category_id: int,
    ) -> Category | None:
        statement = select(Category).where(
            Category.id == category_id,
            Category.is_active.is_(True),
        )

        return self.db.scalar(statement)

    def get_by_slug(
        self,
        slug: str,
    ) -> Category | None:
        statement = select(Category).where(Category.slug == slug)

        return self.db.scalar(statement)

    def get_by_name(self, name: str) -> Category | None:
        return self.db.scalar(select(Category).where(Category.name == name))

    def list_categories(self) -> list[Category]:
        statement = (
            select(Category)
            .where(Category.is_active.is_(True))
            .order_by(Category.name.asc())
        )

        return list(self.db.scalars(statement).all())

    def create(
        self,
        category: Category,
    ) -> Category:
        self.db.add(category)
        self.db.commit()
        self.db.refresh(category)

        return category

    def update(
        self,
        category: Category,
    ) -> Category:
        self.db.add(category)
        self.db.commit()
        self.db.refresh(category)

        return category

    def delete(self, category: Category) -> None:
        category.is_active = False
        self.db.add(category)
        self.db.commit()
