import apiClient from './client'


// ============================================================
// NORMALIZE ONE NOTIFICATION
// ============================================================

function normalizeNotification(
    notification,
) {

    if (
        !notification ||
        typeof notification !== 'object'
    ) {
        return null
    }

    return {
        ...notification,

        id:
            notification.id,

        user_id:
            notification.user_id ??
            null,

        order_id:
            notification.order_id ??
            null,

        event_type:
            notification.event_type ||
            notification.type ||
            'general',

        title:
            notification.title ||
            'Notification',

        message:
            notification.message ||
            '',

        is_read:
            Boolean(
                notification.is_read ??
                notification.isRead ??
                notification.read ??
                false,
            ),

        read_at:
            notification.read_at ??
            notification.readAt ??
            null,

        created_at:
            notification.created_at ??
            notification.createdAt ??
            null,
    }
}


// ============================================================
// GET NOTIFICATIONS
// ============================================================

export async function getNotifications(
    limit = 20,
) {

    const response =
        await apiClient.get(
            '/notifications',
            {
                params: {
                    limit,
                },
            },
        )

    const payload =
        response?.data ?? {}


    const rawNotifications =
        Array.isArray(payload)
            ? payload
            : Array.isArray(
                payload.items,
            )
                ? payload.items
                : Array.isArray(
                    payload.notifications,
                )
                    ? payload.notifications
                    : Array.isArray(
                        payload.data?.items,
                    )
                        ? payload.data.items
                        : []


    const items =
        rawNotifications
            .map(
                normalizeNotification,
            )
            .filter(
                Boolean,
            )


    const unreadCount =
        Number(
            payload.unread_count ??
            payload.unreadCount ??
            payload.data?.unread_count ??
            items.filter(
                (
                    notification,
                ) =>
                    !notification.is_read,
            ).length,
        )


    return {
        items,
        unread_count:
            unreadCount,
    }
}


// ============================================================
// MARK ONE NOTIFICATION AS READ
// ============================================================

export async function markNotificationRead(
    notificationId,
) {

    const response =
        await apiClient.patch(
            `/notifications/${notificationId}/read`,
        )

    return response.data
}


// ============================================================
// MARK ALL NOTIFICATIONS AS READ
// ============================================================

export async function markAllNotificationsRead() {

    const response =
        await apiClient.patch(
            '/notifications/read-all',
        )

    return response.data
}