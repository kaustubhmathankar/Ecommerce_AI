import apiClient from './client'


// ============================================================
// CUSTOMER / PUBLIC REVIEWS
// ============================================================

export async function getProductReviews(
    productId,
) {
    const response = await apiClient.get(
        `/products/${productId}/reviews`,
    )

    return response.data
}


export async function createProductReview(
    productId,
    payload,
) {
    const response = await apiClient.post(
        `/products/${productId}/reviews`,
        payload,
    )

    return response.data
}


export async function updateProductReview(
    reviewId,
    payload,
) {
    const response = await apiClient.patch(
        `/products/reviews/${reviewId}`,
        payload,
    )

    return response.data
}


export async function deleteProductReview(
    reviewId,
) {
    await apiClient.delete(
        `/products/reviews/${reviewId}`,
    )
}


// ============================================================
// ADMIN REVIEWS
// ============================================================

export async function getAdminReviews() {
    const response = await apiClient.get(
        '/admin/reviews',
    )

    return response.data
}


export async function deleteAdminReview(
    reviewId,
) {
    await apiClient.delete(
        `/admin/reviews/${reviewId}`,
    )
}