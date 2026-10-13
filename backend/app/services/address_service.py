from fastapi import HTTPException, status
from sqlalchemy import update
from sqlalchemy.orm import Session

from app.models.address import Address
from app.repositories.address_repository import AddressRepository
from app.schemas.address import AddressCreate, AddressUpdate


class AddressService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = AddressRepository(db)

    def list_addresses(self, user_id: int) -> list[Address]:
        return self.repository.list_for_user(user_id)

    def create_address(self, data: AddressCreate, user_id: int) -> Address:
        existing = self.repository.list_for_user(user_id)
        should_be_default = data.is_default or not existing

        if should_be_default:
            self._clear_default(user_id)

        address = Address(
            user_id=user_id,
            label=data.label.strip(),
            full_name=data.full_name.strip(),
            phone=data.phone.strip(),
            address_line=data.address_line.strip(),
            city=data.city.strip(),
            state=data.state.strip(),
            postal_code=data.postal_code.strip(),
            country=data.country.strip(),
            is_default=should_be_default,
        )
        return self.repository.create(address)

    def update_address(self, address_id: int, data: AddressUpdate, user_id: int) -> Address:
        address = self.repository.get_for_user(address_id, user_id)
        if address is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Address not found.",
            )

        updates = data.model_dump(exclude_unset=True)
        if not updates:
            return address

        requested_default = updates.get("is_default")
        if requested_default is True:
            self._clear_default(user_id, exclude_address_id=address.id)
        elif requested_default is False and address.is_default:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Keep at least one saved address as your default address.",
            )

        for field in (
            "label",
            "full_name",
            "phone",
            "address_line",
            "city",
            "state",
            "postal_code",
            "country",
            "is_default",
        ):
            if field in updates:
                value = updates[field]
                if isinstance(value, str):
                    value = value.strip()
                setattr(address, field, value)

        return self.repository.update(address)

    def set_default(self, address_id: int, user_id: int) -> Address:
        address = self.repository.get_for_user(address_id, user_id)
        if address is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Address not found.",
            )

        self._clear_default(user_id, exclude_address_id=address.id)
        address.is_default = True
        return self.repository.update(address)

    def delete_address(self, address_id: int, user_id: int) -> None:
        address = self.repository.get_for_user(address_id, user_id)
        if address is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Address not found.",
            )

        was_default = address.is_default
        self.db.delete(address)
        self.db.flush()

        if was_default:
            replacement = self.repository.get_first_for_user(user_id)
            if replacement is not None:
                replacement.is_default = True

        self.db.commit()

    def _clear_default(self, user_id: int, exclude_address_id: int | None = None) -> None:
        statement = update(Address).where(
            Address.user_id == user_id,
            Address.is_default.is_(True),
        )
        if exclude_address_id is not None:
            statement = statement.where(Address.id != exclude_address_id)
        self.db.execute(statement.values(is_default=False))
