import apiClient from './client'

export async function getCart() {
    const response = await apiClient.get('/cart')
    return response.data
}

export async function syncCart(items) {
    const response = await apiClient.post('/cart/sync', {
        items: items.map(({ product, quantity }) => ({
            product_id: Number(product.id),
            quantity,
        })),
    })

    return response.data
}

export async function addCartItem(productId, quantity = 1) {
    const response = await apiClient.post('/cart/items', {
        product_id: productId,
        quantity,
    })

    return response.data
}

export async function updateCartItem(productId, quantity) {
    const response = await apiClient.patch(
        `/cart/items/${productId}`,
        {
            product_id: productId,
            quantity,
        },
    )

    return response.data
}

export async function removeCartItem(productId) {
    const response = await apiClient.delete(
        `/cart/items/${productId}`,
    )

    return response.data
}

export async function clearServerCart() {
    await apiClient.delete('/cart')
}