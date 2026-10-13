import apiClient from './client'

export async function placeOrder(payload) {
    const response = await apiClient.post('/orders', payload)
    return response.data
}

export async function getOrderHistory() {
    const response = await apiClient.get('/orders')
    return response.data
}

export async function getOrder(orderId) {
    const response = await apiClient.get(`/orders/${orderId}`)
    return response.data
}

export async function cancelOrder(orderId, reason) {
    const response = await apiClient.post(
        `/orders/${orderId}/cancel`,
        { reason },
    )

    return response.data
}

export async function requestReturn(orderId, reason) {
    const response = await apiClient.post(
        `/orders/${orderId}/return`,
        { reason },
    )

    return response.data
}

export async function getAllOrdersAdmin() {
    const response = await apiClient.get('/orders/admin')
    return response.data
}

export async function updateOrderStatusAdmin(
    orderId,
    orderStatus,
) {
    const response = await apiClient.patch(
        `/orders/${orderId}/status`,
        {
            status: orderStatus,
        },
    )

    return response.data
}