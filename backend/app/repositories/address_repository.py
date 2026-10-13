from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.address import Address


class AddressRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_for_user(self, user_id: int) -> list[Address]:
        statement = (
            select(Address)
            .where(Address.user_id == user_id)
            .order_by(Address.is_default.desc(), Address.created_at.desc(), Address.id.desc())
        )
        return list(self.db.scalars(statement).all())

    def get_for_user(self, address_id: int, user_id: int) -> Address | None:
        statement = select(Address).where(
            Address.id == address_id,
            Address.user_id == user_id,
        )
        return self.db.scalar(statement)

    def get_first_for_user(self, user_id: int) -> Address | None:
        statement = (
            select(Address)
            .where(Address.user_id == user_id)
            .order_by(Address.created_at.asc(), Address.id.asc())
            .limit(1)
        )
        return self.db.scalar(statement)

    def get_default_for_user(self, user_id: int) -> Address | None:
        statement = select(Address).where(
            Address.user_id == user_id,
            Address.is_default.is_(True),
        )
        return self.db.scalar(statement)

    def create(self, address: Address) -> Address:
        self.db.add(address)
        self.db.commit()
        self.db.refresh(address)
        return address

    def update(self, address: Address) -> Address:
        self.db.add(address)
        self.db.commit()
        self.db.refresh(address)
        return address

    def delete(self, address: Address) -> None:
        self.db.delete(address)
        self.db.commit()
