export const FALLBACK_PRODUCT_IMAGE = '/product-placeholder.svg'

export function handleImageError(event) {
    const image = event.currentTarget
    image.onerror = null
    image.src = FALLBACK_PRODUCT_IMAGE
}
