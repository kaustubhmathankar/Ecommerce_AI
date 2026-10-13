from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NotificationResponse(BaseModel):
    id: int
    user_id: int
    order_id: int | None
    type: str
    title: str
    message: str
    is_read: bool
    read_at: datetime | None
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )


class NotificationListResponse(BaseModel):
    items: list[NotificationResponse]
    unread_count: int
