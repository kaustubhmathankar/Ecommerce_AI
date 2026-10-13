
import { Fragment, useMemo, useState } from 'react'
import {
    ChevronDown,
    ChevronUp,
    MapPin,
    Package,
    Search,
    Truck,
    User,
} from 'lucide-react'
import {
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query'

import {
    getAllOrdersAdmin,
    updateOrderStatusAdmin,
} from '../api/orders'
import { getApiErrorMessage } from '../api/client'
import RefundManagementPanel from '../components/admin/RefundManagementPanel'

const statusOptions = [
    'placed',
    'processing',
    'shipped',
    'delivered',
    'return_requested',
    'return_approved',
    'return_rejected',
    'returned',
    'refunded',
    'cancelled',
]

const statusLabel = (status) =>
    String(status ?? '')
        .replaceAll('_', ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase())

const currency = (amount) =>
    new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
    }).format(Number(amount) || 0)

const dateTime = (value) => {
    if (!value) return '—'

    const date = new Date(value)

    return Number.isNaN(date.getTime())
        ? '—'
        : date.toLocaleString('en-IN')
}

const dateOnly = (value) => {
    if (!value) return '—'

    const date = new Date(value)

    return Number.isNaN(date.getTime())
        ? '—'
        : date.toLocaleDateString('en-IN')
}

const statusClasses = (status) => {
    if (
        status === 'cancelled' ||
        status === 'return_rejected'
    ) {
        return 'bg-red-50 text-red-700'
    }

    if (
        status === 'return_requested' ||
        status === 'return_approved' ||
        status === 'returned'
    ) {
        return 'bg-amber-50 text-amber-800'
    }

    if (status === 'refunded') {
        return 'bg-emerald-100 text-emerald-800'
    }

    return 'bg-neutral-100 text-neutral-700'
}

function getNextStatuses(currentStatus) {
    // Refund completion is deliberately not a regular order-status
    // transition. RefundManagementPanel owns that workflow.
    const transitions = {
        placed: ['processing'],
        processing: ['shipped'],
        shipped: ['delivered'],
        delivered: ['return_requested'],
        return_requested: [
            'return_approved',
            'return_rejected',
        ],
        return_approved: ['returned'],
        returned: [],
        refunded: [],
        cancelled: [],
        return_rejected: [],
    }

    return transitions[currentStatus] ?? []
}

function AdminOrders() {
    const queryClient = useQueryClient()

    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [expandedOrderId, setExpandedOrderId] = useState(null)

    const ordersQuery = useQuery({
        queryKey: ['admin-orders'],
        queryFn: getAllOrdersAdmin,
    })

    const statusMutation = useMutation({
        mutationFn: ({ orderId, status }) =>
            updateOrderStatusAdmin(orderId, status),

        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: ['admin-orders'],
                }),
                queryClient.invalidateQueries({
                    queryKey: ['admin-overview'],
                }),
                queryClient.invalidateQueries({
                    queryKey: ['orders'],
                }),
            ])
        },
    })

    const orders = useMemo(
        () =>
            Array.isArray(ordersQuery.data)
                ? ordersQuery.data
                : [],
        [ordersQuery.data],
    )

    const filteredOrders = useMemo(() => {
        const term = search.trim().toLowerCase()

        return orders.filter((order) => {
            const orderId = String(order?.id ?? '')
            const fullName = String(
                order?.full_name ?? '',
            ).toLowerCase()
            const phone = String(
                order?.phone ?? '',
            ).toLowerCase()

            const matchesSearch =
                !term ||
                orderId.includes(term) ||
                fullName.includes(term) ||
                phone.includes(term)

            const matchesStatus =
                statusFilter === 'all' ||
                order?.status === statusFilter

            return matchesSearch && matchesStatus
        })
    }, [orders, search, statusFilter])

    const toggleExpanded = (orderId) => {
        setExpandedOrderId((current) =>
            current === orderId ? null : orderId,
        )
    }

    const handleStatusChange = (order, nextStatus) => {
        if (
            !nextStatus ||
            nextStatus === order.status
        ) {
            return
        }

        if (nextStatus === 'returned') {
            const confirmed = window.confirm(
                `Confirm that the returned item for Order #${order.id} has been received and inspected?`,
            )

            if (!confirmed) return
        }

        statusMutation.mutate({
            orderId: order.id,
            status: nextStatus,
        })
    }

    return (
        <div className="space-y-6">
            <header className="mb-2">
                <p className="text-[10px] font-semibold tracking-[0.22em] text-[#18705c]">
                    FULFILLMENT
                </p>

                <h1 className="mt-2 text-3xl font-medium tracking-[-0.05em] sm:text-4xl">
                    Orders
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
                    Review customer orders, update fulfillment
                    status, handle returns, and manage refunds.
                </p>
            </header>

            {statusMutation.isError && (
                <div
                    role="alert"
                    className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                >
                    {getApiErrorMessage(
                        statusMutation.error,
                        'The order status could not be updated.',
                    )}
                </div>
            )}

            <section className="rounded-3xl border border-neutral-200 bg-white p-4 sm:p-6">
                <div className="mb-6 flex flex-col gap-3 sm:flex-row">
                    <div className="relative min-w-0 flex-1">
                        <Search
                            size={15}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                        />

                        <input
                            type="search"
                            value={search}
                            onChange={(event) =>
                                setSearch(event.target.value)
                            }
                            placeholder="Search order, customer or phone..."
                            className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-[#18705c]"
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(event) =>
                            setStatusFilter(event.target.value)
                        }
                        className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-[#18705c]"
                        aria-label="Filter orders by status"
                    >
                        <option value="all">All statuses</option>

                        {statusOptions.map((status) => (
                            <option
                                key={status}
                                value={status}
                            >
                                {statusLabel(status)}
                            </option>
                        ))}
                    </select>
                </div>

                {ordersQuery.isLoading && (
                    <div className="space-y-3">
                        {Array.from({ length: 5 }).map(
                            (_, index) => (
                                <div
                                    key={index}
                                    className="h-20 animate-pulse rounded-2xl bg-neutral-100"
                                />
                            ),
                        )}
                    </div>
                )}

                {!ordersQuery.isLoading &&
                    ordersQuery.isError && (
                        <div
                            role="alert"
                            className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"
                        >
                            {getApiErrorMessage(
                                ordersQuery.error,
                                'Unable to load orders. Please refresh and try again.',
                            )}
                        </div>
                    )}

                {!ordersQuery.isLoading &&
                    !ordersQuery.isError &&
                    filteredOrders.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-neutral-200 p-10 text-center">
                            <Package
                                size={30}
                                className="mx-auto text-neutral-400"
                            />

                            <p className="mt-4 text-sm font-medium text-neutral-700">
                                No orders found
                            </p>

                            <p className="mt-2 text-xs text-neutral-500">
                                Try changing your search or status filter.
                            </p>
                        </div>
                    )}

                {!ordersQuery.isLoading &&
                    !ordersQuery.isError &&
                    filteredOrders.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1000px] text-left text-sm">
                                <thead>
                                    <tr className="border-b border-neutral-200 text-xs text-neutral-500">
                                        <th className="pb-3 pr-5 font-medium">
                                            Order
                                        </th>
                                        <th className="pb-3 pr-5 font-medium">
                                            Customer
                                        </th>
                                        <th className="pb-3 pr-5 font-medium">
                                            Items
                                        </th>
                                        <th className="pb-3 pr-5 font-medium">
                                            Total
                                        </th>
                                        <th className="pb-3 pr-5 font-medium">
                                            Status
                                        </th>
                                        <th className="pb-3 text-right font-medium">
                                            Details
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {filteredOrders.map((order) => {
                                        const expanded =
                                            expandedOrderId === order.id

                                        const items = Array.isArray(
                                            order?.items,
                                        )
                                            ? order.items
                                            : []

                                        const totalItems = items.reduce(
                                            (total, item) =>
                                                total +
                                                (Number(item?.quantity) || 0),
                                            0,
                                        )

                                        return (
                                            <Fragment key={order.id}>
                                                <tr
                                                    className={`border-b border-neutral-100 ${expanded
                                                            ? 'bg-neutral-50/70'
                                                            : ''
                                                        }`}
                                                >
                                                    <td className="py-4 pr-5 align-top">
                                                        <div className="flex items-start gap-3">
                                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f0f3ef] text-[#18705c]">
                                                                <Package size={16} />
                                                            </div>

                                                            <div>
                                                                <p className="font-semibold">
                                                                    #{order.id}
                                                                </p>

                                                                <p className="mt-1 text-[10px] text-neutral-400">
                                                                    {dateOnly(
                                                                        order.created_at,
                                                                    )}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="py-4 pr-5 align-top">
                                                        <p className="font-medium">
                                                            {order.full_name ||
                                                                'Unknown customer'}
                                                        </p>

                                                        <p className="mt-1 text-xs text-neutral-400">
                                                            {order.phone ||
                                                                'No phone'}
                                                        </p>
                                                    </td>

                                                    <td className="py-4 pr-5 align-top">
                                                        <p className="text-xs text-neutral-600">
                                                            {totalItems}{' '}
                                                            {totalItems === 1
                                                                ? 'item'
                                                                : 'items'}
                                                        </p>

                                                        <p className="mt-1 max-w-[240px] truncate text-[10px] text-neutral-400">
                                                            {items
                                                                .map(
                                                                    (item) =>
                                                                        item?.product_name ||
                                                                        'Unknown product',
                                                                )
                                                                .join(', ')}
                                                        </p>
                                                    </td>

                                                    <td className="py-4 pr-5 align-top">
                                                        <p className="font-semibold">
                                                            {currency(
                                                                order.total_amount,
                                                            )}
                                                        </p>

                                                        <p className="mt-1 text-[10px] text-neutral-400">
                                                            {order.payment_method ===
                                                                'cash_on_delivery'
                                                                ? 'Cash on delivery'
                                                                : order.payment_method ||
                                                                '—'}
                                                        </p>
                                                    </td>

                                                    <td className="py-4 pr-5 align-top">
                                                        <div className="space-y-2">
                                                            <span
                                                                className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusClasses(
                                                                    order.status,
                                                                )}`}
                                                            >
                                                                {statusLabel(
                                                                    order.status,
                                                                )}
                                                            </span>

                                                            <select
                                                                value={
                                                                    order.status
                                                                }
                                                                disabled={
                                                                    statusMutation.isPending ||
                                                                    getNextStatuses(
                                                                        order.status,
                                                                    ).length ===
                                                                    0
                                                                }
                                                                onChange={(
                                                                    event,
                                                                ) =>
                                                                    handleStatusChange(
                                                                        order,
                                                                        event.target
                                                                            .value,
                                                                    )
                                                                }
                                                                className="block max-w-[180px] rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-2 text-xs outline-none focus:border-[#18705c] disabled:cursor-not-allowed disabled:opacity-60"
                                                                aria-label={`Update status for order ${order.id}`}
                                                            >
                                                                <option
                                                                    value={
                                                                        order.status
                                                                    }
                                                                >
                                                                    Current: {statusLabel(
                                                                        order.status,
                                                                    )}
                                                                </option>

                                                                {getNextStatuses(
                                                                    order.status,
                                                                ).map(
                                                                    (
                                                                        nextStatus,
                                                                    ) => (
                                                                        <option
                                                                            key={
                                                                                nextStatus
                                                                            }
                                                                            value={
                                                                                nextStatus
                                                                            }
                                                                        >
                                                                            {statusLabel(
                                                                                nextStatus,
                                                                            )}
                                                                        </option>
                                                                    ),
                                                                )}
                                                            </select>
                                                        </div>
                                                    </td>

                                                    <td className="py-4 text-right align-top">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                toggleExpanded(
                                                                    order.id,
                                                                )
                                                            }
                                                            className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition ${expanded
                                                                    ? 'border-[#18705c] bg-[#f0f3ef] text-[#18705c]'
                                                                    : 'border-neutral-200 text-neutral-500 hover:border-[#18705c] hover:text-[#18705c]'
                                                                }`}
                                                            aria-label={
                                                                expanded
                                                                    ? `Hide order ${order.id} details`
                                                                    : `Show order ${order.id} details`
                                                            }
                                                            aria-expanded={
                                                                expanded
                                                            }
                                                        >
                                                            {expanded ? (
                                                                <ChevronUp
                                                                    size={15}
                                                                />
                                                            ) : (
                                                                <ChevronDown
                                                                    size={15}
                                                                />
                                                            )}
                                                        </button>
                                                    </td>
                                                </tr>

                                                {expanded && (
                                                    <tr className="border-b border-neutral-200 bg-[#fafaf8]">
                                                        <td
                                                            colSpan={6}
                                                            className="p-0"
                                                        >
                                                            <div className="p-4 sm:p-6">
                                                                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-200 pb-5">
                                                                    <div>
                                                                        <p className="text-[10px] font-semibold tracking-[0.2em] text-[#18705c]">
                                                                            ORDER DETAILS
                                                                        </p>

                                                                        <h3 className="mt-2 text-xl font-medium tracking-tight">
                                                                            Order #
                                                                            {
                                                                                order.id
                                                                            }
                                                                        </h3>
                                                                    </div>

                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        <span
                                                                            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${statusClasses(
                                                                                order.status,
                                                                            )}`}
                                                                        >
                                                                            {statusLabel(
                                                                                order.status,
                                                                            )}
                                                                        </span>

                                                                        <span className="rounded-full bg-white px-3 py-1.5 text-xs text-neutral-500">
                                                                            {dateTime(
                                                                                order.created_at,
                                                                            )}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                <div className="mt-6 grid gap-4 lg:grid-cols-3">
                                                                    <DetailCard
                                                                        icon={
                                                                            <User
                                                                                size={16}
                                                                            />
                                                                        }
                                                                        title="Customer"
                                                                    >
                                                                        <p className="font-medium text-neutral-800">
                                                                            {order.full_name ||
                                                                                '—'}
                                                                        </p>

                                                                        <p className="mt-1 break-all text-neutral-500">
                                                                            {order.phone ||
                                                                                'No phone provided'}
                                                                        </p>
                                                                    </DetailCard>

                                                                    <DetailCard
                                                                        icon={
                                                                            <MapPin
                                                                                size={16}
                                                                            />
                                                                        }
                                                                        title="Delivery address"
                                                                    >
                                                                        <p className="leading-6 text-neutral-600">
                                                                            {order.address_line ||
                                                                                '—'}
                                                                            <br />

                                                                            {[
                                                                                order.city,
                                                                                order.state,
                                                                                order.postal_code,
                                                                            ]
                                                                                .filter(
                                                                                    Boolean,
                                                                                )
                                                                                .join(
                                                                                    ', ',
                                                                                )}
                                                                        </p>
                                                                    </DetailCard>

                                                                    <DetailCard
                                                                        icon={
                                                                            <Truck
                                                                                size={16}
                                                                            />
                                                                        }
                                                                        title="Payment & shipping"
                                                                    >
                                                                        <p className="font-medium text-neutral-800">
                                                                            {order.payment_method ===
                                                                                'cash_on_delivery'
                                                                                ? 'Cash on delivery'
                                                                                : order.payment_method ||
                                                                                '—'}
                                                                        </p>

                                                                        <p className="mt-1 text-neutral-500">
                                                                            Shipping:{' '}
                                                                            {Number(
                                                                                order.shipping_amount,
                                                                            ) > 0
                                                                                ? currency(
                                                                                    order.shipping_amount,
                                                                                )
                                                                                : 'Free'}
                                                                        </p>
                                                                    </DetailCard>
                                                                </div>

                                                                <div className="mt-6 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
                                                                    <div className="border-b border-neutral-100 px-4 py-4">
                                                                        <h4 className="text-sm font-semibold">
                                                                            Order items
                                                                        </h4>

                                                                        <p className="mt-1 text-xs text-neutral-400">
                                                                            {
                                                                                totalItems
                                                                            }{' '}
                                                                            {totalItems ===
                                                                                1
                                                                                ? 'item'
                                                                                : 'items'}
                                                                        </p>
                                                                    </div>

                                                                    <div className="divide-y divide-neutral-100">
                                                                        {items.length ===
                                                                            0 ? (
                                                                            <div className="p-5 text-sm text-neutral-500">
                                                                                No order items found.
                                                                            </div>
                                                                        ) : (
                                                                            items.map(
                                                                                (
                                                                                    item,
                                                                                    index,
                                                                                ) => (
                                                                                    <div
                                                                                        key={
                                                                                            item.id ??
                                                                                            `${order.id}-${index}`
                                                                                        }
                                                                                        className="flex flex-wrap items-center justify-between gap-4 px-4 py-4"
                                                                                    >
                                                                                        <div className="min-w-0 flex-1">
                                                                                            <p className="font-medium text-neutral-800">
                                                                                                {item.product_name ||
                                                                                                    'Unknown product'}
                                                                                            </p>

                                                                                            <p className="mt-1 text-xs text-neutral-400">
                                                                                                Quantity:{' '}
                                                                                                {
                                                                                                    item.quantity
                                                                                                }
                                                                                                {' · '}
                                                                                                Unit price:{' '}
                                                                                                {currency(
                                                                                                    item.unit_price,
                                                                                                )}
                                                                                            </p>
                                                                                        </div>

                                                                                        <p className="font-semibold text-neutral-800">
                                                                                            {currency(
                                                                                                item.line_total,
                                                                                            )}
                                                                                        </p>
                                                                                    </div>
                                                                                ),
                                                                            )
                                                                        )}
                                                                    </div>

                                                                    <div className="flex items-center justify-between border-t border-neutral-200 bg-[#fafaf8] px-4 py-4">
                                                                        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                                                                            Order total
                                                                        </span>

                                                                        <span className="text-base font-semibold">
                                                                            {currency(
                                                                                order.total_amount,
                                                                            )}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                {order.cancellation_reason && (
                                                                    <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4">
                                                                        <p className="text-xs font-semibold text-red-800">
                                                                            Cancellation reason
                                                                        </p>

                                                                        <p className="mt-2 text-sm leading-6 text-red-700">
                                                                            {
                                                                                order.cancellation_reason
                                                                            }
                                                                        </p>

                                                                        {order.cancelled_at && (
                                                                            <p className="mt-2 text-[10px] text-red-500">
                                                                                Cancelled on{' '}
                                                                                {dateTime(
                                                                                    order.cancelled_at,
                                                                                )}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {order.return_reason && (
                                                                    <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4">
                                                                        <p className="text-xs font-semibold text-amber-800">
                                                                            Return reason
                                                                        </p>

                                                                        <p className="mt-2 text-sm leading-6 text-amber-700">
                                                                            {
                                                                                order.return_reason
                                                                            }
                                                                        </p>

                                                                        {order.return_requested_at && (
                                                                            <p className="mt-2 text-[10px] text-amber-600">
                                                                                Requested on{' '}
                                                                                {dateTime(
                                                                                    order.return_requested_at,
                                                                                )}
                                                                            </p>
                                                                        )}

                                                                        {order.return_processed_at && (
                                                                            <p className="mt-1 text-[10px] text-amber-600">
                                                                                Last processed on{' '}
                                                                                {dateTime(
                                                                                    order.return_processed_at,
                                                                                )}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                <RefundManagementPanel
                                                                    order={order}
                                                                />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
            </section>
        </div>
    )
}

function DetailCard({ icon, title, children }) {
    return (
        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
            <div className="flex items-center gap-2 text-[#18705c]">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f0f3ef]">
                    {icon}
                </span>

                <p className="text-[10px] font-semibold uppercase tracking-[0.15em]">
                    {title}
                </p>
            </div>

            <div className="mt-4 break-words text-sm">
                {children}
            </div>
        </div>
    )
}

export default AdminOrders
