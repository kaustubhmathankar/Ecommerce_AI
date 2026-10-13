import { useEffect, useState } from 'react'

import {
    useMutation,
    useQuery,
} from '@tanstack/react-query'

import {
    ArrowDownRight,
    ArrowRight,
    ArrowUpRight,
    Check,
    PackageSearch,
    Sparkles,
} from 'lucide-react'

import {
    Link,
} from 'react-router-dom'

import {
    getCategories,
    getProducts,
} from '../api/products'

import {
    subscribeToNewsletter,
} from '../api/newsletter'

import {
    getApiErrorMessage,
} from '../api/client'

import {
    useCart,
} from '../context/CartContext'

import {
    useWishlist,
} from '../context/WishlistContext'

import Footer from '../components/layout/Footer'
import Navbar from '../components/layout/Navbar'
import ProductGrid from '../components/product/ProductGrid'

import {
    handleImageError,
} from '../utils/images'


function Home() {

    // ==========================================================
    // STATE
    // ==========================================================

    const [
        search,
        setSearch,
    ] = useState('')


    const [
        heroSlide,
        setHeroSlide,
    ] = useState(0)


    const [
        newsletterEmail,
        setNewsletterEmail,
    ] = useState('')


    // ==========================================================
    // CART
    // ==========================================================

    const {
        addItem,
    } = useCart()


    // ==========================================================
    // WISHLIST
    // ==========================================================

    const {
        productIds: wishlist,
        toggleWishlist,
    } = useWishlist()


    // ==========================================================
    // NEWSLETTER
    // ==========================================================

    const newsletterMutation =
        useMutation({

            mutationFn:
                subscribeToNewsletter,

            onSuccess:
                () =>
                    setNewsletterEmail(''),

        })


    // ==========================================================
    // ALL PRODUCTS
    // ==========================================================

    const productsQuery =
        useQuery({

            queryKey:
                [
                    'products',
                ],

            queryFn:
                () =>
                    getProducts({

                        page:
                            1,

                        limit:
                            20,

                        sortBy:
                            'newest',

                    }),

        })


    // ==========================================================
    // HERO FEATURED PRODUCTS
    //
    // This is a separate request so the hero is not limited
    // to whatever products happen to be inside the first
    // 20 products returned by the normal products query.
    // ==========================================================

    const heroProductsQuery =
        useQuery({

            queryKey:
                [
                    'home-featured-products',
                ],

            queryFn:
                () =>
                    getProducts({

                        page:
                            1,

                        limit:
                            8,

                        featured:
                            true,

                        sortBy:
                            'newest',

                    }),

        })


    // ==========================================================
    // CATEGORIES
    // ==========================================================

    const categoriesQuery =
        useQuery({

            queryKey:
                [
                    'categories',
                ],

            queryFn:
                getCategories,

        })


    // ==========================================================
    // DATA
    // ==========================================================

    const products =
        productsQuery.data?.items ??
        []


    const categories =
        categoriesQuery.data ??
        []


    const heroProducts =
        heroProductsQuery.data?.items ??
        []


    // ==========================================================
    // SEARCH
    // ==========================================================

    const filteredProducts =
        products.filter(
            (
                product,
            ) => {

                const searchText =
                    search
                        .trim()
                        .toLowerCase()


                if (
                    !searchText
                ) {
                    return true
                }


                return (

                    product.name
                        ?.toLowerCase()
                        .includes(
                            searchText,
                        )

                    ||

                    product.brand
                        ?.toLowerCase()
                        .includes(
                            searchText,
                        )

                    ||

                    product.short_description
                        ?.toLowerCase()
                        .includes(
                            searchText,
                        )

                )
            },
        )


    // ==========================================================
    // FEATURED PRODUCTS
    //
    // Used by the normal product section.
    // ==========================================================

    const featuredProducts =
        products
            .filter(
                (
                    product,
                ) =>
                    product.is_featured,
            )
            .slice(
                0,
                8,
            )


    // ==========================================================
    // PRODUCTS TO DISPLAY
    // ==========================================================

    const displayProducts =
        search.trim()

            ? filteredProducts

            : featuredProducts.length

                ? featuredProducts

                : products.slice(
                    0,
                    8,
                )


    // ==========================================================
    // CURRENT HERO PRODUCT
    // ==========================================================

    const heroProduct =
        heroProducts[
        heroSlide
        ] ||

        products.find(
            (
                product,
            ) =>
                product.image_url,
        ) ||

        null


    // ==========================================================
    // HERO AUTO SLIDER
    // ==========================================================

    useEffect(
        () => {

            if (
                heroProducts.length <= 1
            ) {
                return
            }


            const interval =
                setInterval(
                    () => {

                        setHeroSlide(
                            (
                                current,
                            ) =>
                                current >=
                                    heroProducts.length - 1

                                    ? 0

                                    : current + 1,
                        )

                    },
                    5000,
                )


            return () =>
                clearInterval(
                    interval,
                )

        },
        [
            heroProducts.length,
        ],
    )


    // ==========================================================
    // KEEP SLIDE INDEX VALID
    // ==========================================================

    useEffect(
        () => {

            if (
                heroSlide >=
                heroProducts.length
            ) {

                setHeroSlide(0)

            }

        },
        [
            heroProducts.length,
            heroSlide,
        ],
    )


    // ==========================================================
    // HERO NAVIGATION
    // ==========================================================

    const previousHero =
        () => {

            setHeroSlide(
                (
                    current,
                ) =>

                    current === 0

                        ? heroProducts.length - 1

                        : current - 1,
            )

        }


    const nextHero =
        () => {

            setHeroSlide(
                (
                    current,
                ) =>

                    current ===
                        heroProducts.length - 1

                        ? 0

                        : current + 1,
            )

        }


    // ==========================================================
    // CART
    // ==========================================================

    const addToCart =
        (
            product,
        ) =>
            addItem(
                product,
            )


    return (

        <div className="home-page min-h-screen bg-[#fbfaf7] text-neutral-900">

            {/* ==================================================
                ANNOUNCEMENT BAR
            ================================================== */}

            <div className="flex min-h-9 items-center justify-center bg-[#153d35] px-4 py-2 text-center text-[9px] font-semibold uppercase tracking-[0.18em] text-white sm:text-[10px]">

                <span>
                    Free delivery on orders of ₹1,999 or more
                </span>

                <span className="mx-2 text-white/40">
                    ·
                </span>

                <span className="hidden sm:inline">
                    Cash on delivery available
                </span>

            </div>


            {/* ==================================================
                NAVBAR
            ================================================== */}

            <Navbar
                search={
                    search
                }
                onSearchChange={
                    setSearch
                }
                showSearch
            />


            <main>

                {/* ==================================================
                    HERO
                ================================================== */}

                <section className="home-hero mx-auto max-w-[1480px] px-4 pt-4 sm:px-6 lg:px-10 lg:pt-6">

                    <div className="home-hero__panel relative grid overflow-hidden rounded-[30px] border border-[#dddcd4] bg-[#e9e7de] shadow-[0_28px_80px_rgba(28,42,34,0.09)] lg:min-h-[620px] lg:grid-cols-[1.03fr_0.97fr]">

                        {/* ==================================================
                            HERO LEFT
                        ================================================== */}

                        <div className="relative z-10 flex flex-col justify-center px-6 py-14 sm:px-10 lg:px-16 lg:py-20">

                            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#153d35]/15 bg-white/65 px-3.5 py-2 text-[9px] font-semibold uppercase tracking-[0.17em] text-[#153d35] backdrop-blur sm:text-[10px]">

                                <Sparkles
                                    size={13}
                                />

                                The ShopSphere edit

                            </div>


                            <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#6c776f]">

                                Curated for everyday life

                            </p>


                            <h1 className="mt-4 max-w-2xl text-[52px] font-medium leading-[0.94] tracking-[-0.07em] text-[#19251f] sm:text-[67px] lg:text-[78px]">

                                Everyday, a little more{' '}

                                <span className="font-serif italic text-[#587565]">

                                    considered.

                                </span>

                            </h1>


                            <p className="mt-6 max-w-xl text-sm leading-7 text-[#5d6862] sm:text-base">

                                Discover useful things, beautiful things, and a few things you did not know you needed. Everything in one thoughtful place.

                            </p>


                            <div className="mt-8 flex flex-wrap items-center gap-3">

                                <Link
                                    to="/shop"
                                    className="group inline-flex min-h-12 items-center gap-7 rounded-full bg-[#153d35] px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-white shadow-[0_14px_30px_rgba(21,61,53,0.18)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#1d5044]"
                                >

                                    Explore the shop

                                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 transition group-hover:bg-white/20">

                                        <ArrowRight
                                            size={14}
                                        />

                                    </span>

                                </Link>


                                <a
                                    href="#categories"
                                    className="inline-flex min-h-12 items-center rounded-full border border-[#153d35]/20 bg-white/35 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.11em] text-[#153d35] transition hover:bg-white/75"
                                >

                                    Browse categories

                                </a>

                            </div>


                            <div className="mt-9 flex flex-wrap items-center gap-5 text-[10px] font-medium text-[#69746d]">

                                <span className="inline-flex items-center gap-2">

                                    <Check
                                        size={13}
                                        className="text-[#18705c]"
                                    />

                                    Carefully selected

                                </span>


                                <span className="inline-flex items-center gap-2">

                                    <Check
                                        size={13}
                                        className="text-[#18705c]"
                                    />

                                    Secure checkout

                                </span>

                            </div>

                        </div>


                        {/* ==================================================
                            HERO RIGHT
                        ================================================== */}

                        <div className="home-hero__art relative hidden min-h-[620px] overflow-hidden lg:block">

                            <div className="absolute -right-24 -top-24 h-[340px] w-[340px] rounded-full bg-[#d7ddd3]" />

                            <div className="absolute -bottom-24 -left-16 h-[280px] w-[280px] rounded-full bg-[#d5ddd5]" />


                            <div className="absolute right-[10%] top-[10%] h-[78%] w-[76%] overflow-hidden rounded-[34px] border border-white/70 bg-[#f8f7f2]/75 shadow-[0_28px_65px_rgba(35,54,43,0.15)] backdrop-blur-sm">

                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.95),transparent_33%),radial-gradient(circle_at_80%_80%,rgba(213,224,215,0.55),transparent_36%)]" />


                                {/* HEADER */}

                                <div className="absolute left-7 right-7 top-6 z-20 flex items-center justify-between">

                                    <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#63716a]">

                                        ShopSphere

                                    </span>


                                    <span className="rounded-full border border-[#153d35]/10 bg-white/75 px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.12em] text-[#557565]">

                                        Featured

                                    </span>

                                </div>


                                {/* PRODUCT */}

                                {heroProduct ? (

                                    <>

                                        <div className="absolute inset-x-8 bottom-24 top-20 flex items-center justify-center">

                                            <img
                                                key={
                                                    heroProduct.id
                                                }
                                                src={
                                                    heroProduct.image_url
                                                }
                                                alt={
                                                    heroProduct.name
                                                }
                                                onError={
                                                    handleImageError
                                                }
                                                className="h-full w-full object-contain p-8 drop-shadow-[0_22px_30px_rgba(15,23,42,0.13)] transition duration-500 hover:scale-105"
                                            />

                                        </div>


                                        {/* PRODUCT INFORMATION */}

                                        <div className="absolute bottom-[74px] left-7 right-7">

                                            <div className="flex items-end justify-between gap-3 border-t border-[#153d35]/10 pt-4">

                                                <div className="min-w-0">

                                                    <p className="truncate text-[9px] font-semibold uppercase tracking-[0.14em] text-[#7b847e]">

                                                        {
                                                            heroProduct.brand ||
                                                            'ShopSphere pick'
                                                        }

                                                    </p>


                                                    <p className="mt-1 truncate text-sm font-medium text-[#26392f]">

                                                        {
                                                            heroProduct.name
                                                        }

                                                    </p>


                                                    <p className="mt-1 text-xs font-semibold text-[#18705c]">

                                                        ₹
                                                        {Number(
                                                            heroProduct.price ||
                                                            0,
                                                        ).toLocaleString(
                                                            'en-IN',
                                                        )}

                                                    </p>

                                                </div>


                                                <Link
                                                    to={`/products/${heroProduct.slug}`}
                                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#153d35] text-white transition hover:bg-[#24584b]"
                                                    aria-label="View featured product"
                                                >

                                                    <ArrowUpRight
                                                        size={15}
                                                    />

                                                </Link>

                                            </div>

                                        </div>

                                    </>

                                ) : (

                                    <div className="flex h-full items-center justify-center text-[#557565]">

                                        <PackageSearch
                                            size={70}
                                            strokeWidth={1.1}
                                        />

                                    </div>

                                )}


                                {/* ==================================================
                                    HERO CONTROLS
                                ================================================== */}

                                {heroProducts.length > 1 && (

                                    <div className="absolute bottom-5 left-7 right-7 z-30 flex items-center justify-between gap-3">

                                        <button
                                            type="button"
                                            onClick={
                                                previousHero
                                            }
                                            aria-label="Previous featured product"
                                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#153d35]/15 bg-white/80 text-[#153d35] shadow-sm backdrop-blur transition hover:bg-white hover:shadow-md"
                                        >

                                            ←

                                        </button>


                                        <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5">

                                            {heroProducts.map(
                                                (
                                                    product,
                                                    index,
                                                ) => (

                                                    <button
                                                        key={
                                                            product.id
                                                        }
                                                        type="button"
                                                        onClick={() =>
                                                            setHeroSlide(
                                                                index,
                                                            )
                                                        }
                                                        aria-label={`Show featured product ${index + 1}`}
                                                        className={`h-1.5 rounded-full transition-all duration-300 ${heroSlide ===
                                                                index

                                                                ? 'w-7 bg-[#153d35]'

                                                                : 'w-1.5 bg-[#153d35]/25 hover:bg-[#153d35]/45'
                                                            }`}
                                                    />

                                                ),
                                            )}

                                        </div>


                                        <button
                                            type="button"
                                            onClick={
                                                nextHero
                                            }
                                            aria-label="Next featured product"
                                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#153d35]/15 bg-white/80 text-[#153d35] shadow-sm backdrop-blur transition hover:bg-white hover:shadow-md"
                                        >

                                            →

                                        </button>

                                    </div>

                                )}

                            </div>


                            {/* DECORATION */}

                            <div className="absolute bottom-[8%] left-[6%] flex h-[84px] w-[84px] items-center justify-center rounded-full border border-white/70 bg-[#d8e0d6] text-[#416453] shadow-[0_16px_35px_rgba(35,54,43,0.15)]">

                                <PackageSearch
                                    size={31}
                                    strokeWidth={1.2}
                                />

                            </div>


                            <div className="absolute bottom-[10%] right-[4%] rounded-full border border-[#153d35]/10 bg-white/75 px-4 py-2.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#5c7065] shadow-sm backdrop-blur">

                                Good things, daily.

                            </div>

                        </div>

                    </div>

                </section>


                {/* ==================================================
                    TRUST STRIP
                ================================================== */}

                <section className="mx-auto max-w-[1480px] px-5 py-7 sm:px-6 sm:py-10 lg:px-10">

                    <div className="home-trust-panel grid overflow-hidden rounded-[22px] border border-neutral-200 bg-white sm:grid-cols-4">

                        {[
                            [
                                '01',
                                'Free delivery',
                                'On orders of ₹1,999 or more.',
                            ],
                            [
                                '02',
                                'Cash on delivery',
                                'Pay when your order arrives.',
                            ],
                            [
                                '03',
                                'Saved favourites',
                                'Keep your picks in one place.',
                            ],
                            [
                                '04',
                                'Easy order tracking',
                                'Follow purchases from your account.',
                            ],
                        ].map(
                            (
                                [
                                    number,
                                    title,
                                    description,
                                ],
                            ) => (

                                <div
                                    key={
                                        number
                                    }
                                    className="border-b border-neutral-100 px-5 py-5 last:border-0 sm:border-b-0 sm:border-r sm:last:border-r-0 sm:px-6"
                                >

                                    <span className="text-[9px] font-semibold tracking-[0.18em] text-[#18705c]">

                                        {
                                            number
                                        }

                                    </span>


                                    <h2 className="mt-2 text-sm font-semibold tracking-[-0.01em] sm:text-[15px]">

                                        {
                                            title
                                        }

                                    </h2>


                                    <p className="mt-1 text-xs leading-5 text-neutral-500">

                                        {
                                            description
                                        }

                                    </p>

                                </div>

                            ),
                        )}

                    </div>

                </section>


                {/* ==================================================
                    CATEGORIES
                ================================================== */}

                <section
                    id="categories"
                    className="home-categories mx-auto max-w-[1480px] px-5 py-10 sm:px-6 sm:py-14 lg:px-10"
                >

                    <div className="mb-7 flex items-end justify-between gap-4 sm:mb-9">

                        <div>

                            <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-[#18705c]">

                                Shop by category

                            </p>


                            <h2 className="mt-2 text-3xl font-medium tracking-[-0.055em] sm:text-4xl">

                                Find your next favourite.

                            </h2>


                            <p className="mt-2 max-w-lg text-sm leading-6 text-neutral-500">

                                Start with what you are looking for, or browse a collection and see where it takes you.

                            </p>

                        </div>


                        <Link
                            to="/shop"
                            className="hidden items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-700 transition hover:border-[#b7c8bd] hover:text-[#153d35] sm:inline-flex"
                        >

                            View all

                            <ArrowRight
                                size={14}
                            />

                        </Link>

                    </div>


                    {categoriesQuery.isLoading ? (

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-5">

                            {[
                                1,
                                2,
                                3,
                                4,
                            ].map(
                                (
                                    item,
                                ) => (

                                    <div
                                        key={
                                            item
                                        }
                                        className="aspect-[4/5] animate-pulse rounded-[22px] bg-neutral-200"
                                    />

                                ),
                            )}

                        </div>

                    ) : categoriesQuery.isError ? (

                        <div
                            role="alert"
                            className="rounded-[22px] border border-red-100 bg-red-50 p-8 text-center"
                        >

                            <p className="text-sm font-medium text-red-900">

                                Unable to load collections.

                            </p>


                            <button
                                type="button"
                                onClick={() =>
                                    categoriesQuery.refetch()
                                }
                                className="mt-4 rounded-full bg-[#153d35] px-5 py-2.5 text-xs font-semibold text-white"
                            >

                                Try again

                            </button>

                        </div>

                    ) : categories.length ? (

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 xl:grid-cols-4">

                            {categories
                                .slice(
                                    0,
                                    8,
                                )
                                .map(
                                    (
                                        category,
                                    ) => (

                                        <Link
                                            key={
                                                category.id
                                            }
                                            to={`/shop?categoryId=${category.id}`}
                                            className="group min-w-0"
                                        >

                                            <div className="home-category-card relative aspect-[4/5] overflow-hidden rounded-[24px] bg-neutral-100">

                                                {category.image_url ? (

                                                    <img
                                                        src={
                                                            category.image_url
                                                        }
                                                        alt={
                                                            category.name
                                                        }
                                                        loading="lazy"
                                                        onError={
                                                            handleImageError
                                                        }
                                                        className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-105"
                                                    />

                                                ) : (

                                                    <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,#e8ece5,#dce3db_58%,#cbd6cd)] text-[#557565]">

                                                        <PackageSearch
                                                            size={48}
                                                            strokeWidth={1.1}
                                                        />

                                                    </div>

                                                )}


                                                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent" />


                                                <div className="absolute inset-x-4 bottom-4 text-white sm:inset-x-5 sm:bottom-5">

                                                    <div className="flex items-end justify-between gap-3">

                                                        <div className="min-w-0">

                                                            <h3 className="truncate text-lg font-medium tracking-[-0.02em] sm:text-xl">

                                                                {
                                                                    category.name
                                                                }

                                                            </h3>


                                                            {category.description && (

                                                                <p className="mt-1 line-clamp-2 text-[10px] leading-5 text-white/75 sm:text-xs">

                                                                    {
                                                                        category.description
                                                                    }

                                                                </p>

                                                            )}

                                                        </div>


                                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/90 text-neutral-800 transition duration-300 group-hover:bg-[#bc0019] group-hover:text-white">

                                                            <ArrowDownRight
                                                                size={15}
                                                            />

                                                        </span>

                                                    </div>

                                                </div>

                                            </div>

                                        </Link>

                                    ),
                                )}

                        </div>

                    ) : (

                        <div className="rounded-[22px] border border-dashed border-neutral-300 px-5 py-12 text-center">

                            <PackageSearch
                                size={28}
                                className="mx-auto text-[#557565]"
                            />


                            <p className="mt-3 text-sm font-medium">

                                Collections are coming soon.

                            </p>


                            <Link
                                to="/shop"
                                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#18705c]"
                            >

                                Browse all products

                                <ArrowRight
                                    size={14}
                                />

                            </Link>

                        </div>

                    )}

                </section>


                {/* ==================================================
                    FEATURED PRODUCTS
                ================================================== */}

                <section
                    id="featured"
                    className="home-featured bg-[#f0efe9]"
                >

                    <div className="mx-auto max-w-[1480px] px-5 py-14 sm:px-6 sm:py-20 lg:px-10">

                        <div className="mb-8 flex flex-wrap items-end justify-between gap-4 sm:mb-10">

                            <div>

                                <div className="inline-flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.23em] text-[#18705c]">

                                    <Sparkles
                                        size={13}
                                    />

                                    The collection

                                </div>


                                <h2 className="mt-3 text-3xl font-medium tracking-[-0.055em] sm:text-4xl">

                                    {
                                        search.trim()

                                            ? 'Search results.'

                                            : featuredProducts.length

                                                ? 'Featured in the shop.'

                                                : 'The latest in the shop.'
                                    }

                                </h2>


                                <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-500">

                                    {
                                        search.trim()

                                            ? 'Products matching your current search.'

                                            : featuredProducts.length

                                                ? 'A selection chosen to stand out.'

                                                : 'Recently added products from the current catalog.'
                                    }

                                </p>

                            </div>


                            <Link
                                to="/shop"
                                className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#153d35] transition hover:gap-3"
                            >

                                Shop all products

                                <ArrowRight
                                    size={14}
                                />

                            </Link>

                        </div>


                        <div
                            id="shop"
                            className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 sm:gap-y-12 lg:grid-cols-4"
                        >

                            {productsQuery.isLoading && (

                                <>

                                    {[
                                        1,
                                        2,
                                        3,
                                        4,
                                    ].map(
                                        (
                                            item,
                                        ) => (

                                            <div
                                                key={
                                                    item
                                                }
                                                className="animate-pulse"
                                            >

                                                <div className="aspect-[4/5] rounded-[24px] bg-neutral-200" />

                                                <div className="mt-4 h-2.5 w-1/3 rounded bg-neutral-200" />

                                                <div className="mt-2 h-4 w-3/4 rounded bg-neutral-200" />

                                                <div className="mt-3 h-3 w-1/4 rounded bg-neutral-200" />

                                            </div>

                                        ),
                                    )}

                                </>

                            )}


                            {productsQuery.isError && (

                                <div className="col-span-full rounded-[22px] border border-red-100 bg-red-50 p-8 text-center">

                                    <h3 className="font-medium text-red-900">

                                        Unable to load products

                                    </h3>


                                    <p className="mt-2 text-sm text-red-700">

                                        {
                                            getApiErrorMessage(
                                                productsQuery.error,
                                                'Unable to load products right now.',
                                            )
                                        }

                                    </p>


                                    <button
                                        type="button"
                                        onClick={() =>
                                            productsQuery.refetch()
                                        }
                                        className="mt-5 rounded-full bg-[#153d35] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-white"
                                    >

                                        Try again

                                    </button>

                                </div>

                            )}


                            {!productsQuery.isLoading &&
                                !productsQuery.isError && (

                                    <ProductGrid
                                        products={
                                            displayProducts
                                        }
                                        wishlist={
                                            wishlist
                                        }
                                        onWishlist={
                                            toggleWishlist
                                        }
                                        onAddToCart={
                                            addToCart
                                        }
                                    />

                                )}

                        </div>


                        {!productsQuery.isLoading &&
                            !productsQuery.isError &&
                            search.trim() && (

                                <div className="mt-8 text-center">

                                    <p className="text-xs text-neutral-500">

                                        Showing results for{' '}

                                        <span className="font-semibold text-neutral-800">

                                            "{search}"

                                        </span>

                                    </p>

                                </div>

                            )}

                    </div>

                </section>


                {/* ==================================================
                    STORY
                ================================================== */}

                <section
                    id="story"
                    className="home-story mx-auto max-w-[1480px] px-5 py-16 sm:px-6 sm:py-20 lg:px-10"
                >

                    <div className="home-story__panel grid gap-10 rounded-[30px] border border-[#dfe2da] bg-[#e7ebe4] p-7 sm:p-10 md:grid-cols-[0.8fr_1.2fr] md:items-center lg:p-14">

                        <div>

                            <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-[#18705c]">

                                A better way to browse

                            </p>


                            <h2 className="mt-4 max-w-lg text-4xl font-medium leading-[1.04] tracking-[-0.06em] sm:text-5xl">

                                Discover your next{' '}

                                <span className="font-serif italic text-[#557565]">

                                    everyday favourite.

                                </span>

                            </h2>


                            <p className="mt-5 max-w-md text-sm leading-7 text-[#66716a]">

                                ShopSphere is built around a simple idea: useful products, thoughtful discovery, and an easier way to keep track of what matters to you.

                            </p>


                            <Link
                                to="/shop"
                                className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#153d35] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-white transition hover:bg-[#24584b]"
                            >

                                Start exploring

                                <ArrowRight
                                    size={14}
                                />

                            </Link>

                        </div>


                        <div className="grid gap-3 sm:grid-cols-3">

                            {[
                                [
                                    '01',
                                    'Explore',
                                    'Browse collections and products in one place.',
                                ],
                                [
                                    '02',
                                    'Save',
                                    'Keep the products you like in your wishlist.',
                                ],
                                [
                                    '03',
                                    'Enjoy',
                                    'Check out simply and follow your orders.',
                                ],
                            ].map(
                                (
                                    [
                                        number,
                                        title,
                                        description,
                                    ],
                                ) => (

                                    <div
                                        key={
                                            number
                                        }
                                        className="home-story__step rounded-[20px] border border-[#153d35]/10 bg-white/75 p-5 shadow-sm"
                                    >

                                        <span className="text-[9px] font-semibold tracking-[0.16em] text-[#18705c]">

                                            {
                                                number
                                            }

                                        </span>


                                        <h3 className="mt-5 text-base font-semibold text-[#25342c]">

                                            {
                                                title
                                            }

                                        </h3>


                                        <p className="mt-2 text-xs leading-5 text-[#68736d]">

                                            {
                                                description
                                            }

                                        </p>

                                    </div>

                                ),
                            )}

                        </div>

                    </div>

                </section>


                {/* ==================================================
                    NEWSLETTER
                ================================================== */}

                <section className="relative overflow-hidden bg-[#153d35] px-5 py-14 text-white sm:px-8 sm:py-18">

                    <div className="absolute -left-16 -top-20 h-56 w-56 rounded-full border border-white/10" />

                    <div className="absolute -bottom-24 -right-10 h-64 w-64 rounded-full border border-white/10" />


                    <div className="relative mx-auto max-w-xl text-center">

                        <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-white/60">

                            Good finds in your inbox

                        </p>


                        <h2 className="mt-3 text-3xl font-medium tracking-[-0.05em] sm:text-4xl">

                            A little more good in your day.

                        </h2>


                        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/65">

                            New arrivals, thoughtful picks and the occasional little surprise.

                        </p>


                        <form
                            className="mx-auto mt-7 flex max-w-md flex-col gap-2 sm:flex-row"
                            onSubmit={
                                (
                                    event,
                                ) => {

                                    event.preventDefault()

                                    newsletterMutation.mutate(
                                        newsletterEmail,
                                    )

                                }
                            }
                        >

                            <input
                                type="email"
                                value={
                                    newsletterEmail
                                }
                                onChange={
                                    (
                                        event,
                                    ) =>
                                        setNewsletterEmail(
                                            event
                                                .target
                                                .value,
                                        )
                                }
                                required
                                placeholder="Your email address"
                                aria-label="Email address"
                                className="min-w-0 flex-1 rounded-xl border border-white/20 bg-white/10 px-4 py-3.5 text-sm text-white outline-none placeholder:text-white/40 focus:border-white/55 focus:bg-white/[0.13]"
                            />


                            <button
                                type="submit"
                                disabled={
                                    newsletterMutation.isPending
                                }
                                className="shrink-0 rounded-xl bg-white px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#153d35] transition hover:bg-[#e5efe9] disabled:cursor-wait disabled:opacity-70"
                            >

                                {
                                    newsletterMutation.isPending

                                        ? 'Subscribing…'

                                        : 'Sign me up'
                                }

                            </button>

                        </form>


                        {
                            newsletterMutation.isSuccess && (

                                <p
                                    role="status"
                                    className="mx-auto mt-3 max-w-md text-sm text-emerald-100"
                                >

                                    {
                                        newsletterMutation
                                            .data
                                            .message
                                    }

                                </p>

                            )
                        }


                        {
                            newsletterMutation.isError && (

                                <p
                                    role="alert"
                                    className="mx-auto mt-3 max-w-md text-sm text-rose-100"
                                >

                                    {
                                        getApiErrorMessage(
                                            newsletterMutation.error,
                                            'Unable to subscribe right now. Please try again.',
                                        )
                                    }

                                </p>

                            )
                        }

                    </div>

                </section>

            </main>


            <Footer />

        </div>

    )
}


export default Home