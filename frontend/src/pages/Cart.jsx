
import { Link } from 'react-router-dom'
import {
    ArrowLeft,
    ArrowRight,
    Minus,
    Plus,
    ShieldCheck,
    ShoppingBag,
    Trash2,
    Truck,
} from 'lucide-react'

import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import { useCart } from '../context/CartContext'
import { handleImageError } from '../utils/images'

const formatPrice = (price) =>
    new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
    }).format(Number(price) || 0)

function Cart() {
    const {
        items,
        cartCount,
        subtotal,
        shipping,
        total,
        updateQuantity,
        removeItem,
    } = useCart()

    const hasUnavailableItems = items.some(({ product, quantity }) =>
        Number(product.stock_quantity) < quantity || Number(product.stock_quantity) <= 0,
    )
    const remainingForFreeShipping = Math.max(0, 1999 - subtotal)
    const shippingProgress = Math.min(100, (subtotal / 1999) * 100)

    return (
        <div className="min-h-screen bg-white text-neutral-900">
            <div className="bg-[#153d35] px-4 py-2 text-center text-[10px] font-medium tracking-[0.14em] text-white sm:text-xs">
                FREE SHIPPING ON ORDERS OF ₹1,999 OR MORE
            </div>

            <Navbar
                cartCount={cartCount}
                wishlistCount={0}
                search=""
                onSearchChange={() => { }}
            />

            <main className="mx-auto min-h-[65vh] max-w-[1440px] px-5 py-10 sm:px-8 sm:py-14 lg:px-12">
                <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-neutral-200 pb-6">
                    <div>
                        <p className="text-[10px] font-semibold tracking-[0.2em] text-[#18705c]">
                            YOUR SELECTION
                        </p>
                        <h1 className="mt-2 text-3xl font-medium tracking-tight sm:text-4xl">
                            Shopping bag
                        </h1>
                        <p className="mt-2 text-sm text-neutral-500">
                            {cartCount} {cartCount === 1 ? 'item' : 'items'} in your bag
                        </p>
                    </div>

                    <Link
                        to="/shop"
                        className="inline-flex items-center gap-2 text-xs font-semibold transition hover:text-[#18705c]"
                    >
                        CONTINUE SHOPPING <ArrowRight size={15} />
                    </Link>
                </div>

                {items.length === 0 ? (
                    <div className="flex min-h-[350px] flex-col items-center justify-center py-12 text-center">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#f4f5f1]">
                            <ShoppingBag size={30} strokeWidth={1.4} />
                        </div>

                        <h2 className="mt-6 text-2xl font-medium">
                            Your bag is taking a break.
                        </h2>

                        <p className="mt-3 max-w-sm text-sm leading-6 text-neutral-500">
                            Discover something you love and it will appear here.
                        </p>

                        <Link
                            to="/shop"
                            className="mt-7 inline-flex items-center gap-3 bg-[#153d35] px-7 py-4 text-xs font-semibold tracking-widest text-white transition hover:bg-[#0f302a]"
                        >
                            EXPLORE THE COLLECTION <ArrowRight size={15} />
                        </Link>
                    </div>
                ) : (
                    <div className="grid items-start gap-10 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px]">
                        <section>
                            <div className="mb-4 hidden grid-cols-[1fr_100px_100px] gap-4 border-b border-neutral-200 pb-3 text-[10px] font-semibold tracking-widest text-neutral-400 sm:grid">
                                <span>PRODUCT</span>
                                <span className="text-center">QUANTITY</span>
                                <span className="text-right">TOTAL</span>
                            </div>

                            <div className="divide-y divide-neutral-200">
                                {items.map(({ product, quantity }) => {
                                    const stock = Math.max(
                                        0,
                                        Number(product.stock_quantity) || 0,
                                    )
                                    const maxQuantity = Math.min(stock, 10)

                                    return (
                                        <article
                                            key={product.id}
                                            className="grid grid-cols-[88px_1fr] gap-4 py-5 sm:grid-cols-[112px_1fr] sm:gap-5"
                                        >
                                            <Link
                                                to={`/products/${product.slug}`}
                                                className="aspect-[4/5] overflow-hidden rounded-xl bg-[#f4f3ee]"
                                            >
                                                <img
                                                src={product.image_url || '/product-placeholder.svg'}
                                                alt={product.name}
                                                onError={handleImageError}
                                                className="h-full w-full object-contain p-2 transition duration-500 hover:scale-[1.03]"
                                                />
                                            </Link>

                                            <div className="min-w-0">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        {product.brand && (
                                                            <p className="text-[10px] uppercase tracking-widest text-neutral-400">
                                                                {product.brand}
                                                            </p>
                                                        )}

                                                        <Link
                                                            to={`/products/${product.slug}`}
                                                            className="mt-1 block text-sm font-medium leading-5 hover:text-[#18705c] sm:text-base"
                                                        >
                                                            {product.name}
                                                        </Link>
                                                    </div>

                                                    <p className="shrink-0 text-sm font-semibold sm:hidden">
                                                        {formatPrice(Number(product.price) * quantity)}
                                                    </p>
                                                </div>

                                                <p className="mt-2 text-sm text-neutral-500">
                                                    {formatPrice(product.price)} each
                                                </p>

                                                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                                                    <div className="flex h-9 items-center border border-neutral-200">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                updateQuantity(product.id, quantity - 1)
                                                            }
                                                            disabled={quantity <= 1}
                                                            aria-label={`Decrease ${product.name} quantity`}
                                                            className="flex h-full w-9 items-center justify-center disabled:opacity-30"
                                                        >
                                                            <Minus size={13} />
                                                        </button>

                                                        <span className="w-8 text-center text-xs">
                                                            {quantity}
                                                        </span>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                updateQuantity(product.id, quantity + 1)
                                                            }
                                                            disabled={quantity >= maxQuantity}
                                                            aria-label={`Increase ${product.name} quantity`}
                                                            className="flex h-full w-9 items-center justify-center disabled:opacity-30"
                                                        >
                                                            <Plus size={13} />
                                                        </button>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => removeItem(product.id)}
                                                        className="inline-flex items-center gap-1.5 text-xs text-neutral-500 transition hover:text-red-600"
                                                    >
                                                        <Trash2 size={14} />
                                                        Remove
                                                    </button>
                                                </div>

                                                {stock === 0 && (
                                                    <p className="mt-3 text-xs text-red-600">
                                                        This item is currently out of stock. Remove it before checkout.
                                                    </p>
                                                )}

                                                {stock > 0 && quantity > stock && (
                                                    <p className="mt-3 text-xs text-orange-600">
                                                        Stock has changed. Update the quantity before checkout.
                                                    </p>
                                                )}
                                            </div>

                                            <div className="hidden text-right text-sm font-semibold sm:block">
                                                {formatPrice(Number(product.price) * quantity)}
                                            </div>
                                        </article>
                                    )
                                })}
                            </div>

                            <Link
                                to="/shop"
                                className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-neutral-500 transition hover:text-[#18705c]"
                            >
                                <ArrowLeft size={14} />
                                KEEP EXPLORING
                            </Link>
                        </section>

                        <aside className="border border-neutral-200 p-5 sm:p-7 lg:sticky lg:top-6">
                            <h2 className="text-lg font-medium">Order summary</h2>

                            <div className="mt-6 border-b border-neutral-200 pb-6">
                                <div className="flex justify-between gap-4 text-sm">
                                    <span className="text-neutral-500">Subtotal</span>
                                    <span className="font-medium">{formatPrice(subtotal)}</span>
                                </div>

                                <div className="mt-4 flex justify-between gap-4 text-sm">
                                    <span className="text-neutral-500">Shipping</span>
                                    <span className="font-medium">
                                        {shipping === 0 ? 'FREE' : formatPrice(shipping)}
                                    </span>
                                </div>

                                <div className="mt-6">
                                    <div className="mb-2 flex items-center gap-2 text-xs">
                                        <Truck size={15} className="text-[#18705c]" />
                                        {remainingForFreeShipping > 0 ? (
                                            <span>
                                                Add{' '}
                                                <strong>
                                                    {formatPrice(remainingForFreeShipping)}
                                                </strong>{' '}
                                                for free shipping
                                            </span>
                                        ) : (
                                            <span className="font-medium text-[#18705c]">
                                                You've unlocked free shipping!
                                            </span>
                                        )}
                                    </div>

                                    <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
                                        <div
                                            className="h-full bg-[#18705c] transition-all"
                                            style={{ width: `${shippingProgress}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between gap-4 py-5">
                                <span className="text-sm font-semibold">Estimated total</span>
                                <span className="text-lg font-semibold">
                                    {formatPrice(total)}
                                </span>
                            </div>

                            <Link
                                to="/checkout"
                                aria-disabled={hasUnavailableItems}
                                onClick={(event) => {
                                    if (hasUnavailableItems) event.preventDefault()
                                }}
                                className={`flex w-full items-center justify-center gap-3 px-5 py-4 text-xs font-semibold tracking-widest text-white transition ${hasUnavailableItems
                                    ? 'cursor-not-allowed bg-neutral-300'
                                    : 'bg-[#153d35] hover:bg-[#0f302a]'}`}
                            >
                                PROCEED TO CHECKOUT <ArrowRight size={15} />
                            </Link>

                            <div className="mt-5 flex items-start gap-2 text-xs leading-5 text-neutral-500">
                                <ShieldCheck size={16} className="mt-0.5 shrink-0" />
                                <p>
                                    Your order total is shown before checkout. Current stock and
                                    prices are confirmed securely when you place the order.
                                </p>
                            </div>
                        </aside>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    )
}

export default Cart