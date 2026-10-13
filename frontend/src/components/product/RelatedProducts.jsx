import {
    ArrowRight,
} from 'lucide-react'

import {
    Link,
} from 'react-router-dom'

import {
    useQuery,
} from '@tanstack/react-query'

import {
    getProducts,
} from '../../api/products'

import {
    useCart,
} from '../../context/CartContext'

import {
    useWishlist,
} from '../../context/WishlistContext'

import ProductGrid
    from './ProductGrid'


function RelatedProducts({
    categoryId,
    categoryName,
    currentProductId,
}) {

    const {
        addItem,
    } = useCart()


    const {
        productIds: wishlist,
        toggleWishlist,
    } = useWishlist()


    const productsQuery =
        useQuery({
            queryKey: [
                'related-products',
                categoryId,
                currentProductId,
            ],

            queryFn: () =>
                getProducts({
                    page: 1,
                    limit: 8,
                    categoryId,
                    sortBy: 'newest',
                }),

            enabled:
                Boolean(
                    categoryId,
                ),

            staleTime:
                5 * 60 * 1000,
        })


    const products =
        (
            productsQuery.data
                ?.items ??
            []
        )
            .filter(
                (
                    product,
                ) =>
                    Number(
                        product.id,
                    ) !==
                    Number(
                        currentProductId,
                    ),
            )
            .slice(
                0,
                4,
            )


    const handleAddToCart =
        (
            product,
        ) => {

            return addItem(
                product,
                1,
            )
        }


    // --------------------------------------------------------
    // Don't render if there are no related products.
    // --------------------------------------------------------

    if (
        productsQuery.isError ||
        (
            !productsQuery.isLoading &&
            products.length === 0
        )
    ) {

        return null
    }


    return (

        <section className="border-y border-neutral-100 bg-[#fafaf7]">

            <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 sm:py-16 lg:px-12">

                {/* ==================================================
                    HEADER
                ================================================== */}

                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

                    <div>

                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#18705c]">
                            You may also like
                        </p>


                        <h2 className="mt-2 text-2xl font-medium tracking-[-0.04em] sm:text-3xl">

                            More from{' '}

                            {
                                categoryName ||
                                'this category'
                            }

                        </h2>


                        <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-500">
                            Explore more products from the same collection.
                        </p>

                    </div>


                    <Link
                        to={`/shop?categoryId=${categoryId}`}
                        className="inline-flex items-center gap-2 self-start rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#153d35] transition hover:border-[#18705c] hover:bg-[#edf5f0] sm:self-auto"
                    >

                        View category

                        <ArrowRight
                            size={13}
                        />

                    </Link>

                </div>


                {/* ==================================================
                    LOADING
                ================================================== */}

                {productsQuery.isLoading ? (

                    <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">

                        {[1, 2, 3, 4].map(
                            (
                                item,
                            ) => (

                                <div
                                    key={
                                        item
                                    }
                                >

                                    <div className="aspect-[4/5] animate-pulse rounded-[24px] bg-neutral-200" />

                                    <div className="mt-4 h-3 w-20 animate-pulse rounded bg-neutral-200" />

                                    <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-neutral-200" />

                                    <div className="mt-3 h-4 w-20 animate-pulse rounded bg-neutral-200" />

                                </div>

                            ),
                        )}

                    </div>

                ) : (

                    <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">

                        <ProductGrid
                            products={
                                products
                            }
                            wishlist={
                                wishlist
                            }
                            onWishlist={
                                toggleWishlist
                            }
                            onAddToCart={
                                handleAddToCart
                            }
                        />

                    </div>

                )}

            </div>

        </section>
    )
}


export default RelatedProducts