from datetime import datetime
from decimal import Decimal
import re
from typing import Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)


class OrderItemCreate(BaseModel):
    product_id: int = Field(gt=0)
    quantity: int = Field(gt=0, le=10000)


class OrderCreate(BaseModel):
    items: list[OrderItemCreate] = Field(
        min_length=1,
        max_length=100,
    )

    # New saved-address option
    address_id: int | None = Field(
        default=None,
        gt=0,
    )

    # Existing manual delivery fields remain supported
    full_name: str | None = Field(
        default=None,
        min_length=2,
        max_length=120,
    )

    phone: str | None = Field(
        default=None,
        min_length=7,
        max_length=30,
    )

    address_line: str | None = Field(
        default=None,
        min_length=5,
        max_length=255,
    )

    city: str | None = Field(
        default=None,
        min_length=2,
        max_length=100,
    )

    state: str | None = Field(
        default=None,
        min_length=2,
        max_length=100,
    )

    postal_code: str | None = Field(
        default=None,
        min_length=3,
        max_length=20,
    )

    payment_method: str = Field(
        default="cash_on_delivery",
        pattern="^(cash_on_delivery|online_payment)$",
    )

    @field_validator(
        "full_name",
        "address_line",
        "city",
        "state",
        "postal_code",
    )
    @classmethod
    def trim_required_text(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return value

        value = value.strip()

        if not value:
            raise ValueError("This field cannot be blank.")

        return value

    @field_validator("phone")
    @classmethod
    def validate_phone(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return value

        value = value.strip()

        if not re.fullmatch(
            r"\+?[0-9][0-9 ()-]{5,28}[0-9]",
            value,
        ):
            raise ValueError("Enter a valid phone number.")

        if sum(character.isdigit() for character in value) < 7:
            raise ValueError("Enter a valid phone number.")

        return value

    @field_validator("postal_code")
    @classmethod
    def validate_postal_code(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return value

        value = value.strip()

        if not re.fullmatch(
            r"[A-Za-z0-9][A-Za-z0-9 -]{1,18}[A-Za-z0-9]",
            value,
        ):
            raise ValueError("Enter a valid postal code.")

        return value

    @model_validator(mode="after")
    def validate_delivery_source(self):
        product_ids = [item.product_id for item in self.items]

        if len(product_ids) != len(set(product_ids)):
            raise ValueError("Each product may only appear once in an order.")

        # If no saved address is supplied, the old
        # complete manual delivery information is required.
        if self.address_id is None:
            delivery_fields = (
                self.full_name,
                self.phone,
                self.address_line,
                self.city,
                self.state,
                self.postal_code,
            )

            if any(value is None for value in delivery_fields):
                raise ValueError(
                    "Provide a saved address or complete delivery details."
                )

        return self


class OrderCancellationCreate(BaseModel):
    reason: str = Field(
        min_length=5,
        max_length=500,
    )

    @field_validator("reason")
    @classmethod
    def trim_reason(cls, value: str) -> str:
        value = value.strip()

        if not value:
            raise ValueError("Cancellation reason cannot be blank.")

        return value


class ReturnRequestCreate(BaseModel):
    reason: str = Field(
        min_length=5,
        max_length=500,
    )

    @field_validator("reason")
    @classmethod
    def trim_reason(cls, value: str) -> str:
        value = value.strip()

        if not value:
            raise ValueError("Return reason cannot be blank.")

        return value


class OrderStatusUpdate(BaseModel):
    status: Literal[
        "placed",
        "processing",
        "shipped",
        "delivered",
        "return_approved",
        "return_rejected",
        "returned",
        "refunded",
    ]


class OrderItemResponse(BaseModel):
    id: int
    product_id: int
    product_name: str
    unit_price: Decimal
    quantity: int
    line_total: Decimal

    model_config = ConfigDict(
        from_attributes=True,
    )


class OrderResponse(BaseModel):
    id: int
    user_id: int

    full_name: str
    phone: str
    address_line: str
    city: str
    state: str
    postal_code: str

    payment_method: str

    shipping_amount: Decimal
    total_amount: Decimal

    status: str

    cancellation_reason: str | None
    cancelled_at: datetime | None

    return_reason: str | None
    return_requested_at: datetime | None
    return_processed_at: datetime | None

    stock_restored: bool

    created_at: datetime

    items: list[OrderItemResponse]

    model_config = ConfigDict(
        from_attributes=True,
    )
