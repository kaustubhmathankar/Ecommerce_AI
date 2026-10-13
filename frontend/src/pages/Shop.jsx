import { useEffect, useMemo, useState } from 'react'
import {
    Check,
    ChevronDown,
    SlidersHorizontal,
    X,
    RotateCcw,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'

import {
    getCategories,
    getProductFilterOptions,
    getProducts,
} from '../api/products'

import { getApiErrorMessage } from '../api/client'
import { useCart } from '../context/CartContext'
import { useWishlist } from '../context/WishlistContext'

import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import ProductGrid from '../components/product/ProductGrid'

const SORT_OPTIONS = [
    {
        value: 'newest',
        label: 'Newest',
    },
    {
        value: 'featured',
        label: 'Featured',
    },
    {
        value: 'discount',
        label: 'Biggest Discount',
    },
    {
        value: 'price_asc',
        label: 'Price: Low to High',
    },
    {
        value: 'price_desc',
        label: 'Price: High to Low',
    },
    {
        value: 'name_asc',
        label: 'Name: A to Z',
    },
    {
        value: 'oldest',
        label: 'Oldest',
    },
]

const DISCOUNT_OPTIONS = [
    {
        value: '',
        label: 'Any discount',
    },
    {
        value: '10',
        label: '10% or more',
    },
    {
        value: '20',
        label: '20% or more',
    },
    {
        value: '30',
        label: '30% or more',
    },
    {
        value: '40',
        label: '40% or more',
    },
    {
        value: '50',
        label: '50% or more',
    },
]


function FilterCheckbox({
    checked,
    onChange,
    label,
}) {
    return (
        <label className="group flex cursor-pointer items-center gap-3 text-sm text-neutral-600 transition hover:text-[#153d35]">

            <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition ${checked
                        ? 'border-[#153d35] bg-[#153d35] text-white'
                        : 'border-neutral-300 bg-white group-hover:border-[#153d35]/40'
                    }`}
            >

                {checked && (
                    <Check
                        size={11}
                        strokeWidth={3}
                    />
                )}

            </span>


            <input
                type="checkbox"
                checked={checked}
                onChange={onChange}
                className="sr-only"
            />


            <span>
                {label}
            </span>

        </label>
    )
}


function FilterSection({
    title,
    children,
}) {
    return (
        <div className="border-t border-neutral-200 pt-6">

            <h3 className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-700">
                {title}
            </h3>


            <div className="mt-4">
                {children}
            </div>

        </div>
    )
}


function Shop() {

    // ==========================================================
    // URL
    // ==========================================================

    const [
        searchParams,
        setSearchParams,
    ] = useSearchParams()


    // ==========================================================
    // SEARCH
    // ==========================================================

    const [
        searchInput,
        setSearchInput,
    ] = useState('')


    const [
        search,
        setSearch,
    ] = useState('')


    // ==========================================================
    // FILTERS
    // ==========================================================

    const [
        minPrice,
        setMinPrice,
    ] = useState('')


    const [
        maxPrice,
        setMaxPrice,
    ] = useState('')


    const [
        brand,
        setBrand,
    ] = useState('')


    const [
        inStock,
        setInStock,
    ] = useState(false)


    const [
        featured,
        setFeatured,
    ] = useState(false)


    const [
        onSale,
        setOnSale,
    ] = useState(false)


    const [
        minDiscount,
        setMinDiscount,
    ] = useState('')


    // ==========================================================
    // SORT
    // ==========================================================

    const [
        sortBy,
        setSortBy,
    ] = useState('newest')


    // ==========================================================
    // PAGINATION
    // ==========================================================

    const [
        page,
        setPage,
    ] = useState(1)


    // ==========================================================
    // FILTER DRAWER
    // ==========================================================

    const [
        filtersOpen,
        setFiltersOpen,
    ] = useState(false)


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
    // CATEGORY FROM URL
    // ==========================================================

    const categoryIdParam =
        Number(
            searchParams.get(
                'categoryId',
            ),
        )


    const categoryId =
        Number.isFinite(
            categoryIdParam,
        ) &&
            categoryIdParam > 0
            ? categoryIdParam
            : null


    // ==========================================================
    // SEARCH DEBOUNCE
    // ==========================================================

    useEffect(() => {

        const timer =
            setTimeout(() => {

                setSearch(
                    searchInput.trim(),
                )

                setPage(1)

            }, 400)


        return () =>
            clearTimeout(
                timer,
            )

    }, [
        searchInput,
    ])


    // ==========================================================
    // CATEGORIES
    // ==========================================================

    const categoriesQuery =
        useQuery({

            queryKey: [
                'categories',
            ],

            queryFn:
                getCategories,

        })


    // ==========================================================
    // FILTER OPTIONS
    // ==========================================================

    const filterOptionsQuery =
        useQuery({

            queryKey: [
                'product-filter-options',
            ],

            queryFn:
                getProductFilterOptions,

            staleTime:
                5 * 60 * 1000,

        })


    // ==========================================================
    // PRICE VALIDATION
    // ==========================================================

    const priceRangeError =
        useMemo(() => {

            if (
                minPrice !== '' &&
                maxPrice !== '' &&
                Number(minPrice) >
                Number(maxPrice)
            ) {

                return 'Minimum price cannot be greater than maximum price.'

            }


            return ''

        }, [
            minPrice,
            maxPrice,
        ])


    // ==========================================================
    // PRODUCTS
    // ==========================================================

    const productsQuery =
        useQuery({

            queryKey: [
                'shop-products',
                {
                    page,
                    search,
                    categoryId,
                    brand,
                    minPrice,
                    maxPrice,
                    inStock,
                    featured,
                    onSale,
                    minDiscount,
                    sortBy,
                },
            ],

            queryFn: () =>
                getProducts({

                    page,

                    limit:
                        12,

                    search,

                    categoryId,

                    brand,

                    minPrice,

                    maxPrice,

                    inStock:
                        inStock
                            ? true
                            : null,

                    featured:
                        featured
                            ? true
                            : null,

                    onSale:
                        onSale
                            ? true
                            : null,

                    minDiscount,

                    sortBy,

                }),

            enabled:
                !priceRangeError,

            placeholderData:
                (
                    previousData,
                ) =>
                    previousData,

        })


    // ==========================================================
    // DATA
    // ==========================================================

    const products =
        productsQuery.data?.items ??
        []


    const pagination =
        productsQuery.data?.pagination


    const categories =
        categoriesQuery.data ??
        []


    const brands =
        filterOptionsQuery.data
            ?.brands ??
        []


    // ==========================================================
    // ACTIVE FILTER COUNT
    // ==========================================================

    const activeFilterCount =
        [
            categoryId !== null,
            Boolean(brand),
            minPrice !== '',
            maxPrice !== '',
            inStock,
            featured,
            onSale,
            minDiscount !== '',
        ].filter(
            Boolean,
        ).length


    const hasFilters =
        Boolean(search) ||
        activeFilterCount > 0 ||
        sortBy !== 'newest'


    // ==========================================================
    // CLEAR FILTERS
    // ==========================================================

    const clearFilters = () => {

        setSearchInput('')

        setSearch('')

        setMinPrice('')

        setMaxPrice('')

        setBrand('')

        setInStock(false)

        setFeatured(false)

        setOnSale(false)

        setMinDiscount('')

        setSortBy('newest')

        setPage(1)

        setSearchParams({})

    }


    // ==========================================================
    // CATEGORY
    // ==========================================================

    const updateCategoryFilter = (
        nextCategoryId,
    ) => {

        setPage(1)


        if (
            nextCategoryId
        ) {

            setSearchParams({
                categoryId:
                    String(
                        nextCategoryId,
                    ),
            })

            return

        }


        setSearchParams({})

    }


    // ==========================================================
    // GENERIC FILTER
    // ==========================================================

    const setFilter =
        (setter) =>
            (event) => {

                setter(
                    event.target.value,
                )

                setPage(1)

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


    // ==========================================================
    // FILTER CONTENT
    // ==========================================================

    const filterContent = () => (

        <div className="space-y-7">

            {/* CATEGORY */}

            <FilterSection
                title="Category"
            >

                <div className="max-h-52 space-y-2 overflow-y-auto pr-2">

                    <button
                        type="button"
                        onClick={() =>
                            updateCategoryFilter(
                                null,
                            )
                        }
                        className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition ${categoryId ===
                                null
                                ? 'bg-[#153d35]/8 font-semibold text-[#18705c]'
                                : 'text-neutral-500 hover:bg-neutral-50 hover:text-[#153d35]'
                            }`}
                    >

                        All categories

                    </button>


                    {categories.map(
                        (
                            category,
                        ) => (

                            <button
                                key={
                                    category.id
                                }
                                type="button"
                                onClick={() =>
                                    updateCategoryFilter(
                                        category.id,
                                    )
                                }
                                className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition ${categoryId ===
                                        category.id
                                        ? 'bg-[#153d35]/8 font-semibold text-[#18705c]'
                                        : 'text-neutral-500 hover:bg-neutral-50 hover:text-[#153d35]'
                                    }`}
                            >

                                {
                                    category.name
                                }

                            </button>

                        ),
                    )}

                </div>

            </FilterSection>


            {/* BRAND */}

            <FilterSection
                title="Brand"
            >

                <div className="relative">

                    <select
                        value={
                            brand
                        }
                        onChange={
                            setFilter(
                                setBrand,
                            )
                        }
                        className="w-full appearance-none rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3 pr-9 text-xs outline-none transition focus:border-[#18705c] focus:bg-white"
                    >

                        <option value="">
                            All brands
                        </option>


                        {brands.map(
                            (
                                brandName,
                            ) => (

                                <option
                                    key={
                                        brandName
                                    }
                                    value={
                                        brandName
                                    }
                                >

                                    {
                                        brandName
                                    }

                                </option>

                            ),
                        )}

                    </select>


                    <ChevronDown
                        size={14}
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400"
                    />

                </div>

            </FilterSection>


            {/* PRICE */}

            <FilterSection
                title="Price range"
            >

                <div className="grid grid-cols-2 gap-2">

                    <div className="relative">

                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-neutral-400">
                            ₹
                        </span>


                        <input
                            type="number"
                            min="0"
                            value={
                                minPrice
                            }
                            onChange={(
                                event,
                            ) => {

                                setMinPrice(
                                    event
                                        .target
                                        .value,
                                )

                                setPage(
                                    1,
                                )

                            }}
                            placeholder="Min"
                            className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-3 pl-7 pr-2 text-xs outline-none focus:border-[#18705c] focus:bg-white"
                        />

                    </div>


                    <div className="relative">

                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-neutral-400">
                            ₹
                        </span>


                        <input
                            type="number"
                            min="0"
                            value={
                                maxPrice
                            }
                            onChange={(
                                event,
                            ) => {

                                setMaxPrice(
                                    event
                                        .target
                                        .value,
                                )

                                setPage(
                                    1,
                                )

                            }}
                            placeholder="Max"
                            className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-3 pl-7 pr-2 text-xs outline-none focus:border-[#18705c] focus:bg-white"
                        />

                    </div>

                </div>


                {priceRangeError && (

                    <p className="mt-3 text-[11px] text-red-600">

                        {
                            priceRangeError
                        }

                    </p>

                )}

            </FilterSection>


            {/* PRODUCT TYPE */}

            <FilterSection
                title="Product type"
            >

                <div className="space-y-3">

                    <FilterCheckbox
                        checked={
                            inStock
                        }
                        onChange={(
                            event,
                        ) => {

                            setInStock(
                                event
                                    .target
                                    .checked,
                            )

                            setPage(
                                1,
                            )

                        }}
                        label="In stock only"
                    />


                    <FilterCheckbox
                        checked={
                            featured
                        }
                        onChange={(
                            event,
                        ) => {

                            setFeatured(
                                event
                                    .target
                                    .checked,
                            )

                            setPage(
                                1,
                            )

                        }}
                        label="Featured only"
                    />


                    <FilterCheckbox
                        checked={
                            onSale
                        }
                        onChange={(
                            event,
                        ) => {

                            setOnSale(
                                event
                                    .target
                                    .checked,
                            )

                            setPage(
                                1,
                            )

                        }}
                        label="On sale"
                    />

                </div>

            </FilterSection>


            {/* DISCOUNT */}

            <FilterSection
                title="Discount"
            >

                <div className="relative">

                    <select
                        value={
                            minDiscount
                        }
                        onChange={
                            setFilter(
                                setMinDiscount,
                            )
                        }
                        className="w-full appearance-none rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3 pr-9 text-xs outline-none focus:border-[#18705c] focus:bg-white"
                    >

                        {DISCOUNT_OPTIONS.map(
                            (
                                option,
                            ) => (

                                <option
                                    key={
                                        option.value ||
                                        'any'
                                    }
                                    value={
                                        option.value
                                    }
                                >

                                    {
                                        option.label
                                    }

                                </option>

                            ),
                        )}

                    </select>


                    <ChevronDown
                        size={14}
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400"
                    />

                </div>

            </FilterSection>


            {/* CLEAR */}

            <button
                type="button"
                onClick={
                    clearFilters
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-600 transition hover:border-[#153d35]/20 hover:bg-neutral-50 hover:text-[#153d35]"
            >

                <RotateCcw
                    size={13}
                />

                Clear all filters

            </button>

        </div>
    )


    return (

        <div className="shop-page min-h-screen bg-[#fbfaf7] text-neutral-900">

            {/* ==================================================
                ANNOUNCEMENT
            ================================================== */}

            <div className="flex min-h-9 items-center justify-center bg-[#153d35] px-4 py-2 text-center text-[10px] font-medium tracking-[0.16em] text-white sm:text-xs">

                FREE SHIPPING ON ORDERS OF ₹1,999 OR MORE

            </div>


            {/* ==================================================
                NAVBAR
            ================================================== */}

            <Navbar
                search={
                    searchInput
                }
                onSearchChange={
                    setSearchInput
                }
                showSearch
            />


            <main>

                {/* ==================================================
                    HERO
                ================================================== */}

                <section className="border-b border-neutral-100 bg-[#f7f7f4]">

                    <div className="mx-auto max-w-[1480px] px-5 py-12 sm:px-8 sm:py-16 lg:px-10 lg:py-20">

                        <p className="text-[10px] font-semibold tracking-[0.22em] text-[#18705c]">
                            SHOPSPHERE COLLECTION
                        </p>


                        <h1 className="mt-3 max-w-3xl text-4xl font-medium tracking-[-0.055em] sm:text-5xl lg:text-6xl">

                            Find something worth{' '}

                            <span className="font-serif italic text-[#557565]">

                                keeping.

                            </span>

                        </h1>


                        <p className="mt-5 max-w-xl text-sm leading-7 text-neutral-500">

                            Search by product, brand or SKU, then narrow the catalog by category, price, stock, featured products and discounts.

                        </p>

                    </div>

                </section>


                {/* ==================================================
                    CATALOG
                ================================================== */}

                <section className="mx-auto max-w-[1480px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">

                    {/* ==================================================
                        STICKY CATALOG TOOLBAR
                    ================================================== */}

                    <div className="sticky top-0 z-30 -mx-4 border-b border-neutral-200/80 bg-[#fbfaf7]/95 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">

                        <div className="flex min-h-12 items-center justify-between gap-3">

                            {/* LEFT */}

                            <div className="min-w-0">

                                <div className="flex items-center gap-2">

                                    <p className="text-sm font-semibold">

                                        {pagination?.total ??
                                            0}{' '}

                                        products

                                    </p>


                                    {activeFilterCount >
                                        0 && (

                                            <span className="hidden rounded-full bg-[#153d35]/8 px-2.5 py-1 text-[9px] font-semibold text-[#18705c] sm:inline-flex">

                                                {
                                                    activeFilterCount
                                                }{' '}

                                                active

                                            </span>

                                        )}

                                </div>


                                {search && (

                                    <p className="mt-0.5 truncate text-[10px] text-neutral-400">

                                        Search: "{search}"

                                    </p>

                                )}

                            </div>


                            {/* RIGHT */}

                            <div className="flex shrink-0 items-center gap-2">

                                {/* FILTER BUTTON */}

                                <button
                                    type="button"
                                    onClick={() =>
                                        setFiltersOpen(
                                            true,
                                        )
                                    }
                                    className="flex h-10 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3.5 text-xs font-semibold text-neutral-700 shadow-sm transition hover:border-[#153d35]/20 hover:text-[#153d35]"
                                >

                                    <SlidersHorizontal
                                        size={15}
                                    />

                                    <span className="hidden sm:inline">
                                        Filters
                                    </span>


                                    {activeFilterCount >
                                        0 && (

                                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#153d35] px-1 text-[9px] text-white">

                                                {
                                                    activeFilterCount
                                                }

                                            </span>

                                        )}

                                </button>


                                {/* SORT */}

                                <div className="relative">

                                    <select
                                        value={
                                            sortBy
                                        }
                                        onChange={(
                                            event,
                                        ) => {

                                            setSortBy(
                                                event
                                                    .target
                                                    .value,
                                            )

                                            setPage(
                                                1,
                                            )

                                        }}
                                        className="h-10 appearance-none rounded-xl border border-neutral-200 bg-white py-2 pl-3 pr-9 text-xs font-medium outline-none shadow-sm focus:border-[#18705c]"
                                    >

                                        {SORT_OPTIONS.map(
                                            (
                                                option,
                                            ) => (

                                                <option
                                                    key={
                                                        option.value
                                                    }
                                                    value={
                                                        option.value
                                                    }
                                                >

                                                    Sort: {
                                                        option.label
                                                    }

                                                </option>

                                            ),
                                        )}

                                    </select>


                                    <ChevronDown
                                        size={13}
                                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400"
                                    />

                                </div>

                            </div>

                        </div>

                    </div>


                    {/* ==================================================
                        ACTIVE FILTERS
                    ================================================== */}

                    {hasFilters && (

                        <div className="mt-5 flex flex-wrap items-center gap-2">

                            {search && (

                                <span className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[10px] font-medium text-neutral-600">

                                    Search: {search}

                                </span>

                            )}


                            {categoryId && (

                                <span className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[10px] font-medium text-neutral-600">

                                    {categories.find(
                                        (
                                            category,
                                        ) =>
                                            category.id ===
                                            categoryId,
                                    )?.name ||
                                        'Category'}

                                </span>

                            )}


                            {brand && (

                                <span className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[10px] font-medium text-neutral-600">

                                    Brand: {brand}

                                </span>

                            )}


                            {inStock && (

                                <span className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[10px] font-medium text-neutral-600">

                                    In stock

                                </span>

                            )}


                            {featured && (

                                <span className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[10px] font-medium text-neutral-600">

                                    Featured

                                </span>

                            )}


                            {onSale && (

                                <span className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[10px] font-medium text-neutral-600">

                                    On sale

                                </span>

                            )}


                            {minDiscount && (

                                <span className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[10px] font-medium text-neutral-600">

                                    {minDiscount}%+
                                    off

                                </span>

                            )}


                            {(minPrice ||
                                maxPrice) && (

                                    <span className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[10px] font-medium text-neutral-600">

                                        ₹
                                        {minPrice ||
                                            '0'}

                                        {' - '}

                                        ₹
                                        {maxPrice ||
                                            '∞'}

                                    </span>

                                )}


                            <button
                                type="button"
                                onClick={
                                    clearFilters
                                }
                                className="ml-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#18705c] hover:text-[#153d35]"
                            >

                                Clear all

                            </button>

                        </div>

                    )}


                    {priceRangeError && (

                        <p
                            role="alert"
                            className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-700"
                        >

                            {
                                priceRangeError
                            }

                        </p>

                    )}


                    {/* ==================================================
                        PRODUCT AREA

                        IMPORTANT:
                        NO SIDEBAR HERE.

                        Product grid gets 100% width.
                    ================================================== */}

                    <div className="mt-8">

                        {productsQuery.isLoading ? (

                            <div className="grid grid-cols-2 gap-x-3 gap-y-9 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-11 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5">

                                {Array.from({
                                    length: 10,
                                }).map(
                                    (
                                        _,
                                        index,
                                    ) => (

                                        <div
                                            key={
                                                index
                                            }
                                        >

                                            <div className="aspect-[4/5] animate-pulse rounded-2xl bg-neutral-100" />

                                            <div className="mt-4 h-2.5 w-1/3 animate-pulse rounded bg-neutral-100" />

                                            <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-neutral-100" />

                                            <div className="mt-3 h-4 w-1/4 animate-pulse rounded bg-neutral-100" />

                                        </div>

                                    ),
                                )}

                            </div>

                        ) : productsQuery.isError ? (

                            <div className="rounded-2xl border border-red-100 bg-red-50 p-10 text-center">

                                <h3 className="font-semibold text-red-900">

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
                                    className="mt-5 rounded-xl bg-[#153d35] px-5 py-3 text-xs font-semibold text-white"
                                >

                                    TRY AGAIN

                                </button>

                            </div>

                        ) : products.length ===
                            0 ? (

                            <div className="rounded-2xl border border-dashed border-neutral-300 bg-white px-5 py-20 text-center">

                                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#153d35]/8 text-[#18705c]">

                                    <SlidersHorizontal
                                        size={22}
                                    />

                                </div>


                                <h3 className="mt-5 text-lg font-medium">

                                    No products found

                                </h3>


                                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-500">

                                    Try changing your search or removing one or more filters.

                                </p>


                                <button
                                    type="button"
                                    onClick={
                                        clearFilters
                                    }
                                    className="mt-6 rounded-xl bg-[#153d35] px-5 py-3 text-xs font-semibold text-white"
                                >

                                    CLEAR FILTERS

                                </button>

                            </div>

                        ) : (

                            <>

                                {/* RESULT META */}

                                <div className="mb-5 flex items-center justify-between">

                                    <p className="text-[10px] uppercase tracking-[0.13em] text-neutral-400">

                                        Showing{' '}

                                        <span className="font-semibold text-neutral-600">

                                            {
                                                products.length
                                            }

                                        </span>

                                        {' '}of{' '}

                                        <span className="font-semibold text-neutral-600">

                                            {
                                                pagination?.total ??
                                                products.length
                                            }

                                        </span>

                                    </p>


                                    {productsQuery.isFetching && (

                                        <span className="text-[10px] font-medium text-[#18705c]">

                                            Updating...

                                        </span>

                                    )}

                                </div>


                                {/* ==================================================
                                    FULL WIDTH PRODUCT GRID
                                ================================================== */}

                                <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-12 lg:grid-cols-4 lg:gap-x-6 xl:grid-cols-4 2xl:grid-cols-5">

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
                                            addToCart
                                        }
                                    />

                                </div>


                                {/* ==================================================
                                    PAGINATION
                                ================================================== */}

                                {pagination &&
                                    pagination.total_pages >
                                    1 && (

                                        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-neutral-200 pt-7 sm:flex-row">

                                            <p className="text-[10px] text-neutral-400">

                                                Page{' '}

                                                <span className="font-semibold text-neutral-700">

                                                    {
                                                        pagination.page
                                                    }

                                                </span>

                                                {' '}of{' '}

                                                <span className="font-semibold text-neutral-700">

                                                    {
                                                        pagination.total_pages
                                                    }

                                                </span>

                                            </p>


                                            <div className="flex items-center gap-2">

                                                <button
                                                    type="button"
                                                    disabled={
                                                        !pagination.has_previous
                                                    }
                                                    onClick={() =>
                                                        setPage(
                                                            (
                                                                current,
                                                            ) =>
                                                                Math.max(
                                                                    1,
                                                                    current -
                                                                    1,
                                                                ),
                                                        )
                                                    }
                                                    className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-xs font-medium transition hover:border-[#153d35]/20 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                >

                                                    Previous

                                                </button>


                                                <span className="flex h-10 min-w-10 items-center justify-center rounded-xl bg-[#153d35] px-3 text-xs font-semibold text-white">

                                                    {
                                                        pagination.page
                                                    }

                                                </span>


                                                <button
                                                    type="button"
                                                    disabled={
                                                        !pagination.has_next
                                                    }
                                                    onClick={() =>
                                                        setPage(
                                                            (
                                                                current,
                                                            ) =>
                                                                current +
                                                                1,
                                                        )
                                                    }
                                                    className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-xs font-medium transition hover:border-[#153d35]/20 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                >

                                                    Next

                                                </button>

                                            </div>

                                        </div>

                                    )}

                            </>

                        )}

                    </div>

                </section>

            </main>


            {/* ==================================================
                FILTER DRAWER
                ==================================================

                This replaces the problematic permanent sidebar.

                It works on BOTH desktop and mobile.
            ================================================== */}

            {filtersOpen && (

                <div className="fixed inset-0 z-[100]">

                    {/* BACKDROP */}

                    <button
                        type="button"
                        aria-label="Close filters"
                        onClick={() =>
                            setFiltersOpen(
                                false,
                            )
                        }
                        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
                    />


                    {/* DRAWER */}

                    <aside className="absolute right-0 top-0 flex h-full w-[min(430px,94vw)] flex-col bg-[#fbfaf7] shadow-2xl">

                        {/* HEADER */}

                        <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-6 py-5">

                            <div>

                                <div className="flex items-center gap-2">

                                    <SlidersHorizontal
                                        size={17}
                                        className="text-[#18705c]"
                                    />

                                    <h2 className="text-base font-semibold">

                                        Filters

                                    </h2>

                                </div>


                                <p className="mt-1 text-[10px] text-neutral-400">

                                    {activeFilterCount >
                                        0
                                        ? `${activeFilterCount} filters applied`
                                        : 'Refine your results'}

                                </p>

                            </div>


                            <button
                                type="button"
                                onClick={() =>
                                    setFiltersOpen(
                                        false,
                                    )
                                }
                                className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 bg-white transition hover:bg-neutral-50"
                                aria-label="Close filters"
                            >

                                <X
                                    size={18}
                                />

                            </button>

                        </div>


                        {/* FILTER CONTENT */}

                        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">

                            {filterContent()}

                        </div>


                        {/* FOOTER */}

                        <div className="shrink-0 border-t border-neutral-200 bg-white p-5">

                            <div className="flex items-center justify-between gap-3">

                                <button
                                    type="button"
                                    onClick={
                                        clearFilters
                                    }
                                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-neutral-200 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-600 transition hover:bg-neutral-50"
                                >

                                    <RotateCcw
                                        size={13}
                                    />

                                    Clear

                                </button>


                                <button
                                    type="button"
                                    onClick={() =>
                                        setFiltersOpen(
                                            false,
                                        )
                                    }
                                    className="flex flex-[1.4] items-center justify-center rounded-xl bg-[#153d35] py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[#24584b]"
                                >

                                    Show{' '}

                                    {
                                        pagination?.total ??
                                        0
                                    }{' '}

                                    Products

                                </button>

                            </div>

                        </div>

                    </aside>

                </div>

            )}


            <Footer />

        </div>

    )
}


export default Shop