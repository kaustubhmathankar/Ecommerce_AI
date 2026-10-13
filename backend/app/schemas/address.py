import re
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class AddressCreate(BaseModel):
    label: str = Field(default="Home", min_length=2, max_length=40)
    full_name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=7, max_length=30)
    address_line: str = Field(min_length=5, max_length=255)
    city: str = Field(min_length=2, max_length=100)
    state: str = Field(min_length=2, max_length=100)
    postal_code: str = Field(min_length=3, max_length=20)
    country: str = Field(default="India", min_length=2, max_length=100)
    is_default: bool = False

    @field_validator("label", "full_name", "address_line", "city", "state", "country")
    @classmethod
    def trim_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be blank.")
        return value

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        value = value.strip()
        if not re.fullmatch(r"\+?[0-9][0-9 ()-]{5,28}[0-9]", value):
            raise ValueError("Enter a valid phone number.")
        if sum(character.isdigit() for character in value) < 7:
            raise ValueError("Enter a valid phone number.")
        return value

    @field_validator("postal_code")
    @classmethod
    def validate_postal_code(cls, value: str) -> str:
        value = value.strip()
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9 -]{1,18}[A-Za-z0-9]", value):
            raise ValueError("Enter a valid postal code.")
        return value


class AddressUpdate(BaseModel):
    label: str | None = Field(default=None, min_length=2, max_length=40)
    full_name: str | None = Field(default=None, min_length=2, max_length=120)
    phone: str | None = Field(default=None, min_length=7, max_length=30)
    address_line: str | None = Field(default=None, min_length=5, max_length=255)
    city: str | None = Field(default=None, min_length=2, max_length=100)
    state: str | None = Field(default=None, min_length=2, max_length=100)
    postal_code: str | None = Field(default=None, min_length=3, max_length=20)
    country: str | None = Field(default=None, min_length=2, max_length=100)
    is_default: bool | None = None

    @field_validator("label", "full_name", "address_line", "city", "state", "country")
    @classmethod
    def trim_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be blank.")
        return value

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not re.fullmatch(r"\+?[0-9][0-9 ()-]{5,28}[0-9]", value):
            raise ValueError("Enter a valid phone number.")
        if sum(character.isdigit() for character in value) < 7:
            raise ValueError("Enter a valid phone number.")
        return value

    @field_validator("postal_code")
    @classmethod
    def validate_postal_code(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9 -]{1,18}[A-Za-z0-9]", value):
            raise ValueError("Enter a valid postal code.")
        return value


class AddressResponse(BaseModel):
    id: int
    user_id: int
    label: str
    full_name: str
    phone: str
    address_line: str
    city: str
    state: str
    postal_code: str
    country: str
    is_default: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
