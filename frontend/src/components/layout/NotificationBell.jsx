import {
    Bell,
    Check,
    CircleCheck,
    CircleX,
    CreditCard,
    Package,
    RotateCcw,
    Truck,
} from 'lucide-react'

import { useState } from 'react'

import { useNavigate } from 'react-router-dom'

import {
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query'

import { useAuth } from '../../context/AuthContext'

import {
    getNotifications,
    markAllNotificationsRead,
    markNotificationRead,
} from '../../api/notifications'


const NOTIFICATION_LIMIT = 20


const ICONS = {
    order_placed:
        Package,

    order_cancelled:
        CircleX,

    order_processing:
        Package,

    order_shipped:
        Truck,

    order_delivered:
        CircleCheck,

    return_requested:
        RotateCcw,

    return_approved:
        CircleCheck,

    return_rejected:
        CircleX,

    returned:
        RotateCcw,

    refunded:
        CreditCard,

    payment_success:
        CreditCard,

    payment_failed:
        CircleX,
}


// ============================================================
// FORMAT NOTIFICATION TIME
// ============================================================

function formatNotificationTime(
    value,
) {

    if (!value) {
        return ''
    }

    const createdAt =
        new Date(value)

    if (
        Number.isNaN(
            createdAt.getTime(),
        )
    ) {
        return ''
    }

    const diffSeconds =
        Math.max(
            0,
            Math.floor(
                (
                    Date.now() -
                    createdAt.getTime()
                ) / 1000,
            ),
        )


    if (diffSeconds < 60) {
        return 'Just now'
    }


    const minutes =
        Math.floor(
            diffSeconds / 60,
        )


    if (minutes < 60) {
        return `${minutes}m ago`
    }


    const hours =
        Math.floor(
            minutes / 60,
        )


    if (hours < 24) {
        return `${hours}h ago`
    }


    const days =
        Math.floor(
            hours / 24,
        )


    if (days < 7) {
        return `${days}d ago`
    }


    return createdAt.toLocaleDateString(
        'en-IN',
        {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        },
    )
}


// ============================================================
// NOTIFICATION BELL
// ============================================================

function NotificationBell({
    admin = false,
}) {

    const {
        isAuthenticated,
        user,
    } = useAuth()


    const navigate =
        useNavigate()


    const queryClient =
        useQueryClient()


    const [
        open,
        setOpen,
    ] = useState(false)


    const queryKey = [
        'notifications',
        user?.id,
    ]


    // ========================================================
    // FETCH
    // ========================================================

    const notificationsQuery =
        useQuery({
            queryKey,

            queryFn: () =>
                getNotifications(
                    NOTIFICATION_LIMIT,
                ),

            enabled:
                isAuthenticated &&
                Boolean(
                    user?.id,
                ),

            refetchInterval:
                10000,

            refetchIntervalInBackground:
                false,

            refetchOnWindowFocus:
                true,

            refetchOnReconnect:
                true,

            staleTime:
                3000,
        })


    // ========================================================
    // MARK ONE READ
    // ========================================================

    const markReadMutation =
        useMutation({
            mutationFn:
                markNotificationRead,

            onSuccess:
                () => {

                    queryClient.invalidateQueries(
                        {
                            queryKey,
                        },
                    )

                },
        })


    // ========================================================
    // MARK ALL READ
    // ========================================================

    const markAllReadMutation =
        useMutation({
            mutationFn:
                markAllNotificationsRead,

            onSuccess:
                () => {

                    queryClient.invalidateQueries(
                        {
                            queryKey,
                        },
                    )

                },
        })


    const items =
        notificationsQuery
            .data
            ?.items ??
        []


    const unreadCount =
        Number(
            notificationsQuery
                .data
                ?.unread_count ??
            0,
        )


    const destination =
        admin
            ? '/admin/orders'
            : '/orders'


    const emptyMessage =
        admin
            ? 'New orders, cancellations and return requests will appear here.'
            : 'Order updates, payments and returns will appear here.'


    // ========================================================
    // CLICK NOTIFICATION
    // ========================================================

    const handleNotificationClick =
        (
            notification,
        ) => {

            if (
                !notification.is_read
            ) {

                markReadMutation.mutate(
                    notification.id,
                )

            }

            setOpen(false)

            navigate(
                destination,
            )
        }


    if (!isAuthenticated) {
        return null
    }


    return (
        <div className="relative">

            {/* ==================================================
                BELL BUTTON
            ================================================== */}

            <button
                type="button"
                onClick={() =>
                    setOpen(
                        (value) =>
                            !value,
                    )
                }
                className={`relative flex h-10 w-10 items-center justify-center rounded-full border transition ${open
                        ? 'border-[#153d35] bg-[#153d35] text-white'
                        : 'border-neutral-200 bg-white text-neutral-700 hover:border-[#b7c8bd] hover:bg-[#f3f6f2] hover:text-[#153d35]'
                    }`}
                aria-label={`Notifications${unreadCount
                        ? `, ${unreadCount} unread`
                        : ''
                    }`}
                aria-expanded={
                    open
                }
                title="Notifications"
            >

                <Bell
                    size={18}
                    strokeWidth={1.8}
                />


                {unreadCount > 0 && (

                    <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white shadow-sm">

                        {
                            unreadCount > 9
                                ? '9+'
                                : unreadCount
                        }

                    </span>

                )}

            </button>


            {/* ==================================================
                DROPDOWN
            ================================================== */}

            {open && (

                <>

                    {/* BACKDROP */}

                    <button
                        type="button"
                        aria-label="Close notifications"
                        onClick={() =>
                            setOpen(false)
                        }
                        className="fixed inset-0 z-40 cursor-default"
                    />


                    {/* PANEL */}

                    <div className="absolute right-0 top-full z-50 mt-3 w-[min(390px,calc(100vw-24px))] overflow-hidden rounded-[22px] border border-neutral-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.16)]">

                        {/* HEADER */}

                        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-4">

                            <div>

                                <p className="text-sm font-semibold text-neutral-900">
                                    Notifications
                                </p>

                                <p className="mt-1 text-[10px] text-neutral-400">

                                    {unreadCount > 0
                                        ? `${unreadCount} unread`
                                        : 'All caught up'}

                                </p>

                            </div>


                            {unreadCount > 0 && (

                                <button
                                    type="button"
                                    disabled={
                                        markAllReadMutation.isPending
                                    }
                                    onClick={() =>
                                        markAllReadMutation.mutate()
                                    }
                                    className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-2 text-[10px] font-semibold text-neutral-600 transition hover:border-[#18705c] hover:text-[#18705c] disabled:opacity-50"
                                >

                                    <Check
                                        size={12}
                                    />

                                    Mark all read

                                </button>

                            )}

                        </div>


                        {/* NOTIFICATION LIST */}

                        <div className="max-h-[430px] overflow-y-auto">

                            {/* LOADING */}

                            {notificationsQuery.isLoading && (

                                <div className="space-y-2 p-3">

                                    {[1, 2, 3].map(
                                        (
                                            item,
                                        ) => (

                                            <div
                                                key={
                                                    item
                                                }
                                                className="h-20 animate-pulse rounded-xl bg-neutral-100"
                                            />

                                        ),
                                    )}

                                </div>

                            )}


                            {/* ERROR */}

                            {notificationsQuery.isError && (

                                <div className="p-7 text-center">

                                    <p className="text-sm font-medium text-neutral-700">
                                        Notifications unavailable
                                    </p>

                                    <p className="mt-1 text-xs leading-5 text-neutral-400">
                                        Your notifications will retry automatically.
                                    </p>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            notificationsQuery.refetch()
                                        }
                                        className="mt-4 rounded-full bg-[#153d35] px-4 py-2 text-[10px] font-semibold text-white"
                                    >
                                        Retry
                                    </button>

                                </div>

                            )}


                            {/* EMPTY */}

                            {!notificationsQuery.isLoading &&
                                !notificationsQuery.isError &&
                                items.length === 0 && (

                                    <div className="p-8 text-center">

                                        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#eef4f0] text-[#18705c]">

                                            <Bell
                                                size={18}
                                            />

                                        </div>


                                        <p className="mt-3 text-sm font-medium text-neutral-800">
                                            No notifications
                                        </p>


                                        <p className="mt-1 text-xs leading-5 text-neutral-400">
                                            {
                                                emptyMessage
                                            }
                                        </p>

                                    </div>

                                )}


                            {/* ITEMS */}

                            {!notificationsQuery.isLoading &&
                                !notificationsQuery.isError &&
                                items.length > 0 && (

                                    <div className="divide-y divide-neutral-100">

                                        {items.map(
                                            (
                                                notification,
                                            ) => {

                                                const Icon =
                                                    ICONS[
                                                    notification.event_type
                                                    ] ??
                                                    Bell


                                                return (

                                                    <button
                                                        key={
                                                            notification.id
                                                        }
                                                        type="button"
                                                        onClick={() =>
                                                            handleNotificationClick(
                                                                notification,
                                                            )
                                                        }
                                                        className={`w-full px-4 py-4 text-left transition hover:bg-neutral-50 ${notification.is_read
                                                                ? 'bg-white'
                                                                : 'bg-[#f6faf7]'
                                                            }`}
                                                    >

                                                        <div className="flex gap-3">

                                                            {/* ICON */}

                                                            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eaf3ef] text-[#18705c]">

                                                                <Icon
                                                                    size={16}
                                                                />

                                                            </span>


                                                            {/* CONTENT */}

                                                            <div className="min-w-0 flex-1">

                                                                <div className="flex items-start justify-between gap-3">

                                                                    <p className="text-xs font-semibold text-neutral-800">

                                                                        {
                                                                            notification.title
                                                                        }

                                                                    </p>


                                                                    {!notification.is_read && (

                                                                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-600" />

                                                                    )}

                                                                </div>


                                                                <p className="mt-1 text-xs leading-5 text-neutral-500">

                                                                    {
                                                                        notification.message
                                                                    }

                                                                </p>


                                                                <p className="mt-2 text-[9px] text-neutral-400">

                                                                    {
                                                                        formatNotificationTime(
                                                                            notification.created_at,
                                                                        )
                                                                    }

                                                                </p>

                                                            </div>

                                                        </div>

                                                    </button>

                                                )

                                            },
                                        )}

                                    </div>

                                )}

                        </div>


                        {/* FOOTER */}

                        {items.length > 0 && (

                            <div className="border-t border-neutral-100 px-4 py-3">

                                <button
                                    type="button"
                                    onClick={() => {

                                        setOpen(false)

                                        navigate(
                                            destination,
                                        )

                                    }}
                                    className="w-full rounded-xl bg-[#f7f7f4] py-2.5 text-xs font-semibold text-[#153d35] transition hover:bg-[#eef0eb]"
                                >

                                    {
                                        admin
                                            ? 'View order management'
                                            : 'View my orders'
                                    }

                                </button>

                            </div>

                        )}

                    </div>

                </>

            )}

        </div>
    )
}


export default NotificationBell