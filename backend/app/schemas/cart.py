from pydantic import BaseModel, ConfigDict, Field

from app.schemas.product import ProductResponse


class CartItemRequest(BaseModel):
    product_id: int = Field(gt=0)
    quantity: int = Field(gt=0, le=10)


class CartSyncRequest(BaseModel):
    items: list[CartItemRequest] = Field(
        default_factory=list,
        max_length=100,
    )


class CartItemResponse(BaseModel):
    id: int
    product_id: int
    quantity: int
    product: ProductResponse

    model_config = ConfigDict(
        from_attributes=True,
    )


class CartResponse(BaseModel):
    items: list[CartItemResponse]
    cart_count: int
