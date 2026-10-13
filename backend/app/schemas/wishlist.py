from pydantic import BaseModel, Field


class WishlistToggleRequest(BaseModel):
    product_id: int = Field(gt=0)


class WishlistSyncRequest(BaseModel):
    product_ids: list[int] = Field(
        default_factory=list,
        max_length=1000,
    )


class WishlistResponse(BaseModel):
    product_ids: list[int]
    wishlist_count: int
