import {
    Pencil,
    Plus,
    Trash2,
    X,
} from 'lucide-react'

import { useState } from 'react'

import {
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query'

import {
    createCategoryAdmin,
    deleteCategoryAdmin,
    getCategories,
    updateCategoryAdmin,
} from '../api/products'

import {
    getApiErrorMessage,
} from '../api/client'

import {
    handleImageError,
} from '../utils/images'

import ImageUploader from '../components/admin/ImageUploader'


const defaultForm = {
    name: '',
    slug: '',
    description: '',
    image_url: '',
}


function AdminCategories() {
    const queryClient = useQueryClient()

    const [form, setForm] = useState(defaultForm)
    const [editingId, setEditingId] = useState(null)
    const [imageUploading, setImageUploading] = useState(false)


    // ============================================================
    // CATEGORIES
    // ============================================================

    const categoriesQuery = useQuery({
        queryKey: ['categories'],
        queryFn: getCategories,
    })

    const categories = categoriesQuery.data ?? []


    // ============================================================
    // RESET FORM
    // ============================================================

    function resetForm() {
        setForm(defaultForm)
        setEditingId(null)
    }


    // ============================================================
    // SAVE CATEGORY
    // ============================================================

    const saveMutation = useMutation({
        mutationFn: (payload) =>
            editingId
                ? updateCategoryAdmin(
                    editingId,
                    payload,
                )
                : createCategoryAdmin(
                    payload,
                ),

        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['categories'],
            })

            queryClient.invalidateQueries({
                queryKey: ['admin-overview'],
            })

            resetForm()
        },
    })


    // ============================================================
    // DELETE CATEGORY
    // ============================================================

    const deleteMutation = useMutation({
        mutationFn: deleteCategoryAdmin,

        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['categories'],
            })

            queryClient.invalidateQueries({
                queryKey: ['admin-overview'],
            })

            queryClient.invalidateQueries({
                queryKey: ['shop-products'],
            })
        },
    })


    // ============================================================
    // FORM HANDLING
    // ============================================================

    function handleChange(event) {
        const {
            name,
            value,
        } = event.target

        setForm((current) => ({
            ...current,
            [name]: value,
        }))
    }


    function submit(event) {
        event.preventDefault()

        if (imageUploading) {
            return
        }

        saveMutation.mutate({
            name: form.name.trim(),
            slug: form.slug.trim(),
            description: form.description.trim(),
            image_url: form.image_url.trim() || null,
        })
    }


    // ============================================================
    // EDIT CATEGORY
    // ============================================================

    function editCategory(category) {
        setEditingId(category.id)

        setForm({
            name: category.name,
            slug: category.slug,
            description: category.description ?? '',

            // Existing image URLs stay intact.
            image_url: category.image_url ?? '',
        })

        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        })
    }


    // ============================================================
    // RENDER
    // ============================================================

    return (
        <div>

            {/* PAGE HEADER */}

            <div className="mb-8">

                <p className="text-[10px] font-semibold tracking-[0.22em] text-[#18705c]">
                    CATALOG
                </p>

                <h1 className="mt-2 text-3xl font-medium tracking-[-0.05em] sm:text-4xl">
                    Categories
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
                    Organize your products into clean collections that are easy for customers to browse.
                </p>

            </div>


            {/* ERRORS */}

            {saveMutation.isError && (
                <ErrorBanner error={saveMutation.error} />
            )}

            {deleteMutation.isError && (
                <ErrorBanner error={deleteMutation.error} />
            )}


            <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">

                {/* ==================================================
                    CATEGORY FORM
                ================================================== */}

                <section className="rounded-3xl border border-neutral-200 bg-[#faf9f7] p-5 sm:p-6">

                    <div className="mb-6 flex items-start justify-between gap-4">

                        <div>
                            <p className="text-[10px] font-semibold tracking-[0.2em] text-[#18705c]">
                                {editingId ? 'EDIT CATEGORY' : 'NEW CATEGORY'}
                            </p>

                            <h2 className="mt-2 text-xl font-medium">
                                {editingId
                                    ? 'Update collection'
                                    : 'Create collection'}
                            </h2>
                        </div>


                        {editingId && (
                            <button
                                type="button"
                                onClick={resetForm}
                                disabled={imageUploading}
                                className="inline-flex items-center gap-1 rounded-full border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-600 disabled:opacity-50"
                            >
                                <X size={14} />
                                Cancel
                            </button>
                        )}

                    </div>


                    <form
                        onSubmit={submit}
                        className="space-y-4"
                    >

                        <Field
                            label="Category name"
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            required
                        />


                        <Field
                            label="Slug"
                            name="slug"
                            value={form.slug}
                            onChange={handleChange}
                            required
                        />


                        {/* CLOUD IMAGE UPLOADER */}

                        <ImageUploader
                            label="Category image"
                            purpose="category"
                            value={form.image_url}
                            alt={
                                form.name
                                    ? `${form.name} preview`
                                    : 'Category preview'
                            }
                            onChange={(imageUrl) =>
                                setForm((current) => ({
                                    ...current,
                                    image_url: imageUrl,
                                }))
                            }
                            onUploadingChange={setImageUploading}
                            disabled={saveMutation.isPending}
                        />


                        <label>
                            <span className="mb-2 block text-xs font-medium text-neutral-600">
                                Description
                            </span>

                            <textarea
                                name="description"
                                rows="4"
                                value={form.description}
                                onChange={handleChange}
                                className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-[#18705c]"
                            />
                        </label>


                        <button
                            type="submit"
                            disabled={
                                saveMutation.isPending ||
                                imageUploading
                            }
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#153d35] px-4 py-3 text-sm font-semibold text-white hover:bg-[#24584b] disabled:opacity-60"
                        >
                            <Plus size={15} />

                            {imageUploading
                                ? 'Uploading image...'
                                : saveMutation.isPending
                                    ? 'Saving...'
                                    : editingId
                                        ? 'Save category changes'
                                        : 'Create category'}
                        </button>

                    </form>

                </section>


                {/* ==================================================
                    CATEGORY LIST
                ================================================== */}

                <section className="rounded-3xl border border-neutral-200 bg-white p-5 sm:p-6">

                    <div className="mb-6">

                        <p className="text-[10px] font-semibold tracking-[0.2em] text-[#18705c]">
                            COLLECTIONS
                        </p>

                        <h2 className="mt-2 text-xl font-medium">
                            Current categories
                        </h2>

                        <p className="mt-1 text-xs text-neutral-500">
                            {categories.length} active categories
                        </p>

                    </div>


                    {categoriesQuery.isLoading ? (

                        <p className="text-sm text-neutral-500">
                            Loading categories...
                        </p>

                    ) : categoriesQuery.isError ? (

                        <ErrorBanner error={categoriesQuery.error} />

                    ) : categories.length === 0 ? (

                        <EmptyState text="No categories are available yet." />

                    ) : (

                        <div className="grid gap-3 sm:grid-cols-2">

                            {categories.map((category) => (

                                <article
                                    key={category.id}
                                    className="rounded-2xl border border-neutral-200 p-4"
                                >

                                    <div className="flex items-start gap-4">

                                        <img
                                            src={
                                                category.image_url ||
                                                '/product-placeholder.svg'
                                            }
                                            alt=""
                                            onError={handleImageError}
                                            className="h-16 w-16 shrink-0 rounded-xl bg-[#f4f3ee] object-contain p-2"
                                        />


                                        <div className="min-w-0 flex-1">

                                            <p className="truncate text-sm font-semibold">
                                                {category.name}
                                            </p>

                                            <p className="mt-1 truncate text-[10px] text-neutral-400">
                                                /{category.slug}
                                            </p>

                                            {category.description && (
                                                <p className="mt-3 line-clamp-2 text-xs leading-5 text-neutral-500">
                                                    {category.description}
                                                </p>
                                            )}

                                        </div>

                                    </div>


                                    <div className="mt-4 flex justify-end gap-2 border-t border-neutral-100 pt-3">

                                        <button
                                            type="button"
                                            onClick={() =>
                                                editCategory(category)
                                            }
                                            className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-600 hover:border-[#18705c] hover:text-[#18705c]"
                                        >
                                            <Pencil size={13} />
                                            Edit
                                        </button>


                                        <button
                                            type="button"
                                            disabled={
                                                deleteMutation.isPending
                                            }
                                            onClick={() => {
                                                if (
                                                    window.confirm(
                                                        `Delete ${category.name}? This is allowed only when no products use this category.`,
                                                    )
                                                ) {
                                                    deleteMutation.mutate(
                                                        category.id,
                                                    )
                                                }
                                            }}
                                            className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-2 text-xs font-semibold text-red-600 hover:border-red-200 disabled:opacity-50"
                                        >
                                            <Trash2 size={13} />
                                            Delete
                                        </button>

                                    </div>

                                </article>

                            ))}

                        </div>

                    )}

                </section>

            </div>

        </div>
    )
}


// ============================================================
// FORM FIELD
// ============================================================

function Field({
    label,
    name,
    type = 'text',
    ...props
}) {
    return (
        <label className="block">

            <span className="mb-2 block text-xs font-medium text-neutral-600">
                {label}
            </span>

            <input
                type={type}
                name={name}
                {...props}
                className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-[#18705c]"
            />

        </label>
    )
}


// ============================================================
// ERROR BANNER
// ============================================================

function ErrorBanner({
    error,
}) {
    return (
        <div
            role="alert"
            className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
            {getApiErrorMessage(
                error,
                'The requested action could not be completed.',
            )}
        </div>
    )
}


// ============================================================
// EMPTY STATE
// ============================================================

function EmptyState({
    text,
}) {
    return (
        <div className="rounded-2xl border border-dashed border-neutral-200 p-10 text-center text-sm text-neutral-500">
            {text}
        </div>
    )
}


export default AdminCategories