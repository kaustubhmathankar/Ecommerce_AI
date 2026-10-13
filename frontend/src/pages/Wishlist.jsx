import { useQueries } from '@tanstack/react-query'
import { Heart, ShoppingBag } from 'lucide-react'
import { Link } from 'react-router-dom'

import { getProduct } from '../api/products'
import Footer from '../components/layout/Footer'
import Navbar from '../components/layout/Navbar'
import ProductGrid from '../components/product/ProductGrid'
import { useCart } from '../context/CartContext'
import { useWishlist } from '../context/WishlistContext'

function Wishlist() {
    const { productIds, toggleWishlist } = useWishlist()
    const { addItem } = useCart()
    const productQueries = useQueries({
        queries: productIds.map((productId) => ({
            queryKey: ['product', productId],
            queryFn: () => getProduct(productId),
        })),
    })

    const products = productQueries
        .map((query) => query.data)
        .filter(Boolean)
    const hasError = productQueries.some((query) => query.isError)
    const isLoading = productQueries.some((query) => query.isLoading)

    return (
        <div className="min-h-screen bg-white text-neutral-900">
            <Navbar />
            <main className="mx-auto min-h-[65vh] max-w-[1440px] px-5 py-10 sm:px-8 sm:py-14 lg:px-12">
                <div className="mb-8 flex flex-wrap items-end justify-between gap-4 rounded-[24px] bg-[#f0efe9] px-5 py-7 sm:px-8 sm:py-9">
                    <div>
                        <p className="text-[10px] font-semibold tracking-[0.2em] text-[#18705c]">YOUR PERSONAL EDIT</p>
                        <h1 className="mt-2 text-3xl font-medium tracking-[-0.05em] sm:text-4xl">Saved for later.</h1>
                        <p className="mt-2 text-sm text-neutral-500">A place for the things you love, all in one view.</p>
                    </div>
                    <Link to="/shop" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#153d35] px-5 py-3 text-xs font-semibold text-white transition hover:bg-[#24584b]">
                        <ShoppingBag size={15} /> DISCOVER MORE
                    </Link>
                </div>
                <div className="mb-6 flex items-center gap-2 text-xs text-neutral-500">
                    <Heart size={14} className="text-[#18705c]" />
                    {productIds.length} saved {productIds.length === 1 ? 'item' : 'items'}
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
                        {[1, 2, 3, 4].map((item) => <div key={item}><div className="aspect-[4/5] animate-pulse rounded-2xl bg-neutral-100" /><div className="mt-3 h-3 w-2/3 animate-pulse rounded bg-neutral-100" /><div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-neutral-100" /></div>)}
                    </div>
                ) : products.length || hasError ? (
                    <>
                        {hasError && (
                            <div role="alert" className="mb-6 rounded-2xl border border-orange-200 bg-orange-50 p-5 text-sm text-orange-800">
                                One or more saved products are no longer available. Remove them from your wishlist below.
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {productQueries.map((query, index) => query.isError && (
                                        <button
                                            key={productIds[index]}
                                            type="button"
                                            onClick={() => toggleWishlist({ id: productIds[index] })}
                                            className="rounded-full border border-orange-300 px-3 py-1.5 text-xs font-semibold hover:bg-orange-100"
                                        >
                                            Remove unavailable item
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {products.length > 0 && (
                            <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 sm:gap-y-10 md:grid-cols-3 lg:grid-cols-4">
                                <ProductGrid
                                    products={products}
                                    wishlist={productIds}
                                    onWishlist={toggleWishlist}
                                    onAddToCart={addItem}
                                />
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
                        <Heart size={34} strokeWidth={1.4} className="text-[#18705c]" />
                        <h2 className="mt-5 text-2xl font-medium">Keep the good finds close.</h2>
                        <p className="mt-2 max-w-sm text-sm leading-6 text-neutral-500">Tap the heart on any product to save it here for later.</p>
                        <Link to="/shop" className="mt-6 rounded-full bg-[#153d35] px-6 py-3 text-sm font-semibold text-white">Explore the collection</Link>
                    </div>
                )}
            </main>
            <Footer />
        </div>
    )
}

export default Wishlist
