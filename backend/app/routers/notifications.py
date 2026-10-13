from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    status,
)

from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.notification import NotificationListResponse
from app.services.notification_service import NotificationService

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"],
)


# ============================================================
# GET NOTIFICATIONS
# ============================================================


@router.get(
    "",
    response_model=NotificationListResponse,
)
def get_notifications(
    limit: int = Query(
        default=20,
        ge=1,
        le=50,
    ),
    db: Session = Depends(
        get_db,
    ),
    current_user: User = Depends(
        get_current_user,
    ),
):

    return NotificationService(
        db,
    ).list_notifications(
        current_user.id,
        limit=limit,
    )


# ============================================================
# MARK ALL AS READ
# ============================================================


@router.patch(
    "/read-all",
)
def mark_all_notifications_read(
    db: Session = Depends(
        get_db,
    ),
    current_user: User = Depends(
        get_current_user,
    ),
):

    count = NotificationService(
        db,
    ).mark_all_read(
        current_user.id,
    )

    return {
        "success": True,
        "marked_read": count,
    }


# ============================================================
# MARK ONE AS READ
# ============================================================


@router.patch(
    "/{notification_id}/read",
)
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(
        get_db,
    ),
    current_user: User = Depends(
        get_current_user,
    ),
):

    notification = NotificationService(
        db,
    ).mark_read(
        notification_id,
        current_user.id,
    )

    if notification is None:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found.",
        )

    return {
        "success": True,
        "notification": NotificationService._serialize(
            notification,
        ),
    }
