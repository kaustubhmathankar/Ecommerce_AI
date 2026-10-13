
import { useQuery } from '@tanstack/react-query'
import {
    Banknote,
    CheckCircle2,
    Clock3,
    ShieldAlert,
} from 'lucide-react'

import { getOrderRefunds } from '../../api/refunds'
import { getApiErrorMessage } from '../../api/client'

const formatPrice = (amount) =>
    new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
    }).format(Number(amount) || 0)

const statusLabel = (status) =>
    String(status ?? '').replaceAll('_', ' ')

function CustomerRefundStatus({ order }) {
    const shouldShow = [
        'return_approved',
        'returned',
        'refunded',
    ].includes(order?.status)

    const shouldFetch = [
        'returned',
        'refunded',
    ].includes(order?.status)

    const refundsQuery = useQuery({
        queryKey: [
            'customer-order-refunds',
            order?.id,
        ],
        queryFn: () => getOrderRefunds(order.id),
        enabled: Boolean(order?.id && shouldFetch),
        refetchOnWindowFocus: false,
    })

    if (!shouldShow) {
        return null
    }

    const refunds = Array.isArray(refundsQuery.data)
        ? refundsQuery.data
        : []

    return (
        <section className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
            <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-emerald-700">
                    <Banknote size={17} />
                </span>

                <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-neutral-900">
                        Return & refund updates
                    </h3>

                    {order.status === 'return_approved' && (
                        <p className="mt-1 text-sm leading-6 text-neutral-600">
                            Your return was approved. Once the returned
                            item is received and processed, refund
                            details will appear here.
                        </p>
                    )}

                    {refundsQuery.isLoading && (
                        <p className="mt-2 text-sm text-neutral-600">
                            Loading refund details…
                        </p>
                    )}

                    {refundsQuery.isError && (
                        <p
                            role="alert"
                            className="mt-2 text-sm text-red-700"
                        >
                            {getApiErrorMessage(
                                refundsQuery.error,
                                'Unable to load refund details right now.',
                            )}
                        </p>
                    )}

                    {!refundsQuery.isLoading &&
                        !refundsQuery.isError &&
                        shouldFetch &&
                        refunds.length === 0 && (
                            <p className="mt-2 text-sm leading-6 text-neutral-600">
                                {order.status === 'refunded'
                                    ? 'Your order is marked refunded, but transaction details are not available in the refund history. Please contact support to confirm the transfer.'
                                    : 'Your returned item has been recorded. The refund has not been initiated yet.'}
                            </p>
                        )}

                    {refunds.map((refund) => {
                        const completed =
                            refund.status === 'completed'

                        const failed =
                            refund.status === 'failed'

                        const Icon = completed
                            ? CheckCircle2
                            : failed
                                ? ShieldAlert
                                : Clock3

                        const badgeClass = completed
                            ? 'bg-emerald-50 text-emerald-700'
                            : failed
                                ? 'bg-red-50 text-red-700'
                                : 'bg-amber-50 text-amber-700'

                        return (
                            <div
                                key={refund.id}
                                className="mt-3 rounded-lg border border-emerald-100 bg-white p-3"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="text-sm font-semibold text-neutral-900">
                                        Refund · {formatPrice(refund.amount)}
                                    </span>

                                    <span
                                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${badgeClass}`}
                                    >
                                        <Icon size={12} />
                                        {statusLabel(refund.status)}
                                    </span>
                                </div>

                                <p className="mt-2 text-xs leading-5 text-neutral-500">
                                    Method: {statusLabel(refund.refund_method)}
                                    {refund.created_at
                                        ? ` · Updated ${new Date(
                                            refund.updated_at ||
                                            refund.created_at,
                                        ).toLocaleString('en-IN')}`
                                        : ''}
                                </p>

                                {refund.manual_transaction_reference && (
                                    <p className="mt-2 break-all text-xs text-neutral-600">
                                        Transfer reference:{' '}
                                        <span className="font-mono">
                                            {refund.manual_transaction_reference}
                                        </span>
                                    </p>
                                )}

                                {refund.provider_refund_id && (
                                    <p className="mt-2 break-all text-xs text-neutral-600">
                                        Refund reference:{' '}
                                        <span className="font-mono">
                                            {refund.provider_refund_id}
                                        </span>
                                    </p>
                                )}

                                {completed && (
                                    <p className="mt-2 text-xs leading-5 text-emerald-700">
                                        ShopSphere has recorded this refund
                                        as completed. Bank or provider posting
                                        times may vary.
                                    </p>
                                )}

                                {failed && (
                                    <p className="mt-2 text-xs leading-5 text-red-700">
                                        This refund needs review. Please
                                        contact ShopSphere support for an update.
                                    </p>
                                )}

                                {!completed && !failed && (
                                    <p className="mt-2 text-xs leading-5 text-amber-700">
                                        Your refund is being processed.
                                        It is not yet marked completed.
                                    </p>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}

export default CustomerRefundStatus
