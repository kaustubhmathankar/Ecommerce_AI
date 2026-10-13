import apiClient from './client'


export async function createCashfreePayment(
    payload,
) {
    const response =
        await apiClient.post(
            '/payments/cashfree/create',
            payload,
        )

    return response.data
}


export async function verifyCashfreePayment(
    paymentAttemptId,
    payload,
) {
    const response =
        await apiClient.post(
            `/payments/cashfree/${paymentAttemptId}/verify`,
            payload,
        )

    return response.data
}