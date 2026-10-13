import { useState } from 'react'
import {
    ArrowUpRight,
    Heart,
    ShoppingBag,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { handleImageError } from '../../utils/images'


const formatPrice = (
    price,
) => {

    return new Intl.NumberFormat(
        'en-IN',
        {
            style:
                'currency',

            currency:
                'INR',

            maximumFractionDigits:
                0,
        },
    ).format(
        Number(
            price,
        ) || 0,
    )
}


function ProductCard({
    product,
    isWishlisted,
    onWishlist,
    onAddToCart,
}) {

    const [
        cartMessage,
        setCartMessage,
    ] =
        useState('')


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
                ) *
                100,
            )
            : 0


    const isOutOfStock =
        Number(
            product.stock_quantity,
        ) <= 0


    const isLowStock =
        !isOutOfStock &&
        Number(
            product.stock_quantity,
        ) <= 5


    const handleAddToCart =
        () => {

            const result =
                onAddToCart(
                    product,
                )


            setCartMessage(
                result?.message ||
                'Added to your bag.',
            )


            window.setTimeout(
                () =>
                    setCartMessage(
                        '',
                    ),
                2200,
            )

        }


    return (

        <article className="product-card group min-w-0">

            {/* ====================================================
                IMAGE
            ==================================================== */}

            <div className="product-card__media relative aspect-[4/5] overflow-hidden rounded-[24px] bg-[#f1f0eb]">

                <Link
                    to={`/products/${product.slug}`}
                    aria-label={`View ${product.name}`}
                    className="block h-full w-full"
                >

                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(255,255,255,0.92),rgba(238,237,231,0.95)_68%,rgba(228,227,220,0.96))]" />


                    <img
                        src={
                            product.image_url ||
                            '/product-placeholder.svg'
                        }
                        alt={
                            product.name
                        }
                        loading="lazy"
                        onError={
                            handleImageError
                        }
                        className="relative h-full w-full object-contain p-5 transition duration-700 ease-out group-hover:scale-[1.055] sm:p-7"
                    />

                </Link>


                {/* =================================================
                    TOP BADGES
                ================================================= */}

                <div className="absolute left-3 top-3 flex flex-wrap gap-2 sm:left-4 sm:top-4">

                    {product.is_featured && (

                        <span className="rounded-full border border-white/70 bg-white/90 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#153d35] shadow-sm backdrop-blur-sm">
                            Featured
                        </span>

                    )}


                    {hasDiscount && (

                        <span className="rounded-full bg-[#153d35] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-white shadow-sm">
                            -{discountPercentage}%
                        </span>

                    )}

                </div>


                {/* =================================================
                    WISHLIST
                ================================================= */}

                <button
                    type="button"
                    onClick={() =>
                        onWishlist(
                            product,
                        )
                    }
                    aria-label={
                        isWishlisted
                            ? `Remove ${product.name} from wishlist`
                            : `Add ${product.name} to wishlist`
                    }
                    className={`absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border shadow-sm backdrop-blur-md transition duration-300 sm:right-4 sm:top-4 ${isWishlisted
                            ? 'border-rose-100 bg-white text-rose-500'
                            : 'border-white/80 bg-white/90 text-neutral-800 hover:-translate-y-0.5 hover:bg-white'
                        }`}
                >

                    <Heart
                        size={17}
                        className={
                            isWishlisted
                                ? 'fill-rose-500 text-rose-500'
                                : ''
                        }
                    />

                </button>


                {/* =================================================
                    ADD TO BAG
                ================================================= */}

                <button
                    type="button"
                    onClick={
                        handleAddToCart
                    }
                    disabled={
                        isOutOfStock
                    }
                    className={`absolute inset-x-3 bottom-3 flex min-h-11 items-center justify-center gap-2 rounded-[14px] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.13em] shadow-[0_10px_30px_rgba(15,23,42,0.10)] transition-all duration-300 sm:inset-x-4 sm:bottom-4 ${isOutOfStock

                            ? 'cursor-not-allowed bg-neutral-300 text-neutral-500'

                            : cartMessage

                                ? 'bg-[#18705c] text-white'

                                : 'bg-white/95 text-[#153d35] hover:bg-[#153d35] hover:text-white md:translate-y-2 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100'
                        }`}
                >

                    <ShoppingBag
                        size={15}
                    />


                    {
                        cartMessage ||

                        (
                            isOutOfStock
                                ? 'Out of stock'
                                : 'Add to bag'
                        )
                    }

                </button>


                {/* =================================================
                    QUICK VIEW CIRCLE
                ================================================= */}

                {!isOutOfStock && (

                    <Link
                        to={`/products/${product.slug}`}
                        aria-label={`View details for ${product.name}`}
                        className="absolute bottom-4 right-4 hidden h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/90 text-[#153d35] shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-[#153d35] hover:text-white md:flex md:translate-y-2 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100"
                    >

                        <ArrowUpRight
                            size={16}
                        />

                    </Link>

                )}

            </div>


            {/* ====================================================
                PRODUCT INFORMATION
            ==================================================== */}

            <div className="product-card__details pt-4 px-0.5">

                {product.brand && (

                    <p className="text-[9px] font-semibold uppercase tracking-[0.17em] text-neutral-400">

                        {
                            product.brand
                        }

                    </p>

                )}


                <Link
                    to={`/products/${product.slug}`}
                    className="mt-1.5 block"
                >

                    <h3 className="line-clamp-2 text-[15px] font-medium leading-5 tracking-[-0.015em] text-neutral-900 transition duration-200 group-hover:text-[#153d35]">

                        {
                            product.name
                        }

                    </h3>

                </Link>


                {product.short_description && (

                    <p className="mt-1.5 line-clamp-1 text-xs leading-5 text-neutral-500">

                        {
                            product.short_description
                        }

                    </p>

                )}


                {/* PRICE */}

                <div className="mt-2.5 flex flex-wrap items-baseline gap-2">

                    <span className="text-[15px] font-semibold tracking-[-0.015em] text-[#153d35]">

                        {
                            formatPrice(
                                product.price,
                            )
                        }

                    </span>


                    {hasDiscount && (

                        <span className="text-xs text-neutral-400 line-through">

                            {
                                formatPrice(
                                    product.compare_at_price,
                                )
                            }

                        </span>

                    )}

                </div>


                {/* STOCK */}

                {isLowStock && (

                    <div className="mt-2 flex items-center gap-1.5">

                        <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />

                        <p className="text-[10px] font-medium text-orange-600">

                            Only {
                                product.stock_quantity
                            } left

                        </p>

                    </div>

                )}


                {isOutOfStock && (

                    <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400">

                        Currently unavailable

                    </p>

                )}

            </div>

        </article>
    )
}


export default ProductCard