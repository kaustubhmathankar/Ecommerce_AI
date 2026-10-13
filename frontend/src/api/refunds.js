
import apiClient from './client'

export async function initiateRefund(orderId, payload = {}) {
    const response = await apiClient.post(
        `/refunds/orders/${orderId}/initiate`,
        payload,
    )

    return response.data
}

export async function refreshRefundStatus(refundId) {
    const response = await apiClient.post(
        `/refunds/${refundId}/refresh`,
    )

    return response.data
}

export async function completeManualRefund(
    refundId,
    transactionReference,
) {
    const response = await apiClient.post(
        `/refunds/${refundId}/complete-manual`,
        {
            transaction_reference: transactionReference,
        },
    )

    return response.data
}

export async function getOrderRefunds(orderId) {
    const response = await apiClient.get(
        `/refunds/orders/${orderId}`,
    )

    return response.data
}
