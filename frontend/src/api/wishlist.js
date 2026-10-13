import apiClient from './client'

export async function getWishlist() {
    const response = await apiClient.get('/wishlist')
    return response.data
}

export async function syncWishlist(productIds) {
    const response = await apiClient.post(
        '/wishlist/sync',
        {
            product_ids: productIds,
        },
    )

    return response.data
}

export async function toggleWishlistItem(productId) {
    const response = await apiClient.post(
        '/wishlist/toggle',
        {
            product_id: productId,
        },
    )

    return response.data
}

export async function clearServerWishlist() {
    await apiClient.delete('/wishlist')
}