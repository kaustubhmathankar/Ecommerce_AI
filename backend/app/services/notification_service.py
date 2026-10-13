from datetime import datetime, timezone

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.models.user import User


class NotificationService:
    MAX_ITEMS = 50

    def __init__(self, db: Session):
        self.db = db

    # ============================================================
    # LIST NOTIFICATIONS
    # ============================================================

    def list_notifications(
        self,
        user_id: int,
        limit: int = MAX_ITEMS,
    ) -> dict:

        safe_limit = max(
            1,
            min(
                limit,
                self.MAX_ITEMS,
            ),
        )

        notifications = list(
            self.db.scalars(
                select(Notification)
                .where(
                    Notification.user_id == user_id,
                )
                .order_by(
                    Notification.created_at.desc(),
                    Notification.id.desc(),
                )
                .limit(safe_limit)
            ).all()
        )

        return {
            "items": [
                self._serialize(
                    notification,
                )
                for notification in notifications
            ],
            "unread_count": self.unread_count(
                user_id,
            ),
        }

    # ============================================================
    # UNREAD COUNT
    # ============================================================

    def unread_count(
        self,
        user_id: int,
    ) -> int:

        return int(
            self.db.scalar(
                select(
                    func.count(
                        Notification.id,
                    )
                ).where(
                    Notification.user_id == user_id,
                    Notification.is_read.is_(False),
                )
            )
            or 0
        )

    # ============================================================
    # CREATE NOTIFICATION FOR ONE USER
    # ============================================================

    def notify_user(
        self,
        user_id: int,
        *,
        event_type: str,
        title: str,
        message: str,
        order_id: int | None = None,
    ) -> Notification | None:

        user = self.db.scalar(
            select(User).where(
                User.id == user_id,
                User.is_active.is_(True),
            )
        )

        if user is None:
            return None

        notification = Notification(
            user_id=user.id,
            order_id=order_id,
            event_type=event_type,
            title=title,
            message=message,
        )

        self.db.add(notification)

        self.db.commit()

        self.db.refresh(
            notification,
        )

        return notification

    # ============================================================
    # MARK ONE AS READ
    # ============================================================

    def mark_read(
        self,
        notification_id: int,
        user_id: int,
    ) -> Notification | None:

        notification = self.db.scalar(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.user_id == user_id,
            )
        )

        if notification is None:
            return None

        if not notification.is_read:

            notification.is_read = True

            notification.read_at = datetime.now(
                timezone.utc,
            )

            self.db.commit()

            self.db.refresh(
                notification,
            )

        return notification

    # ============================================================
    # MARK ALL AS READ
    # ============================================================

    def mark_all_read(
        self,
        user_id: int,
    ) -> int:

        result = self.db.execute(
            update(Notification)
            .where(
                Notification.user_id == user_id,
                Notification.is_read.is_(False),
            )
            .values(
                is_read=True,
                read_at=datetime.now(
                    timezone.utc,
                ),
            )
        )

        self.db.commit()

        return int(
            result.rowcount or 0,
        )

    # ============================================================
    # CREATE NOTIFICATION FOR ALL ACTIVE ADMINS
    # ============================================================

    def notify_all_admins(
        self,
        *,
        event_type: str,
        title: str,
        message: str,
        order_id: int | None = None,
    ) -> list[Notification]:

        admins = list(
            self.db.scalars(
                select(User).where(
                    User.role == "admin",
                    User.is_active.is_(True),
                )
            ).all()
        )

        notifications = [
            Notification(
                user_id=admin.id,
                order_id=order_id,
                event_type=event_type,
                title=title,
                message=message,
            )
            for admin in admins
        ]

        if not notifications:
            return []

        self.db.add_all(
            notifications,
        )

        self.db.commit()

        for notification in notifications:
            self.db.refresh(
                notification,
            )

        return notifications

    # ============================================================
    # SERIALIZE
    # ============================================================

    @staticmethod
    def _serialize(
        notification: Notification,
    ) -> dict:

        return {
            "id": notification.id,
            "user_id": notification.user_id,
            "order_id": notification.order_id,
            "type": notification.event_type,
            "event_type": notification.event_type,
            "title": notification.title,
            "message": notification.message,
            "is_read": notification.is_read,
            "read_at": notification.read_at,
            "created_at": notification.created_at,
        }
