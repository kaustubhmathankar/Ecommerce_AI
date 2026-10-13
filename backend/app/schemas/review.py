from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class ReviewCreate(BaseModel):
    rating: int = Field(
        ge=1,
        le=5,
    )

    title: str = Field(
        min_length=3,
        max_length=150,
    )

    comment: str = Field(
        min_length=10,
        max_length=2000,
    )

    @field_validator("title", "comment")
    @classmethod
    def trim_text(cls, value: str) -> str:
        value = value.strip()

        if not value:
            raise ValueError("This field cannot be blank.")

        return value


class ReviewUpdate(BaseModel):
    rating: int = Field(
        ge=1,
        le=5,
    )

    title: str = Field(
        min_length=3,
        max_length=150,
    )

    comment: str = Field(
        min_length=10,
        max_length=2000,
    )

    @field_validator("title", "comment")
    @classmethod
    def trim_text(cls, value: str) -> str:
        value = value.strip()

        if not value:
            raise ValueError("This field cannot be blank.")

        return value


class ReviewResponse(BaseModel):
    id: int
    product_id: int
    user_id: int
    order_id: int
    order_item_id: int | None

    customer_name: str

    rating: int
    title: str
    comment: str

    is_verified_purchase: bool

    created_at: datetime
    updated_at: datetime


class ReviewListResponse(BaseModel):
    items: list[ReviewResponse]

    total: int

    average_rating: float

    rating_distribution: dict[str, int]


class AdminReviewResponse(ReviewResponse):
    customer_email: str
    product_name: str


class AdminReviewListResponse(BaseModel):
    items: list[AdminReviewResponse]

    total: int
