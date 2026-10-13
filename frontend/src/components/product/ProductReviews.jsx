import {
    CheckCircle2,
    Edit3,
    MessageSquareText,
    Star,
    Trash2,
} from 'lucide-react'

import { useState } from 'react'

import {
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query'

import { useAuth } from '../../context/AuthContext'

import {
    getApiErrorMessage,
} from '../../api/client'

import {
    createProductReview,
    deleteProductReview,
    getProductReviews,
    updateProductReview,
} from '../../api/reviews'


function formatReviewDate(
    value,
) {
    if (!value) {
        return ''
    }

    const date = new Date(value)

    if (
        Number.isNaN(
            date.getTime(),
        )
    ) {
        return ''
    }

    return date.toLocaleDateString(
        'en-IN',
        {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        },
    )
}


function renderStars(
    rating,
    size = 15,
) {
    return Array.from(
        { length: 5 },
        (_, index) => (
            <Star
                key={index}
                size={size}
                strokeWidth={1.7}
                className={
                    index < rating
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-neutral-300'
                }
            />
        ),
    )
}


function RatingDistribution({
    distribution,
    total,
}) {

    return (
        <div className="space-y-2.5">

            {[5, 4, 3, 2, 1].map(
                (rating) => {

                    const count =
                        Number(
                            distribution?.[
                            String(rating)
                            ] ?? 0,
                        )

                    const percentage =
                        total > 0
                            ? (
                                count /
                                total
                            ) * 100
                            : 0

                    return (
                        <div
                            key={rating}
                            className="flex items-center gap-3"
                        >

                            <span className="w-7 text-right text-[10px] font-semibold text-neutral-500">
                                {rating}★
                            </span>

                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">

                                <div
                                    className="h-full rounded-full bg-amber-400 transition-all"
                                    style={{
                                        width: `${percentage}%`,
                                    }}
                                />

                            </div>

                            <span className="w-7 text-[10px] text-neutral-400">
                                {count}
                            </span>

                        </div>
                    )
                },
            )}

        </div>
    )
}


function ProductReviews({
    productId,
}) {

    const queryClient =
        useQueryClient()

    const {
        user,
        isAuthenticated,
        isAdmin,
    } = useAuth()

    const [showForm, setShowForm] =
        useState(false)

    const [
        editingReviewId,
        setEditingReviewId,
    ] = useState(null)

    const [rating, setRating] =
        useState(5)

    const [title, setTitle] =
        useState('')

    const [comment, setComment] =
        useState('')

    const [formError, setFormError] =
        useState('')


    const reviewsQuery =
        useQuery({
            queryKey: [
                'product-reviews',
                productId,
            ],

            queryFn: () =>
                getProductReviews(
                    productId,
                ),

            enabled:
                Boolean(
                    productId,
                ),
        })


    const reviews =
        reviewsQuery.data?.items ?? []


    const total =
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


    const distribution =
        reviewsQuery.data
            ?.rating_distribution ??
        {}


    const ownReview =
        reviews.find(
            (review) =>
                review.user_id ===
                user?.id,
        ) ?? null


    const resetForm = () => {

        setShowForm(
            false,
        )

        setEditingReviewId(
            null,
        )

        setRating(5)
        setTitle('')
        setComment('')
        setFormError('')
    }


    const startCreate = () => {

        setEditingReviewId(
            null,
        )

        setRating(5)
        setTitle('')
        setComment('')
        setFormError('')
        setShowForm(true)
    }


    const startEdit = () => {

        if (!ownReview) {
            return
        }

        setEditingReviewId(
            ownReview.id,
        )

        setRating(
            ownReview.rating,
        )

        setTitle(
            ownReview.title,
        )

        setComment(
            ownReview.comment,
        )

        setFormError('')
        setShowForm(true)
    }


    const reviewMutation =
        useMutation({

            mutationFn: () => {

                const payload = {
                    rating,
                    title,
                    comment,
                }

                return editingReviewId
                    ? updateProductReview(
                        editingReviewId,
                        payload,
                    )
                    : createProductReview(
                        productId,
                        payload,
                    )
            },

            onSuccess: () => {

                queryClient.invalidateQueries(
                    {
                        queryKey: [
                            'product-reviews',
                            productId,
                        ],
                    },
                )

                resetForm()
            },

            onError: (
                error,
            ) => {

                setFormError(
                    getApiErrorMessage(
                        error,
                        'Unable to save your review.',
                    ),
                )
            },
        })


    const deleteMutation =
        useMutation({

            mutationFn:
                deleteProductReview,

            onSuccess: () => {

                queryClient.invalidateQueries(
                    {
                        queryKey: [
                            'product-reviews',
                            productId,
                        ],
                    },
                )

                setFormError('')
            },

            onError: (
                error,
            ) => {

                setFormError(
                    getApiErrorMessage(
                        error,
                        'Unable to delete your review.',
                    ),
                )
            },
        })


    const canWrite =
        isAuthenticated &&
        !isAdmin &&
        user?.role === 'customer'


    const handleDelete = () => {

        if (!ownReview) {
            return
        }

        const confirmed =
            window.confirm(
                'Delete your review for this product?',
            )

        if (!confirmed) {
            return
        }

        setFormError('')

        deleteMutation.mutate(
            ownReview.id,
        )
    }


    const handleSubmit = (
        event,
    ) => {

        event.preventDefault()

        if (!title.trim()) {

            setFormError(
                'Please enter a review title.',
            )

            return
        }

        if (
            comment.trim().length <
            10
        ) {

            setFormError(
                'Your review should contain at least 10 characters.',
            )

            return
        }

        setFormError('')

        reviewMutation.mutate()
    }


    return (
        <section
            id="reviews"
            className="border-t border-neutral-100 bg-white"
        >

            <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 sm:py-16 lg:px-12">

                {/* HEADER */}

                <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">

                    <div>

                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#18705c]">
                            Customer feedback
                        </p>

                        <h2 className="mt-2 text-2xl font-medium tracking-[-0.035em] sm:text-3xl">
                            Reviews & ratings
                        </h2>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
                            Real feedback from customers who purchased this product.
                        </p>

                    </div>


                    {canWrite &&
                        !ownReview &&
                        !showForm && (

                            <button
                                type="button"
                                onClick={
                                    startCreate
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#153d35] px-5 py-3 text-xs font-semibold text-white transition hover:bg-[#24584b]"
                            >

                                <MessageSquareText
                                    size={15}
                                />

                                Write a review

                            </button>

                        )}


                    {!isAuthenticated && (

                        <span className="text-xs text-neutral-400">
                            Sign in to write a review.
                        </span>

                    )}

                </div>


                {/* SUMMARY */}

                {reviewsQuery.isLoading ? (

                    <div className="mt-10 grid gap-8 lg:grid-cols-[260px_1fr]">

                        <div className="h-44 animate-pulse rounded-[24px] bg-neutral-100" />

                        <div className="h-44 animate-pulse rounded-[24px] bg-neutral-100" />

                    </div>

                ) : (

                    <div className="mt-10 grid gap-8 lg:grid-cols-[260px_1fr]">

                        <div className="rounded-[24px] border border-neutral-200 bg-[#fafaf7] p-6 text-center">

                            <p className="text-5xl font-medium tracking-[-0.05em] text-[#153d35]">
                                {averageRating.toFixed(1)}
                            </p>

                            <div className="mt-3 flex justify-center gap-0.5">

                                {renderStars(
                                    Math.round(
                                        averageRating,
                                    ),
                                    17,
                                )}

                            </div>

                            <p className="mt-3 text-xs text-neutral-500">

                                {total ===
                                    1
                                    ? '1 review'
                                    : `${total} reviews`}

                            </p>

                        </div>


                        <div className="rounded-[24px] border border-neutral-200 p-6">

                            <p className="text-xs font-semibold text-neutral-800">
                                Rating breakdown
                            </p>

                            <div className="mt-5 max-w-xl">

                                <RatingDistribution
                                    distribution={
                                        distribution
                                    }
                                    total={
                                        total
                                    }
                                />

                            </div>

                        </div>

                    </div>

                )}


                {/* REVIEW FORM */}

                {showForm &&
                    canWrite && (

                        <form
                            onSubmit={
                                handleSubmit
                            }
                            className="mt-8 rounded-[24px] border border-[#d8e6dd] bg-[#f7faf7] p-5 sm:p-7"
                        >

                            <div className="flex items-start justify-between gap-4">

                                <div>

                                    <p className="text-sm font-semibold text-neutral-900">

                                        {editingReviewId
                                            ? 'Edit your review'
                                            : 'Write a review'}

                                    </p>

                                    <p className="mt-1 text-xs text-neutral-500">
                                        Your review will be visible to other customers.
                                    </p>

                                </div>


                                <button
                                    type="button"
                                    onClick={
                                        resetForm
                                    }
                                    className="text-xs font-semibold text-neutral-500 hover:text-neutral-900"
                                >
                                    Cancel
                                </button>

                            </div>


                            <div className="mt-6">

                                <p className="text-xs font-semibold text-neutral-700">
                                    Your rating
                                </p>

                                <div className="mt-3 flex gap-1">

                                    {[1, 2, 3, 4, 5].map(
                                        (
                                            value,
                                        ) => (

                                            <button
                                                key={
                                                    value
                                                }
                                                type="button"
                                                onClick={() =>
                                                    setRating(
                                                        value,
                                                    )
                                                }
                                                aria-label={`${value} star rating`}
                                                className="rounded-md p-1 transition hover:bg-white"
                                            >

                                                <Star
                                                    size={25}
                                                    strokeWidth={
                                                        1.7
                                                    }
                                                    className={
                                                        value <=
                                                            rating
                                                            ? 'fill-amber-400 text-amber-400'
                                                            : 'text-neutral-300'
                                                    }
                                                />

                                            </button>

                                        ),
                                    )}

                                </div>

                            </div>


                            <div className="mt-6 grid gap-5">

                                <label className="block">

                                    <span className="text-xs font-semibold text-neutral-700">
                                        Review title
                                    </span>

                                    <input
                                        value={title}
                                        onChange={(event) =>
                                            setTitle(
                                                event
                                                    .target
                                                    .value,
                                            )
                                        }
                                        maxLength={
                                            150
                                        }
                                        placeholder="Example: Excellent quality"
                                        className="mt-2 h-12 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm outline-none transition focus:border-[#18705c]"
                                    />

                                </label>


                                <label className="block">

                                    <span className="text-xs font-semibold text-neutral-700">
                                        Your review
                                    </span>

                                    <textarea
                                        value={
                                            comment
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setComment(
                                                event
                                                    .target
                                                    .value,
                                            )
                                        }
                                        maxLength={
                                            2000
                                        }
                                        rows={5}
                                        placeholder="Tell other customers what you liked about the product."
                                        className="mt-2 w-full resize-y rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-[#18705c]"
                                    />

                                </label>

                            </div>


                            {formError && (

                                <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs leading-5 text-red-600">
                                    {formError}
                                </p>

                            )}


                            <div className="mt-5 flex justify-end">

                                <button
                                    type="submit"
                                    disabled={
                                        reviewMutation.isPending
                                    }
                                    className="rounded-full bg-[#153d35] px-5 py-3 text-xs font-semibold text-white transition hover:bg-[#24584b] disabled:cursor-not-allowed disabled:opacity-50"
                                >

                                    {reviewMutation.isPending
                                        ? 'Saving...'
                                        : editingReviewId
                                            ? 'Update review'
                                            : 'Publish review'}

                                </button>

                            </div>

                        </form>

                    )}


                {/* OWN REVIEW */}

                {ownReview &&
                    !showForm &&
                    canWrite && (

                        <div className="mt-8 rounded-[20px] border border-[#d8e6dd] bg-[#f7faf7] p-5">

                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                                <div>

                                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#18705c]">
                                        Your review
                                    </p>

                                    <div className="mt-2 flex gap-0.5">
                                        {renderStars(
                                            ownReview.rating,
                                        )}
                                    </div>

                                    <p className="mt-3 text-sm font-semibold text-neutral-900">
                                        {
                                            ownReview.title
                                        }
                                    </p>

                                    <p className="mt-1 text-sm leading-6 text-neutral-600">
                                        {
                                            ownReview.comment
                                        }
                                    </p>

                                </div>


                                <div className="flex shrink-0 gap-2">

                                    <button
                                        type="button"
                                        onClick={
                                            startEdit
                                        }
                                        className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 hover:border-[#18705c] hover:text-[#18705c]"
                                    >

                                        <Edit3
                                            size={13}
                                        />

                                        Edit

                                    </button>


                                    <button
                                        type="button"
                                        onClick={
                                            handleDelete
                                        }
                                        disabled={
                                            deleteMutation.isPending
                                        }
                                        className="inline-flex items-center gap-1.5 rounded-full border border-red-100 bg-white px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                                    >

                                        <Trash2
                                            size={13}
                                        />

                                        Delete

                                    </button>

                                </div>

                            </div>

                        </div>

                    )}


                {/* REVIEWS */}

                <div className="mt-10">

                    {reviewsQuery.isError ? (

                        <div className="rounded-[22px] border border-red-100 bg-red-50 p-6 text-sm text-red-600">
                            Unable to load reviews right now. Please refresh and try again.
                        </div>

                    ) : reviews.length === 0 ? (

                        <div className="rounded-[24px] border border-dashed border-neutral-200 p-10 text-center">

                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#eef4f0] text-[#18705c]">

                                <MessageSquareText
                                    size={18}
                                />

                            </div>

                            <h3 className="mt-4 text-sm font-semibold text-neutral-800">
                                No reviews yet
                            </h3>

                            <p className="mt-1 text-xs leading-5 text-neutral-400">
                                Be the first verified customer to share your experience.
                            </p>

                        </div>

                    ) : (

                        <div className="space-y-4">

                            {reviews.map(
                                (
                                    review,
                                ) => (

                                    <article
                                        key={
                                            review.id
                                        }
                                        className="rounded-[22px] border border-neutral-200 p-5 sm:p-6"
                                    >

                                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                                            <div>

                                                <div className="flex flex-wrap items-center gap-3">

                                                    <p className="text-sm font-semibold text-neutral-900">
                                                        {
                                                            review.customer_name
                                                        }
                                                    </p>


                                                    {review.is_verified_purchase && (

                                                        <span className="inline-flex items-center gap-1 rounded-full bg-[#eaf3ef] px-2.5 py-1 text-[9px] font-semibold text-[#18705c]">

                                                            <CheckCircle2
                                                                size={11}
                                                            />

                                                            Verified Purchase

                                                        </span>

                                                    )}

                                                </div>


                                                <div className="mt-2 flex gap-0.5">
                                                    {renderStars(
                                                        review.rating,
                                                    )}
                                                </div>

                                            </div>


                                            <span className="text-[10px] text-neutral-400">
                                                {
                                                    formatReviewDate(
                                                        review.created_at,
                                                    )
                                                }
                                            </span>

                                        </div>


                                        <h3 className="mt-4 text-sm font-semibold text-neutral-900">
                                            {
                                                review.title
                                            }
                                        </h3>


                                        <p className="mt-2 max-w-4xl text-sm leading-6 text-neutral-600">
                                            {
                                                review.comment
                                            }
                                        </p>

                                    </article>

                                ),
                            )}

                        </div>

                    )}

                </div>

            </div>

        </section>
    )
}


export default ProductReviews