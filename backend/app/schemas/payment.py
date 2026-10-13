from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.order import OrderItemCreate


class CashfreePaymentCreate(BaseModel):
    items: list[OrderItemCreate] = Field(
        min_length=1,
        max_length=100,
    )

    address_id: int | None = Field(
        default=None,
        gt=0,
    )

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


class CashfreePaymentCreateResponse(BaseModel):
    payment_attempt_id: int
    provider: str
    provider_order_id: str
    payment_session_id: str
    amount: Decimal
    currency: str

    model_config = ConfigDict(
        from_attributes=True,
    )
