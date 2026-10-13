from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, user_id: int) -> User | None:
        statement = select(User).where(User.id == user_id, User.is_active.is_(True))
        return self.db.scalar(statement)

    def get_by_email(self, email: str) -> User | None:
        statement = select(User).where(User.email == email.lower(), User.is_active.is_(True))
        return self.db.scalar(statement)

    def get_by_reset_token(self, token: str) -> User | None:
        statement = select(User).where(User.reset_token == token, User.is_active.is_(True))
        return self.db.scalar(statement)

    def list_users(self) -> list[User]:
        statement = select(User).where(User.is_active.is_(True)).order_by(User.created_at.desc())
        return list(self.db.scalars(statement).all())

    def create(self, user: User) -> User:
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def update(self, user: User) -> User:
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user
