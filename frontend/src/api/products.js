import apiClient from './client'

export async function getProducts({
    page = 1,
    limit = 12,
    search = '',
    categoryId = null,
    brand = '',
    minPrice = null,
    maxPrice = null,
    inStock = null,
    featured = null,
    onSale = null,
    minDiscount = null,
    sortBy = 'newest',
} = {}) {
    const params = {
        page,
        limit,
        sort_by: sortBy,
    }

    if (search.trim()) {
        params.search = search.trim()
    }

    if (categoryId) {
        params.category_id = categoryId
    }

    if (brand?.trim()) {
        params.brand = brand.trim()
    }

    if (minPrice !== null && minPrice !== '') {
        params.min_price = minPrice
    }

    if (maxPrice !== null && maxPrice !== '') {
        params.max_price = maxPrice
    }

    if (inStock !== null) {
        params.in_stock = inStock
    }

    if (featured !== null) {
        params.featured = featured
    }

    if (onSale !== null) {
        params.on_sale = onSale
    }

    if (
        minDiscount !== null &&
        minDiscount !== ''
    ) {
        params.min_discount = minDiscount
    }

    const response = await apiClient.get(
        '/products',
        { params },
    )

    return response.data
}


export async function getProductFilterOptions() {
    const response = await apiClient.get(
        '/products/filters',
    )

    return response.data
}


export async function getProduct(productId) {
    const response = await apiClient.get(
        `/products/${productId}`,
    )

    return response.data
}


export async function getProductBySlug(slug) {
    const response = await apiClient.get(
        `/products/slug/${encodeURIComponent(slug)}`,
    )

    return response.data
}


export async function getCategories() {
    const response = await apiClient.get(
        '/categories',
    )

    return response.data
}


export async function createCategoryAdmin(payload) {
    const response = await apiClient.post(
        '/categories',
        payload,
    )

    return response.data
}


export async function updateCategoryAdmin(
    categoryId,
    payload,
) {
    const response = await apiClient.put(
        `/categories/${categoryId}`,
        payload,
    )

    return response.data
}


export async function deleteCategoryAdmin(categoryId) {
    const response = await apiClient.delete(
        `/categories/${categoryId}`,
    )

    return response.data
}


export async function getAdminOverview() {
    const response = await apiClient.get(
        '/admin/overview',
    )

    return response.data
}


export async function getUsersAdmin() {
    const response = await apiClient.get(
        '/admin/users',
    )

    return response.data
}


export async function toggleUserStatusAdmin(
    userId,
    isActive,
) {
    const response = await apiClient.patch(
        `/admin/users/${userId}/status`,
        {
            is_active: isActive,
        },
    )

    return response.data
}


export async function updateUserRoleAdmin(
    userId,
    role,
) {
    const response = await apiClient.patch(
        `/admin/users/${userId}/role`,
        {
            role,
        },
    )

    return response.data
}


export async function createProductAdmin(payload) {
    const response = await apiClient.post(
        '/products',
        payload,
    )

    return response.data
}


export async function updateProductAdmin(
    productId,
    payload,
) {
    const response = await apiClient.put(
        `/products/${productId}`,
        payload,
    )

    return response.data
}


export async function deleteProductAdmin(
    productId,
) {
    const response = await apiClient.delete(
        `/products/${productId}`,
    )

    return response.data
}