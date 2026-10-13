import { useState } from 'react'

import {
    ArrowLeft,
    ArrowRight,
    Check,
    Heart,
    Minus,
    Plus,
    RotateCcw,
    ShieldCheck,
    ShoppingBag,
    Star,
    Truck,
    Zap,
} from 'lucide-react'

import {
    Link,
    useNavigate,
    useParams,
} from 'react-router-dom'

import {
    useQuery,
} from '@tanstack/react-query'

import {
    useCart,
} from '../context/CartContext'

import {
    useWishlist,
} from '../context/WishlistContext'

import {
    getCategories,
    getProductBySlug,
} from '../api/products'

import {
    getProductReviews,
} from '../api/reviews'

import Navbar from '../components/layout/Navbar'

import Footer from '../components/layout/Footer'

import ProductReviews from '../components/product/ProductReviews'

import RelatedProducts
    from '../components/product/RelatedProducts'

import {
    handleImageError,
} from '../utils/images'


// ============================================================
// FORMAT PRICE
// ============================================================

const formatPrice = (
    price,
) => {

    return new Intl.NumberFormat(
        'en-IN',
        {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        },
    ).format(
        Number(price) || 0,
    )
}


// ============================================================
// STAR DISPLAY
// ============================================================

function RatingStars({
    rating,
    size = 15,
}) {

    return (

        <div className="flex items-center gap-0.5">

            {[1, 2, 3, 4, 5].map(
                (star) => (

                    <Star
                        key={star}
                        size={size}
                        strokeWidth={1.6}
                        className={
                            star <=
                                Math.round(
                                    rating,
                                )
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-neutral-300'
                        }
                    />

                ),
            )}

        </div>
    )
}


// ============================================================
// PRODUCT DETAILS
// ============================================================

function ProductDetails() {

    const {
        slug,
    } = useParams()


    const navigate =
        useNavigate()


    // ========================================================
    // STATE
    // ========================================================

    const [
        quantity,
        setQuantity,
    ] = useState(1)


    const [
        addedToCart,
        setAddedToCart,
    ] = useState(false)


    const [
        buyingNow,
        setBuyingNow,
    ] = useState(false)


    // ========================================================
    // CART / WISHLIST
    // ========================================================

    const {
        addItem,
    } = useCart()


    const {
        productIds: wishlist,
        toggleWishlist,
    } = useWishlist()


    // ========================================================
    // PRODUCT
    // ========================================================

    const productQuery =
        useQuery({
            queryKey: [
                'product',
                slug,
            ],

            queryFn: () =>
                getProductBySlug(
                    slug,
                ),

            enabled:
                Boolean(slug),
        })


    const product =
        productQuery.data


    // ========================================================
    // CATEGORY
    // ========================================================

    const categoriesQuery =
        useQuery({
            queryKey: [
                'categories',
            ],

            queryFn:
                getCategories,

            staleTime:
                5 * 60 * 1000,
        })


    const categories =
        categoriesQuery.data ?? []


    const category =
        categories.find(
            (
                item,
            ) =>
                Number(
                    item.id,
                ) ===
                Number(
                    product?.category_id,
                ),
        )


    // ========================================================
    // REVIEW SUMMARY
    //
    // ProductReviews uses the same React Query key, so this
    // summary shares the same cached review request.
    // ========================================================

    const reviewsQuery =
        useQuery({
            queryKey: [
                'product-reviews',
                product?.id,
            ],

            queryFn: () =>
                getProductReviews(
                    product.id,
                ),

            enabled:
                Boolean(
                    product?.id,
                ),
        })


    const reviewCount =
        Number(
            reviewsQuery.data?.total ??
            0,
        )


    const averageRating =
        Number(
            reviewsQuery.data
                ?.average_rating ??
            0,
        )


    // ========================================================
    // LOADING
    // ========================================================

    if (
        productQuery.isLoading
    ) {

        return (

            <div className="min-h-screen bg-white">

                <div className="flex min-h-9 items-center justify-center bg-[#153d35] px-4 py-2 text-center text-[10px] font-medium tracking-[0.16em] text-white sm:text-xs">
                    FREE SHIPPING ON ORDERS OF ₹1,999 OR MORE
                </div>


                <Navbar
                    cartCount={0}
                    wishlistCount={0}
                    search=""
                    onSearchChange={() => { }}
                />


                <main className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-12">

                    <div className="mb-8 h-4 w-48 animate-pulse rounded bg-neutral-100" />


                    <div className="grid gap-10 lg:grid-cols-[1.04fr_0.96fr] lg:gap-16">

                        <div className="aspect-square animate-pulse rounded-[30px] bg-neutral-100" />


                        <div className="space-y-5 py-5">

                            <div className="h-3 w-24 animate-pulse rounded bg-neutral-100" />

                            <div className="h-12 w-4/5 animate-pulse rounded bg-neutral-100" />

                            <div className="h-8 w-48 animate-pulse rounded bg-neutral-100" />

                            <div className="h-20 w-full animate-pulse rounded bg-neutral-100" />

                            <div className="h-12 w-full animate-pulse rounded bg-neutral-100" />

                            <div className="h-14 w-full animate-pulse rounded bg-neutral-100" />

                        </div>

                    </div>

                </main>

            </div>
        )
    }


    // ========================================================
    // ERROR
    // ========================================================

    if (
        productQuery.isError ||
        !product
    ) {

        return (

            <div className="min-h-screen bg-white">

                <div className="flex min-h-9 items-center justify-center bg-[#153d35] px-4 py-2 text-center text-[10px] font-medium tracking-[0.16em] text-white sm:text-xs">
                    FREE SHIPPING ON ORDERS OF ₹1,999 OR MORE
                </div>


                <Navbar
                    cartCount={0}
                    wishlistCount={0}
                    search=""
                    onSearchChange={() => { }}
                />


                <main className="flex min-h-[60vh] items-center justify-center px-5">

                    <div className="max-w-md text-center">

                        <p className="text-[10px] font-semibold tracking-[0.2em] text-[#18705c]">
                            PRODUCT NOT FOUND
                        </p>


                        <h1 className="mt-3 text-3xl font-medium tracking-tight">
                            We couldn't find that product.
                        </h1>


                        <p className="mt-3 text-sm leading-6 text-neutral-500">
                            The product may have been removed or the link
                            may no longer be available.
                        </p>


                        <Link
                            to="/shop"
                            className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#153d35] px-6 py-3 text-xs font-semibold text-white transition hover:bg-[#0f302a]"
                        >
                            BACK TO SHOP

                            <ArrowRight
                                size={14}
                            />

                        </Link>

                    </div>

                </main>


                <Footer />

            </div>
        )
    }


    // ========================================================
    // DISCOUNT
    // ========================================================

    const hasDiscount =
        product.compare_at_price &&
        Number(
            product.compare_at_price,
        ) >
        Number(
            product.price,
        )


    const discountPercentage =
        hasDiscount
            ? Math.round(
                (
                    (
                        Number(
                            product.compare_at_price,
                        ) -
                        Number(
                            product.price,
                        )
                    ) /
                    Number(
                        product.compare_at_price,
                    )
                ) * 100,
            )
            : 0


    // ========================================================
    // STOCK
    // ========================================================

    const stock =
        Number(
            product.stock_quantity,
        ) || 0


    const isOutOfStock =
        stock <= 0


    const isLowStock =
        stock > 0 &&
        stock <= 5


    const maxQuantity =
        Math.min(
            stock,
            10,
        )


    // ========================================================
    // QUANTITY
    // ========================================================

    const increaseQuantity =
        () => {

            setQuantity(
                (
                    current,
                ) =>
                    Math.min(
                        current + 1,
                        maxQuantity,
                    ),
            )
        }


    const decreaseQuantity =
        () => {

            setQuantity(
                (
                    current,
                ) =>
                    Math.max(
                        current - 1,
                        1,
                    ),
            )
        }


    // ========================================================
    // ADD TO CART
    // ========================================================

    const handleAddToCart =
        () => {

            const result =
                addItem(
                    product,
                    quantity,
                )


            if (
                result.success
            ) {

                setAddedToCart(
                    true,
                )


                window.setTimeout(
                    () =>
                        setAddedToCart(
                            false,
                        ),
                    2200,
                )

            }


            return result
        }


    // ========================================================
    // BUY NOW
    //
    // Uses the existing cart/checkout flow, so no backend API
    // contract is changed.
    // ========================================================

    const handleBuyNow =
        () => {

            if (
                isOutOfStock
            ) {
                return
            }


            const result =
                addItem(
                    product,
                    quantity,
                )


            if (
                !result.success
            ) {
                return
            }


            setBuyingNow(
                true,
            )


            navigate(
                '/checkout',
            )
        }


    // ========================================================
    // SCROLL TO REVIEWS
    // ========================================================

    const handleViewReviews =
        () => {

            document
                .getElementById(
                    'reviews',
                )
                ?.scrollIntoView({
                    behavior:
                        'smooth',
                    block:
                        'start',
                })
        }


    // ========================================================
    // RENDER
    // ========================================================

    return (

        <div className="min-h-screen bg-white text-neutral-900">

            {/* ==================================================
                PROMO BAR
            ================================================== */}

            <div className="flex min-h-9 items-center justify-center bg-[#153d35] px-4 py-2 text-center text-[10px] font-medium tracking-[0.16em] text-white sm:text-xs">
                FREE SHIPPING ON ORDERS OF ₹1,999 OR MORE
            </div>


            {/* ==================================================
                NAVBAR
            ================================================== */}

            <Navbar
                cartCount={0}
                wishlistCount={
                    wishlist.length
                }
            />


            <main>

                {/* ==================================================
                    BREADCRUMB
                ================================================== */}

                <div className="mx-auto max-w-[1440px] px-5 pt-6 sm:px-8 lg:px-12">

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-400">

                        <Link
                            to="/"
                            className="transition hover:text-[#18705c]"
                        >
                            Home
                        </Link>


                        <span>
                            /
                        </span>


                        <Link
                            to="/shop"
                            className="transition hover:text-[#18705c]"
                        >
                            Shop
                        </Link>


                        {category && (

                            <>
                                <span>
                                    /
                                </span>

                                <Link
                                    to={`/shop?categoryId=${category.id}`}
                                    className="transition hover:text-[#18705c]"
                                >
                                    {
                                        category.name
                                    }
                                </Link>
                            </>

                        )}


                        <span>
                            /
                        </span>


                        <span className="max-w-[220px] truncate text-neutral-600">
                            {
                                product.name
                            }
                        </span>

                    </div>

                </div>


                {/* ==================================================
                    MAIN PRODUCT AREA
                ================================================== */}

                <section className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8 sm:py-10 lg:px-12 lg:py-12">

                    <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:gap-16">

                        {/* ==================================================
                            PRODUCT IMAGE
                        ================================================== */}

                        <div className="lg:sticky lg:top-24">

                            <div className="relative overflow-hidden rounded-[30px] border border-neutral-100 bg-[#f4f3ee] shadow-[0_20px_70px_rgba(15,23,42,0.06)]">

                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.96),rgba(239,238,232,0.82)_68%,rgba(228,227,220,0.8))]" />


                                <img
                                    src={
                                        product.image_url ||
                                        '/product-placeholder.svg'
                                    }
                                    alt={
                                        product.name
                                    }
                                    onError={
                                        handleImageError
                                    }
                                    className="relative aspect-square h-full w-full object-contain p-7 transition duration-700 hover:scale-[1.015] sm:p-12"
                                />


                                {/* TOP BADGES */}

                                <div className="absolute left-5 top-5 flex flex-wrap gap-2">

                                    {product.is_featured && (

                                        <span className="rounded-full border border-white/80 bg-white/90 px-3.5 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#153d35] shadow-sm backdrop-blur">
                                            Featured
                                        </span>

                                    )}


                                    {hasDiscount && (

                                        <span className="rounded-full bg-[#153d35] px-3.5 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-white shadow-sm">
                                            Save {discountPercentage}%
                                        </span>

                                    )}

                                </div>


                                {/* WISHLIST */}

                                <button
                                    type="button"
                                    onClick={() =>
                                        toggleWishlist(
                                            product,
                                        )
                                    }
                                    aria-label={
                                        wishlist.includes(
                                            product.id,
                                        )
                                            ? 'Remove from wishlist'
                                            : 'Add to wishlist'
                                    }
                                    className={`absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full border shadow-sm backdrop-blur transition ${wishlist.includes(
                                        product.id,
                                    )
                                            ? 'border-rose-100 bg-white text-rose-500'
                                            : 'border-white/80 bg-white/90 text-neutral-800 hover:border-[#18705c] hover:text-[#18705c]'
                                        }`}
                                >

                                    <Heart
                                        size={19}
                                        className={
                                            wishlist.includes(
                                                product.id,
                                            )
                                                ? 'fill-rose-500 text-rose-500'
                                                : ''
                                        }
                                    />

                                </button>


                                {/* IMAGE FOOTER */}

                                <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-[10px] text-neutral-500 shadow-sm backdrop-blur">

                                    <span>
                                        ShopSphere quality selection
                                    </span>


                                    <span className="font-semibold text-[#153d35]">
                                        SKU {product.sku}
                                    </span>

                                </div>

                            </div>

                        </div>


                        {/* ==================================================
                            PRODUCT INFORMATION
                        ================================================== */}

                        <div className="lg:pt-1">

                            {/* BRAND / CATEGORY */}

                            <div className="flex flex-wrap items-center gap-2">

                                {product.brand && (

                                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#18705c]">
                                        {
                                            product.brand
                                        }
                                    </span>

                                )}


                                {category && (

                                    <>

                                        <span className="text-neutral-300">
                                            /
                                        </span>

                                        <Link
                                            to={`/shop?categoryId=${category.id}`}
                                            className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400 transition hover:text-[#18705c]"
                                        >
                                            {
                                                category.name
                                            }
                                        </Link>

                                    </>

                                )}

                            </div>


                            {/* TITLE */}

                            <div className="mt-4 flex items-start justify-between gap-5">

                                <h1 className="max-w-2xl text-4xl font-medium leading-[1.03] tracking-[-0.05em] text-neutral-950 sm:text-5xl lg:text-[58px]">

                                    {
                                        product.name
                                    }

                                </h1>


                                <button
                                    type="button"
                                    onClick={() =>
                                        toggleWishlist(
                                            product,
                                        )
                                    }
                                    aria-label="Toggle wishlist"
                                    className={`mt-1 hidden h-12 w-12 shrink-0 items-center justify-center rounded-full border transition sm:flex ${wishlist.includes(
                                        product.id,
                                    )
                                            ? 'border-rose-100 bg-rose-50 text-rose-500'
                                            : 'border-neutral-200 bg-white text-neutral-700 hover:border-[#18705c] hover:text-[#18705c]'
                                        }`}
                                >

                                    <Heart
                                        size={20}
                                        className={
                                            wishlist.includes(
                                                product.id,
                                            )
                                                ? 'fill-rose-500 text-rose-500'
                                                : ''
                                        }
                                    />

                                </button>

                            </div>


                            {/* RATING */}

                            <button
                                type="button"
                                onClick={
                                    handleViewReviews
                                }
                                className="mt-5 inline-flex flex-wrap items-center gap-2.5 text-left"
                            >

                                <RatingStars
                                    rating={
                                        averageRating
                                    }
                                    size={16}
                                />


                                {reviewCount > 0 ? (

                                    <>

                                        <span className="text-sm font-semibold text-neutral-800">
                                            {
                                                averageRating.toFixed(
                                                    1,
                                                )
                                            }
                                        </span>

                                        <span className="text-xs text-neutral-400">
                                            (
                                            {
                                                reviewCount
                                            } reviews
                                            )
                                        </span>

                                    </>

                                ) : (

                                    <span className="text-xs text-neutral-400">
                                        No reviews yet
                                    </span>

                                )}

                            </button>


                            {/* PRICE */}

                            <div className="mt-7 flex flex-wrap items-end gap-3">

                                <span className="text-[26px] font-semibold tracking-[-0.03em] text-[#153d35] sm:text-[30px]">

                                    {
                                        formatPrice(
                                            product.price,
                                        )
                                    }

                                </span>


                                {hasDiscount && (

                                    <span className="pb-1 text-sm text-neutral-400 line-through">
                                        {
                                            formatPrice(
                                                product.compare_at_price,
                                            )
                                        }
                                    </span>

                                )}


                                {hasDiscount && (

                                    <span className="mb-1 rounded-full bg-[#e7f1eb] px-3 py-1.5 text-[10px] font-bold text-[#18705c]">
                                        {discountPercentage}% OFF
                                    </span>

                                )}

                            </div>


                            {/* DESCRIPTION */}

                            {product.short_description ||
                                product.description ? (

                                <p className="mt-6 max-w-2xl text-[14px] leading-7 text-neutral-600 sm:text-[15px]">

                                    {
                                        product.short_description ||
                                        product.description
                                    }

                                </p>

                            ) : null}


                            {/* STOCK */}

                            <div className="mt-6 flex flex-wrap items-center gap-3">

                                {!isOutOfStock ? (

                                    <>

                                        <span className="inline-flex items-center gap-2 rounded-full bg-[#edf7f1] px-3 py-1.5 text-[10px] font-semibold text-[#18705c]">

                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

                                            In stock

                                        </span>


                                        {isLowStock && (

                                            <span className="rounded-full bg-orange-50 px-3 py-1.5 text-[10px] font-semibold text-orange-600">
                                                Only {stock} left
                                            </span>

                                        )}

                                    </>

                                ) : (

                                    <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-[10px] font-semibold text-red-600">

                                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />

                                        Out of stock

                                    </span>

                                )}

                            </div>


                            {/* PURCHASE PANEL */}

                            {!isOutOfStock && (

                                <div className="mt-8 rounded-[24px] border border-neutral-200 bg-[#fbfbf9] p-4 sm:p-5">

                                    {/* QUANTITY */}

                                    <div className="flex items-center justify-between gap-4">

                                        <div>

                                            <p className="text-xs font-semibold text-neutral-800">
                                                Quantity
                                            </p>

                                            <p className="mt-1 text-[10px] text-neutral-400">
                                                Maximum {maxQuantity} per order
                                            </p>

                                        </div>


                                        <div className="flex h-11 items-center overflow-hidden rounded-xl border border-neutral-200 bg-white">

                                            <button
                                                type="button"
                                                onClick={
                                                    decreaseQuantity
                                                }
                                                disabled={
                                                    quantity <=
                                                    1
                                                }
                                                aria-label="Decrease quantity"
                                                className="flex h-full w-10 items-center justify-center text-neutral-500 transition hover:bg-neutral-50 disabled:opacity-30"
                                            >

                                                <Minus
                                                    size={15}
                                                />

                                            </button>


                                            <span className="flex w-10 items-center justify-center text-sm font-semibold">
                                                {
                                                    quantity
                                                }
                                            </span>


                                            <button
                                                type="button"
                                                onClick={
                                                    increaseQuantity
                                                }
                                                disabled={
                                                    quantity >=
                                                    maxQuantity
                                                }
                                                aria-label="Increase quantity"
                                                className="flex h-full w-10 items-center justify-center text-neutral-500 transition hover:bg-neutral-50 disabled:opacity-30"
                                            >

                                                <Plus
                                                    size={15}
                                                />

                                            </button>

                                        </div>

                                    </div>


                                    {/* BUTTONS */}

                                    <div className="mt-4 grid gap-3 sm:grid-cols-2">

                                        <button
                                            type="button"
                                            onClick={
                                                handleAddToCart
                                            }
                                            className={`flex h-13 items-center justify-center gap-2 rounded-xl border px-5 text-xs font-semibold uppercase tracking-[0.08em] transition ${addedToCart
                                                    ? 'border-[#18705c] bg-[#18705c] text-white'
                                                    : 'border-[#153d35] bg-white text-[#153d35] hover:bg-[#edf5f0]'
                                                }`}
                                        >

                                            {addedToCart ? (

                                                <>
                                                    <Check
                                                        size={17}
                                                    />

                                                    Added to bag

                                                </>

                                            ) : (

                                                <>
                                                    <ShoppingBag
                                                        size={17}
                                                    />

                                                    Add to bag

                                                </>

                                            )}

                                        </button>


                                        <button
                                            type="button"
                                            onClick={
                                                handleBuyNow
                                            }
                                            disabled={
                                                buyingNow
                                            }
                                            className="flex h-13 items-center justify-center gap-2 rounded-xl bg-[#153d35] px-5 text-xs font-semibold uppercase tracking-[0.08em] text-white shadow-[0_12px_30px_rgba(21,61,53,0.18)] transition hover:bg-[#0f302a] disabled:cursor-wait disabled:opacity-70"
                                        >

                                            <Zap
                                                size={16}
                                                className="fill-current"
                                            />

                                            {
                                                buyingNow
                                                    ? 'Opening checkout...'
                                                    : 'Buy now'
                                            }

                                        </button>

                                    </div>


                                    <p className="mt-3 text-center text-[10px] leading-5 text-neutral-400">
                                        Buy now takes you directly to checkout using your current ShopSphere cart.
                                    </p>

                                </div>

                            )}


                            {/* SERVICE PROMISES */}

                            <div className="mt-7 grid gap-3 sm:grid-cols-3">

                                <div className="rounded-2xl border border-neutral-100 bg-white p-4">

                                    <Truck
                                        size={18}
                                        className="text-[#18705c]"
                                    />

                                    <p className="mt-3 text-xs font-semibold text-neutral-800">
                                        Fast delivery
                                    </p>

                                    <p className="mt-1 text-[10px] leading-5 text-neutral-500">
                                        Free over ₹1,999
                                    </p>

                                </div>


                                <div className="rounded-2xl border border-neutral-100 bg-white p-4">

                                    <RotateCcw
                                        size={18}
                                        className="text-[#18705c]"
                                    />

                                    <p className="mt-3 text-xs font-semibold text-neutral-800">
                                        Easy returns
                                    </p>

                                    <p className="mt-1 text-[10px] leading-5 text-neutral-500">
                                        30-day return window
                                    </p>

                                </div>


                                <div className="rounded-2xl border border-neutral-100 bg-white p-4">

                                    <ShieldCheck
                                        size={18}
                                        className="text-[#18705c]"
                                    />

                                    <p className="mt-3 text-xs font-semibold text-neutral-800">
                                        Secure checkout
                                    </p>

                                    <p className="mt-1 text-[10px] leading-5 text-neutral-500">
                                        Safe payment processing
                                    </p>

                                </div>

                            </div>


                            {/* PRODUCT DETAILS */}

                            <div className="mt-8 border-y border-neutral-100 py-6">

                                <div className="grid gap-5 sm:grid-cols-3">

                                    <div>

                                        <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                                            Category
                                        </p>

                                        <p className="mt-1 text-xs font-medium text-neutral-800">
                                            {
                                                category?.name ||
                                                '—'
                                            }
                                        </p>

                                    </div>


                                    <div>

                                        <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                                            SKU
                                        </p>

                                        <p className="mt-1 text-xs font-medium text-neutral-800">
                                            {
                                                product.sku
                                            }
                                        </p>

                                    </div>


                                    <div>

                                        <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                                            Brand
                                        </p>

                                        <p className="mt-1 text-xs font-medium text-neutral-800">
                                            {
                                                product.brand ||
                                                '—'
                                            }
                                        </p>

                                    </div>

                                </div>

                            </div>


                            {/* MOBILE WISHLIST */}

                            <button
                                type="button"
                                onClick={() =>
                                    toggleWishlist(
                                        product,
                                    )
                                }
                                className={`mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl border text-xs font-semibold sm:hidden ${wishlist.includes(
                                    product.id,
                                )
                                        ? 'border-rose-100 bg-rose-50 text-rose-500'
                                        : 'border-neutral-200 text-neutral-700'
                                    }`}
                            >

                                <Heart
                                    size={17}
                                    className={
                                        wishlist.includes(
                                            product.id,
                                        )
                                            ? 'fill-rose-500'
                                            : ''
                                    }
                                />

                                {wishlist.includes(
                                    product.id,
                                )
                                    ? 'Remove from wishlist'
                                    : 'Add to wishlist'}

                            </button>

                        </div>

                    </div>

                </section>


                {/* ==================================================
                    DESCRIPTION
                ================================================== */}

                <section className="border-y border-neutral-100 bg-[#fafaf7]">

                    <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 sm:py-14 lg:px-12">

                        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">

                            <div>

                                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#18705c]">
                                    Product story
                                </p>


                                <h2 className="mt-3 text-2xl font-medium tracking-[-0.04em] sm:text-3xl">
                                    Designed for everyday use.
                                </h2>

                            </div>


                            <div>

                                <p className="text-sm leading-7 text-neutral-600">
                                    {
                                        product.description ||
                                        product.short_description ||
                                        'A carefully selected ShopSphere product designed with everyday use in mind.'
                                    }
                                </p>


                                {product.short_description &&
                                    product.description && (

                                        <p className="mt-5 text-sm leading-7 text-neutral-500">
                                            {
                                                product.short_description
                                            }
                                        </p>

                                    )}

                            </div>

                        </div>

                    </div>

                </section>


                {/* ==================================================
                    REVIEWS
                ================================================== */}

                <ProductReviews
                    productId={
                        product.id
                    }
                />


                {/* ==================================================
                    RELATED PRODUCTS
                ================================================== */}

                {category && (

                    <RelatedProducts
                        categoryId={
                            category.id
                        }
                        categoryName={
                            category.name
                        }
                        currentProductId={
                            product.id
                        }
                    />

                )}


                {/* ==================================================
                    FINAL TRUST STRIP
                ================================================== */}

                <section className="border-y border-neutral-100 bg-white">

                    <div className="mx-auto grid max-w-[1440px] grid-cols-1 divide-y divide-neutral-100 px-5 py-2 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-8 lg:px-12">

                        <div className="px-4 py-6 text-center sm:px-7">

                            <ShoppingBag
                                size={20}
                                className="mx-auto text-[#18705c]"
                            />

                            <p className="mt-3 text-xs font-semibold">
                                Easy shopping
                            </p>

                            <p className="mt-1 text-[10px] leading-5 text-neutral-500">
                                Browse products and save favorites for later.
                            </p>

                        </div>


                        <div className="px-4 py-6 text-center sm:px-7">

                            <Truck
                                size={20}
                                className="mx-auto text-[#18705c]"
                            />

                            <p className="mt-3 text-xs font-semibold">
                                Reliable delivery
                            </p>

                            <p className="mt-1 text-[10px] leading-5 text-neutral-500">
                                Free shipping on qualifying orders.
                            </p>

                        </div>


                        <div className="px-4 py-6 text-center sm:px-7">

                            <ShieldCheck
                                size={20}
                                className="mx-auto text-[#18705c]"
                            />

                            <p className="mt-3 text-xs font-semibold">
                                Secure experience
                            </p>

                            <p className="mt-1 text-[10px] leading-5 text-neutral-500">
                                Secure account, checkout and order management.
                            </p>

                        </div>

                    </div>

                </section>

            </main>


            <Footer />

        </div>
    )
}


export default ProductDetails