
import { useState } from 'react'
import {
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query'
import {
    Banknote,
    RefreshCw,
    RotateCcw,
    ShieldCheck,
} from 'lucide-react'

import {
    completeManualRefund,
    getOrderRefunds,
    initiateRefund,
    refreshRefundStatus,
} from '../../api/refunds'
import { getApiErrorMessage } from '../../api/client'

const formatPrice = (amount) =>
    new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
    }).format(Number(amount) || 0)

const statusLabel = (status) =>
    String(status ?? '').replaceAll('_', ' ')

const statusClass = (status) => {
    if (status === 'completed') {
        return 'bg-emerald-50 text-emerald-700'
    }

    if (status === 'failed') {
        return 'bg-red-50 text-red-700'
    }

    if (status === 'processing') {
        return 'bg-blue-50 text-blue-700'
    }

    return 'bg-amber-50 text-amber-700'
}

function RefundManagementPanel({ order }) {
    const queryClient = useQueryClient()

    const [manualMethod, setManualMethod] =
        useState('manual_upi')

    const [transactionReference, setTransactionReference] =
        useState('')

    const [actionError, setActionError] =
        useState('')

    const canManageRefund = [
        'returned',
        'refunded',
    ].includes(order?.status)

    const isCod =
        order?.payment_method === 'cash_on_delivery'

    const isCashfree =
        order?.payment_method === 'online_payment'

    const refundsQuery = useQuery({
        queryKey: [
            'admin-order-refunds',
            order?.id,
        ],
        queryFn: () => getOrderRefunds(order.id),
        enabled: Boolean(
            order?.id && canManageRefund,
        ),
        refetchOnWindowFocus: false,
    })

    const refreshLists = async () => {
        await Promise.all([
            queryClient.invalidateQueries({
                queryKey: [
                    'admin-order-refunds',
                    order.id,
                ],
            }),
            queryClient.invalidateQueries({
                queryKey: [
                    'customer-order-refunds',
                    order.id,
                ],
            }),
            queryClient.invalidateQueries({
                queryKey: ['admin-orders'],
            }),
            queryClient.invalidateQueries({
                queryKey: ['orders'],
            }),
            queryClient.invalidateQueries({
                queryKey: ['admin-overview'],
            }),
        ])
    }

    const initiateMutation = useMutation({
        mutationFn: () =>
            initiateRefund(order.id, {
                reason:
                    order.return_reason ||
                    'Customer return',
                ...(isCod
                    ? { manual_method: manualMethod }
                    : {}),
            }),

        onSuccess: async () => {
            setActionError('')
            setTransactionReference('')
            await refreshLists()
        },

        onError: (error) => {
            setActionError(
                getApiErrorMessage(
                    error,
                    'Could not initiate the refund.',
                ),
            )
        },
    })

    const refreshMutation = useMutation({
        mutationFn: refreshRefundStatus,

        onSuccess: async () => {
            setActionError('')
            await refreshLists()
        },

        onError: (error) => {
            setActionError(
                getApiErrorMessage(
                    error,
                    'Could not refresh the refund status.',
                ),
            )
        },
    })

    const manualCompleteMutation = useMutation({
        mutationFn: ({
            refundId,
            reference,
        }) =>
            completeManualRefund(
                refundId,
                reference,
            ),

        onSuccess: async () => {
            setActionError('')
            setTransactionReference('')
            await refreshLists()
        },

        onError: (error) => {
            setActionError(
                getApiErrorMessage(
                    error,
                    'Could not record the manual refund.',
                ),
            )
        },
    })

    if (!canManageRefund) {
        return null
    }

    const refunds = Array.isArray(refundsQuery.data)
        ? refundsQuery.data
        : []

    const hasActiveOrCompleted = refunds.some(
        (refund) =>
            [
                'pending',
                'processing',
                'completed',
            ].includes(refund.status),
    )

    const canInitiate =
        order.status === 'returned' &&
        !hasActiveOrCompleted

    const supportedMethod =
        isCod || isCashfree

    return (
        <section className="mt-6 rounded-2xl border border-emerald-200 bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-100 pb-4">
                <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                        <Banknote size={19} />
                    </span>

                    <div>
                        <h4 className="font-semibold text-neutral-900">
                            Refund management
                        </h4>

                        <p className="mt-1 text-xs leading-5 text-neutral-500">
                            Order #{order.id} · Original total{' '}
                            {formatPrice(order.total_amount)}
                        </p>
                    </div>
                </div>

                <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                    {order.status === 'refunded'
                        ? 'Return closed'
                        : 'Item returned'}
                </span>
            </div>

            {refundsQuery.isLoading && (
                <p className="py-4 text-sm text-neutral-500">
                    Loading refund history…
                </p>
            )}

            {refundsQuery.isError && (
                <div
                    role="alert"
                    className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                    {getApiErrorMessage(
                        refundsQuery.error,
                        'Unable to load refund history.',
                    )}
                </div>
            )}

            {!refundsQuery.isLoading &&
                !refundsQuery.isError &&
                refunds.length === 0 && (
                    <p className="mt-4 text-sm leading-6 text-neutral-600">
                        No refund has been recorded for this order yet.
                        {order.status === 'refunded'
                            ? ' This order needs reconciliation because its refund history is empty.'
                            : ' Verify the returned item and payment before initiating a refund.'}
                    </p>
                )}

            {refunds.map((refund) => (
                <div
                    key={refund.id}
                    className="mt-4 rounded-xl border border-neutral-200 p-4"
                >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <p className="text-sm font-semibold text-neutral-900">
                                Refund #{refund.id} ·{' '}
                                {formatPrice(refund.amount)}
                            </p>

                            <p className="mt-1 text-xs capitalize text-neutral-500">
                                {statusLabel(refund.refund_method)}
                                {refund.created_at
                                    ? ` · ${new Date(
                                        refund.created_at,
                                    ).toLocaleString('en-IN')}`
                                    : ''}
                            </p>
                        </div>

                        <span
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${statusClass(
                                refund.status,
                            )}`}
                        >
                            {statusLabel(refund.status)}
                        </span>
                    </div>

                    {refund.reason && (
                        <p className="mt-3 text-sm leading-6 text-neutral-600">
                            Reason: {refund.reason}
                        </p>
                    )}

                    {refund.provider_refund_id && (
                        <p className="mt-2 break-all text-xs text-neutral-500">
                            Provider refund reference:{' '}
                            <span className="font-mono">
                                {refund.provider_refund_id}
                            </span>
                        </p>
                    )}

                    {refund.manual_transaction_reference && (
                        <p className="mt-2 break-all text-xs text-neutral-500">
                            Transfer reference:{' '}
                            <span className="font-mono">
                                {refund.manual_transaction_reference}
                            </span>
                        </p>
                    )}

                    {refund.failure_reason && (
                        <p className="mt-3 rounded-lg border border-red-100 bg-red-50 p-3 text-xs leading-5 text-red-700">
                            {refund.failure_reason}
                        </p>
                    )}

                    {refund.refund_method === 'cashfree' &&
                        ['pending', 'processing'].includes(
                            refund.status,
                        ) && (
                            <button
                                type="button"
                                onClick={() =>
                                    refreshMutation.mutate(
                                        refund.id,
                                    )
                                }
                                disabled={refreshMutation.isPending}
                                className="mt-4 inline-flex items-center gap-2 rounded-full border border-neutral-200 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                            >
                                <RefreshCw
                                    size={13}
                                    className={
                                        refreshMutation.isPending
                                            ? 'animate-spin'
                                            : ''
                                    }
                                />
                                {refreshMutation.isPending
                                    ? 'Checking…'
                                    : 'Refresh Cashfree status'}
                            </button>
                        )}

                    {[
                        'manual_upi',
                        'manual_bank_transfer',
                    ].includes(refund.refund_method) &&
                        ['pending', 'processing'].includes(
                            refund.status,
                        ) && (
                            <form
                                className="mt-4 border-t border-neutral-100 pt-4"
                                onSubmit={(event) => {
                                    event.preventDefault()

                                    if (
                                        transactionReference.trim()
                                            .length < 4
                                    ) {
                                        return
                                    }

                                    manualCompleteMutation.mutate({
                                        refundId: refund.id,
                                        reference:
                                            transactionReference.trim(),
                                    })
                                }}
                            >
                                <label
                                    className="block text-xs font-semibold text-neutral-700"
                                    htmlFor={`refund-reference-${refund.id}`}
                                >
                                    Verified bank / UPI transaction reference
                                </label>

                                <input
                                    id={`refund-reference-${refund.id}`}
                                    value={transactionReference}
                                    onChange={(event) =>
                                        setTransactionReference(
                                            event.target.value,
                                        )
                                    }
                                    minLength={4}
                                    maxLength={200}
                                    required
                                    placeholder="Reference from the completed transfer"
                                    className="mt-2 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm outline-none focus:border-[#18705c]"
                                />

                                <p className="mt-2 text-xs leading-5 text-amber-700">
                                    Confirm only after making and verifying the transfer.
                                </p>

                                <button
                                    type="submit"
                                    disabled={
                                        manualCompleteMutation.isPending ||
                                        transactionReference.trim().length < 4
                                    }
                                    className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#153d35] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#0f302a] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <ShieldCheck size={14} />
                                    {manualCompleteMutation.isPending
                                        ? 'Recording…'
                                        : 'Confirm transfer completed'}
                                </button>
                            </form>
                        )}
                </div>
            ))}

            {canInitiate && (
                <div className="mt-5 border-t border-neutral-100 pt-4">
                    {!supportedMethod ? (
                        <p className="text-sm leading-6 text-amber-800">
                            This order uses the payment method "
                            {order.payment_method || 'unknown'}".
                            The current workflow supports Cashfree
                            online payments and COD only.
                        </p>
                    ) : (
                        <>
                            {isCod && (
                                <label
                                    className="block max-w-sm text-xs font-semibold text-neutral-700"
                                    htmlFor={`refund-method-${order.id}`}
                                >
                                    Manual refund method

                                    <select
                                        id={`refund-method-${order.id}`}
                                        value={manualMethod}
                                        onChange={(event) =>
                                            setManualMethod(
                                                event.target.value,
                                            )
                                        }
                                        className="mt-2 block w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-[#18705c]"
                                    >
                                        <option value="manual_upi">
                                            UPI transfer
                                        </option>
                                        <option value="manual_bank_transfer">
                                            Bank transfer
                                        </option>
                                    </select>
                                </label>
                            )}

                            <button
                                type="button"
                                onClick={() => {
                                    const confirmed = window.confirm(
                                        `Initiate a full refund of ${formatPrice(
                                            order.total_amount,
                                        )} for Order #${order.id}?`,
                                    )

                                    if (confirmed) {
                                        initiateMutation.mutate()
                                    }
                                }}
                                disabled={initiateMutation.isPending}
                                className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#153d35] px-5 py-3 text-xs font-semibold text-white hover:bg-[#0f302a] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <RotateCcw size={14} />

                                {initiateMutation.isPending
                                    ? 'Initiating…'
                                    : isCashfree
                                        ? 'Initiate Cashfree refund'
                                        : 'Create manual refund record'}
                            </button>

                            <p className="mt-2 text-xs leading-5 text-neutral-500">
                                This starts a full-order refund. Online
                                refunds remain in processing until Cashfree
                                confirms success. COD refunds require a
                                verified manual transfer.
                            </p>
                        </>
                    )}
                </div>
            )}

            {actionError && (
                <div
                    role="alert"
                    className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                    {actionError}
                </div>
            )}
        </section>
    )
}

export default RefundManagementPanel
