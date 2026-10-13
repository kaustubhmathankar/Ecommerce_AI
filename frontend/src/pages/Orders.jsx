
import { useState } from 'react'
import {
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query'
import {
    ArrowRight,
    Clock3,
    PackageCheck,
    RotateCcw,
    X,
} from 'lucide-react'
import {
    Link,
    useLocation,
} from 'react-router-dom'

import {
    cancelOrder,
    getOrderHistory,
    requestReturn,
} from '../api/orders'
import { getApiErrorMessage } from '../api/client'
import CustomerRefundStatus from '../components/orders/CustomerRefundStatus'
import Footer from '../components/layout/Footer'
import Navbar from '../components/layout/Navbar'

const formatPrice = (amount) =>
    new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
    }).format(Number(amount) || 0)

const statusLabel = (status) =>
    String(status ?? '')
        .replaceAll('_', ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase())

const dateTime = (value) => {
    if (!value) return '—'

    const date = new Date(value)

    return Number.isNaN(date.getTime())
        ? '—'
        : date.toLocaleString('en-IN')
}

const statusClasses = (status) => {
    if (
        status === 'cancelled' ||
        status === 'return_rejected'
    ) {
        return 'bg-red-50 text-red-700'
    }

    if (
        [
            'return_requested',
            'return_approved',
            'returned',
        ].includes(status)
    ) {
        return 'bg-amber-50 text-amber-800'
    }

    if (status === 'refunded') {
        return 'bg-emerald-100 text-emerald-800'
    }

    return 'bg-emerald-50 text-emerald-700'
}

const paymentMethodLabel = (method) => {
    if (!method) return 'Not specified'

    const labels = {
        cash_on_delivery: 'Cash on delivery',
        online_payment: 'Online payment',
        cashfree: 'Cashfree',
        card: 'Card',
        upi: 'UPI',
    }

    return labels[method] || statusLabel(method)
}

function Orders() {
    const location = useLocation()
    const queryClient = useQueryClient()

    const [action, setAction] = useState(null)
    const [reason, setReason] = useState('')

    const ordersQuery = useQuery({
        queryKey: ['orders'],
        queryFn: getOrderHistory,
    })

    const orders = Array.isArray(ordersQuery.data)
        ? ordersQuery.data
        : []

    function closeAction() {
        setAction(null)
        setReason('')

        cancelMutation.reset()
        returnMutation.reset()
    }

    const cancelMutation = useMutation({
        mutationFn: ({ orderId, reason: cancellationReason }) =>
            cancelOrder(
                orderId,
                cancellationReason,
            ),

        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: ['orders'],
            })

            await queryClient.invalidateQueries({
                queryKey: ['admin-orders'],
            })

            closeAction()
        },
    })

    const returnMutation = useMutation({
        mutationFn: ({ orderId, reason: returnReason }) =>
            requestReturn(
                orderId,
                returnReason,
            ),

        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: ['orders'],
            })

            await queryClient.invalidateQueries({
                queryKey: ['admin-orders'],
            })

            closeAction()
        },
    })

    const submitAction = (event) => {
        event.preventDefault()

        const cleanReason = reason.trim()

        if (!action || cleanReason.length < 5) {
            return
        }

        if (action.type === 'cancel') {
            cancelMutation.mutate({
                orderId: action.order.id,
                reason: cleanReason,
            })
        } else {
            returnMutation.mutate({
                orderId: action.order.id,
                reason: cleanReason,
            })
        }
    }

    const mutationError = cancelMutation.isError
        ? cancelMutation.error
        : returnMutation.isError
            ? returnMutation.error
            : null

    const mutationPending =
        cancelMutation.isPending ||
        returnMutation.isPending

    return (
        <div className="min-h-screen bg-white text-neutral-900">
            <Navbar />

            <main className="mx-auto min-h-[65vh] max-w-[1200px] px-5 py-10 sm:px-8 sm:py-14">
                {location.state?.placedOrderId && (
                    <div
                        role="status"
                        className="mb-7 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
                    >
                        Order #{location.state.placedOrderId} was placed
                        successfully. Thanks for shopping with us!
                    </div>
                )}

                <header className="mb-9 border-b border-neutral-200 pb-6">
                    <p className="text-[10px] font-semibold tracking-[0.2em] text-[#18705c]">
                        YOUR SHOPSPHERE ACCOUNT
                    </p>

                    <h1 className="mt-2 text-4xl font-medium tracking-[-0.05em]">
                        Order history
                    </h1>

                    <p className="mt-2 text-sm leading-6 text-neutral-500">
                        Track your purchases, cancel eligible orders,
                        request returns, and follow refund progress.
                    </p>
                </header>

                {ordersQuery.isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((item) => (
                            <div
                                key={item}
                                className="h-40 animate-pulse rounded-2xl bg-neutral-100"
                            />
                        ))}
                    </div>
                ) : ordersQuery.isError ? (
                    <div
                        role="alert"
                        className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"
                    >
                        {getApiErrorMessage(
                            ordersQuery.error,
                            'Unable to load your orders. Please refresh this page to try again.',
                        )}
                    </div>
                ) : orders.length > 0 ? (
                    <div className="space-y-4">
                        {orders.map((order) => {
                            const canCancel = [
                                'placed',
                                'processing',
                            ].includes(order.status)

                            const canReturn =
                                order.status === 'delivered'

                            const items = Array.isArray(order.items)
                                ? order.items
                                : []

                            return (
                                <article
                                    key={order.id}
                                    className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-7"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-100 pb-5">
                                        <div>
                                            <p className="text-xs font-semibold">
                                                Order #{order.id}
                                            </p>

                                            <p className="mt-1 text-xs text-neutral-500">
                                                {dateTime(order.created_at)}
                                            </p>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-3">
                                            <span
                                                className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${statusClasses(
                                                    order.status,
                                                )}`}
                                            >
                                                {statusLabel(order.status)}
                                            </span>

                                            <span className="text-sm font-semibold">
                                                {formatPrice(
                                                    order.total_amount,
                                                )}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mt-5 grid gap-6 md:grid-cols-[1fr_0.8fr]">
                                        <section>
                                            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                                                Items
                                            </h2>

                                            {items.length > 0 ? (
                                                <ul className="mt-3 space-y-3">
                                                    {items.map(
                                                        (item, index) => (
                                                            <li
                                                                key={
                                                                    item.id ??
                                                                    `${order.id}-${index}`
                                                                }
                                                                className="flex justify-between gap-4 text-sm"
                                                            >
                                                                <span className="min-w-0">
                                                                    {item.product_name}

                                                                    <span className="text-neutral-400">
                                                                        {' '}×{' '}
                                                                        {
                                                                            item.quantity
                                                                        }
                                                                    </span>
                                                                </span>

                                                                <span className="shrink-0 text-neutral-600">
                                                                    {formatPrice(
                                                                        item.line_total,
                                                                    )}
                                                                </span>
                                                            </li>
                                                        ),
                                                    )}
                                                </ul>
                                            ) : (
                                                <p className="mt-3 text-sm text-neutral-500">
                                                    No order items available.
                                                </p>
                                            )}

                                            <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3 text-xs">
                                                <span className="text-neutral-500">
                                                    Shipping
                                                </span>

                                                <span className="font-medium text-neutral-700">
                                                    {Number(
                                                        order.shipping_amount,
                                                    ) > 0
                                                        ? formatPrice(
                                                            order.shipping_amount,
                                                        )
                                                        : 'Free'}
                                                </span>
                                            </div>
                                        </section>

                                        <section>
                                            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                                                Delivery
                                            </h2>

                                            <p className="mt-3 text-sm leading-6 text-neutral-600">
                                                {order.full_name && (
                                                    <>
                                                        {order.full_name}
                                                        <br />
                                                    </>
                                                )}

                                                {order.address_line && (
                                                    <>
                                                        {order.address_line}
                                                        <br />
                                                    </>
                                                )}

                                                {[
                                                    order.city,
                                                    order.state,
                                                    order.postal_code,
                                                ]
                                                    .filter(Boolean)
                                                    .join(', ')}

                                                {order.phone && (
                                                    <>
                                                        <br />
                                                        {order.phone}
                                                    </>
                                                )}
                                            </p>

                                            <div className="mt-3 rounded-xl bg-neutral-50 p-3">
                                                <p className="text-xs text-neutral-500">
                                                    Payment method
                                                </p>

                                                <p className="mt-1 text-sm font-medium text-neutral-800">
                                                    {paymentMethodLabel(
                                                        order.payment_method,
                                                    )}
                                                </p>
                                            </div>
                                        </section>
                                    </div>

                                    {(order.cancellation_reason ||
                                        order.return_reason) && (
                                            <div className="mt-5 rounded-xl border border-neutral-100 bg-neutral-50 p-4 text-sm text-neutral-600">
                                                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                                                    {order.cancellation_reason
                                                        ? 'Cancellation reason'
                                                        : 'Return reason'}
                                                </p>

                                                <p className="mt-2 leading-6">
                                                    {order.cancellation_reason ||
                                                        order.return_reason}
                                                </p>

                                                {order.return_requested_at && (
                                                    <p className="mt-2 text-xs text-neutral-400">
                                                        Return requested:{' '}
                                                        {dateTime(
                                                            order.return_requested_at,
                                                        )}
                                                    </p>
                                                )}

                                                {order.return_processed_at && (
                                                    <p className="mt-1 text-xs text-neutral-400">
                                                        Last return update:{' '}
                                                        {dateTime(
                                                            order.return_processed_at,
                                                        )}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                    <CustomerRefundStatus order={order} />

                                    {(canCancel || canReturn) && (
                                        <div className="mt-5 flex flex-wrap gap-3 border-t border-neutral-100 pt-5">
                                            {canCancel && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        cancelMutation.reset()
                                                        returnMutation.reset()

                                                        setAction({
                                                            type: 'cancel',
                                                            order,
                                                        })

                                                        setReason('')
                                                    }}
                                                    className="rounded-full border border-red-200 px-4 py-2.5 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                                                >
                                                    Cancel order
                                                </button>
                                            )}

                                            {canReturn && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        cancelMutation.reset()
                                                        returnMutation.reset()

                                                        setAction({
                                                            type: 'return',
                                                            order,
                                                        })

                                                        setReason('')
                                                    }}
                                                    className="inline-flex items-center gap-2 rounded-full border border-amber-200 px-4 py-2.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-50"
                                                >
                                                    <RotateCcw size={14} />
                                                    Request return
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </article>
                            )
                        })}
                    </div>
                ) : (
                    <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
                        <PackageCheck
                            size={36}
                            className="text-[#18705c]"
                            strokeWidth={1.5}
                        />

                        <h2 className="mt-5 text-2xl font-medium">
                            Your next favorite is out there.
                        </h2>

                        <p className="mt-2 max-w-sm text-sm leading-6 text-neutral-500">
                            Your purchases will appear here when you
                            place an order.
                        </p>

                        <Link
                            to="/shop"
                            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#153d35] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#0f302a]"
                        >
                            Start shopping
                            <ArrowRight size={15} />
                        </Link>
                    </div>
                )}
            </main>

            <Footer />

            {action && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-5"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            closeAction()
                        }
                    }}
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="order-action-title"
                        className="w-full max-w-md rounded-[24px] bg-white p-6 shadow-2xl sm:p-7"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-[10px] font-semibold tracking-[0.2em] text-[#18705c]">
                                    ORDER #{action.order.id}
                                </p>

                                <h2
                                    id="order-action-title"
                                    className="mt-2 text-2xl font-medium tracking-tight"
                                >
                                    {action.type === 'cancel'
                                        ? 'Cancel this order?'
                                        : 'Request a return?'}
                                </h2>
                            </div>

                            <button
                                type="button"
                                onClick={closeAction}
                                className="rounded-full p-2 text-neutral-500 transition hover:bg-neutral-100"
                                aria-label="Close dialog"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <p className="mt-3 text-sm leading-6 text-neutral-500">
                            {action.type === 'cancel'
                                ? 'Cancellation is available while the order is placed or processing. Stock will be restored by the server.'
                                : 'Returns are available for eligible delivered orders within the return window. The admin will review your request.'}
                        </p>

                        <form
                            onSubmit={submitAction}
                            className="mt-6"
                        >
                            <label className="block">
                                <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-neutral-500">
                                    Reason
                                </span>

                                <textarea
                                    value={reason}
                                    onChange={(event) =>
                                        setReason(event.target.value)
                                    }
                                    minLength={5}
                                    maxLength={500}
                                    rows={4}
                                    required
                                    placeholder={
                                        action.type === 'cancel'
                                            ? 'Why do you want to cancel this order?'
                                            : 'Why do you want to return this order?'
                                    }
                                    className="w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none transition focus:border-[#18705c]"
                                />
                            </label>

                            {mutationError && (
                                <p
                                    role="alert"
                                    className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                                >
                                    {getApiErrorMessage(
                                        mutationError,
                                        'The request could not be completed.',
                                    )}
                                </p>
                            )}

                            <div className="mt-5 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={closeAction}
                                    disabled={mutationPending}
                                    className="rounded-full border border-neutral-200 px-5 py-2.5 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
                                >
                                    Keep order
                                </button>

                                <button
                                    type="submit"
                                    disabled={
                                        mutationPending ||
                                        reason.trim().length < 5
                                    }
                                    className={`rounded-full px-5 py-2.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${action.type === 'cancel'
                                            ? 'bg-red-700 hover:bg-red-800'
                                            : 'bg-[#153d35] hover:bg-[#0f302a]'
                                        }`}
                                >
                                    {mutationPending
                                        ? 'Submitting…'
                                        : action.type === 'cancel'
                                            ? 'Confirm cancellation'
                                            : 'Submit return'}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            )}
        </div>
    )
}

export default Orders
