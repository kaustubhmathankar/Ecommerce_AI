import {
    CheckCircle2,
    MessageSquareText,
    Search,
    Star,
    Trash2,
} from 'lucide-react'

import {
    useMemo,
    useState,
} from 'react'

import {
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query'

import {
    deleteAdminReview,
    getAdminReviews,
} from '../api/reviews'

import {
    getApiErrorMessage,
} from '../api/client'


const EMPTY_REVIEWS = []


function formatDate(
    value,
) {

    if (!value) {
        return ''
    }

    const date = new Date(
        value,
    )

    if (
        Number.isNaN(
            date.getTime(),
        )
    ) {
        return ''
    }

    return date.toLocaleString(
        'en-IN',
    )
}


function AdminReviews() {

    const queryClient =
        useQueryClient()

    const [
        search,
        setSearch,
    ] = useState('')

    const [
        ratingFilter,
        setRatingFilter,
    ] = useState('all')

    const [
        error,
        setError,
    ] = useState('')


    const reviewsQuery =
        useQuery({
            queryKey: [
                'admin-reviews',
            ],
            queryFn:
                getAdminReviews,
        })


    const deleteMutation =
        useMutation({

            mutationFn:
                deleteAdminReview,

            onSuccess: () => {

                setError('')

                queryClient.invalidateQueries(
                    {
                        queryKey: [
                            'admin-reviews',
                        ],
                    },
                )
            },

            onError: (
                requestError,
            ) => {

                setError(
                    getApiErrorMessage(
                        requestError,
                        'Unable to delete the review.',
                    ),
                )
            },
        })


    const reviews =
        reviewsQuery.data?.items ??
        EMPTY_REVIEWS


    const filteredReviews =
        useMemo(
            () => {

                const normalizedSearch =
                    search
                        .trim()
                        .toLowerCase()

                return reviews.filter(
                    (
                        review,
                    ) => {

                        const matchesSearch =
                            !normalizedSearch ||
                            review.product_name
                                .toLowerCase()
                                .includes(
                                    normalizedSearch,
                                ) ||
                            review.customer_name
                                .toLowerCase()
                                .includes(
                                    normalizedSearch,
                                ) ||
                            review.customer_email
                                .toLowerCase()
                                .includes(
                                    normalizedSearch,
                                ) ||
                            review.title
                                .toLowerCase()
                                .includes(
                                    normalizedSearch,
                                ) ||
                            review.comment
                                .toLowerCase()
                                .includes(
                                    normalizedSearch,
                                )

                        const matchesRating =
                            ratingFilter ===
                            'all' ||
                            review.rating ===
                            Number(
                                ratingFilter,
                            )

                        return (
                            matchesSearch &&
                            matchesRating
                        )
                    },
                )
            },
            [
                reviews,
                search,
                ratingFilter,
            ],
        )


    const handleDelete = (
        review,
    ) => {

        const confirmed =
            window.confirm(
                `Delete the review from ${review.customer_name} for ${review.product_name}?`,
            )

        if (!confirmed) {
            return
        }

        setError('')

        deleteMutation.mutate(
            review.id,
        )
    }


    return (
        <div className="space-y-8">

            {/* HEADER */}

            <section>

                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#18705c]">
                    Customer feedback
                </p>


                <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">

                    <div>

                        <h1 className="text-3xl font-medium tracking-[-0.04em]">
                            Reviews
                        </h1>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
                            View customer reviews and remove inappropriate content when necessary.
                        </p>

                    </div>


                    <div className="rounded-full bg-[#eaf3ef] px-4 py-2 text-xs font-semibold text-[#18705c]">

                        {reviews.length} total reviews

                    </div>

                </div>

            </section>


            {/* FILTERS */}

            <section className="grid gap-3 rounded-[22px] border border-neutral-200 bg-white p-4 sm:grid-cols-[1fr_180px]">

                <label className="relative block">

                    <Search
                        size={16}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"
                    />

                    <input
                        value={search}
                        onChange={(
                            event,
                        ) =>
                            setSearch(
                                event.target.value,
                            )
                        }
                        placeholder="Search product, customer or review..."
                        className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-11 pr-4 text-sm outline-none transition focus:border-[#18705c]"
                    />

                </label>


                <select
                    value={
                        ratingFilter
                    }
                    onChange={(
                        event,
                    ) =>
                        setRatingFilter(
                            event.target.value,
                        )
                    }
                    className="h-11 rounded-xl border border-neutral-200 bg-neutral-50 px-4 text-sm outline-none focus:border-[#18705c]"
                >

                    <option value="all">
                        All ratings
                    </option>

                    <option value="5">
                        5 stars
                    </option>

                    <option value="4">
                        4 stars
                    </option>

                    <option value="3">
                        3 stars
                    </option>

                    <option value="2">
                        2 stars
                    </option>

                    <option value="1">
                        1 star
                    </option>

                </select>

            </section>


            {error && (

                <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                </div>

            )}


            {/* CONTENT */}

            {reviewsQuery.isLoading ? (

                <div className="grid gap-4">

                    {[1, 2, 3].map(
                        (item) => (

                            <div
                                key={
                                    item
                                }
                                className="h-44 animate-pulse rounded-[22px] bg-neutral-100"
                            />

                        ),
                    )}

                </div>

            ) : reviewsQuery.isError ? (

                <div className="rounded-[22px] border border-red-100 bg-red-50 p-6 text-sm text-red-600">
                    Unable to load reviews right now.
                </div>

            ) : filteredReviews.length === 0 ? (

                <div className="rounded-[22px] border border-dashed border-neutral-200 bg-white p-12 text-center">

                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#eef4f0] text-[#18705c]">

                        <MessageSquareText
                            size={18}
                        />

                    </div>


                    <p className="mt-4 text-sm font-semibold text-neutral-800">
                        No matching reviews
                    </p>

                </div>

            ) : (

                <div className="space-y-4">

                    {filteredReviews.map(
                        (
                            review,
                        ) => (

                            <article
                                key={
                                    review.id
                                }
                                className="rounded-[22px] border border-neutral-200 bg-white p-5 shadow-sm sm:p-6"
                            >

                                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

                                    <div className="min-w-0 flex-1">

                                        <div className="flex flex-wrap items-center gap-2">

                                            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#18705c]">
                                                {
                                                    review.product_name
                                                }
                                            </p>


                                            {review.is_verified_purchase && (

                                                <span className="inline-flex items-center gap-1 rounded-full bg-[#eaf3ef] px-2.5 py-1 text-[9px] font-semibold text-[#18705c]">

                                                    <CheckCircle2
                                                        size={11}
                                                    />

                                                    Verified

                                                </span>

                                            )}

                                        </div>


                                        <div className="mt-3 flex gap-0.5">

                                            {Array.from(
                                                {
                                                    length: 5,
                                                },
                                                (
                                                    _,
                                                    index,
                                                ) => (

                                                    <Star
                                                        key={
                                                            index
                                                        }
                                                        size={
                                                            15
                                                        }
                                                        strokeWidth={
                                                            1.7
                                                        }
                                                        className={
                                                            index <
                                                                review.rating
                                                                ? 'fill-amber-400 text-amber-400'
                                                                : 'text-neutral-300'
                                                        }
                                                    />

                                                ),
                                            )}

                                        </div>


                                        <h2 className="mt-3 text-base font-semibold text-neutral-900">
                                            {
                                                review.title
                                            }
                                        </h2>


                                        <p className="mt-2 max-w-4xl text-sm leading-6 text-neutral-600">
                                            {
                                                review.comment
                                            }
                                        </p>


                                        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[10px] text-neutral-400">

                                            <span>
                                                {
                                                    review.customer_name
                                                }
                                            </span>

                                            <span>
                                                {
                                                    review.customer_email
                                                }
                                            </span>

                                            <span>
                                                Order #
                                                {
                                                    review.order_id
                                                }
                                            </span>

                                            <span>
                                                {
                                                    formatDate(
                                                        review.created_at,
                                                    )
                                                }
                                            </span>

                                        </div>

                                    </div>


                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleDelete(
                                                review,
                                            )
                                        }
                                        disabled={
                                            deleteMutation.isPending
                                        }
                                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-red-100 px-4 py-2.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                                    >

                                        <Trash2
                                            size={14}
                                        />

                                        Delete review

                                    </button>

                                </div>

                            </article>

                        ),
                    )}

                </div>

            )}

        </div>
    )
}


export default AdminReviews