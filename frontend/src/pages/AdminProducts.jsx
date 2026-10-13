import {
    Pencil,
    Plus,
    Search,
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
    createProductAdmin,
    deleteProductAdmin,
    getCategories,
    getProducts,
    updateProductAdmin,
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
    sku: '',
    price: '',
    compare_at_price: '',
    stock_quantity: '10',
    brand: '',
    image_url: '',
    category_id: '',
    short_description: '',
    description: '',
    is_featured: false,
}


function AdminProducts() {
    const queryClient = useQueryClient()

    const [form, setForm] = useState(defaultForm)
    const [editingId, setEditingId] = useState(null)
    const [imageUploading, setImageUploading] = useState(false)
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)


    // ============================================================
    // CATEGORIES
    // ============================================================

    const categoriesQuery = useQuery({
        queryKey: ['categories'],
        queryFn: getCategories,
    })


    const categories = categoriesQuery.data ?? []


    // ============================================================
    // PRODUCTS
    // ============================================================

    const productsQuery = useQuery({
        queryKey: [
            'admin-products',
            page,
            search,
        ],

        queryFn: () =>
            getProducts({
                page,
                limit: 10,
                search,
                sortBy: 'newest',
            }),

        placeholderData: (previous) => previous,
    })


    const products =
        productsQuery.data?.items ?? []

    const pagination =
        productsQuery.data?.pagination


    // ============================================================
    // RESET FORM
    // ============================================================

    function resetForm() {
        setForm(defaultForm)
        setEditingId(null)
    }


    // ============================================================
    // SAVE PRODUCT
    // ============================================================

    const saveMutation = useMutation({
        mutationFn: (payload) =>
            editingId
                ? updateProductAdmin(
                    editingId,
                    payload,
                )
                : createProductAdmin(
                    payload,
                ),

        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['admin-products'],
            })

            queryClient.invalidateQueries({
                queryKey: ['admin-overview'],
            })

            queryClient.invalidateQueries({
                queryKey: ['shop-products'],
            })

            queryClient.invalidateQueries({
                queryKey: ['product'],
            })

            resetForm()
        },
    })


    // ============================================================
    // DELETE PRODUCT
    // ============================================================

    const deleteMutation = useMutation({
        mutationFn: deleteProductAdmin,

        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['admin-products'],
            })

            queryClient.invalidateQueries({
                queryKey: ['admin-overview'],
            })
        },
    })


    // ============================================================
    // FORM FIELD CHANGES
    // ============================================================

    function handleChange(event) {
        const {
            name,
            value,
            type,
            checked,
        } = event.target

        setForm((current) => ({
            ...current,

            [name]:
                type === 'checkbox'
                    ? checked
                    : value,
        }))
    }


    // ============================================================
    // SUBMIT PRODUCT
    // ============================================================

    function handleSubmit(event) {
        event.preventDefault()

        if (imageUploading) {
            return
        }

        const payload = {
            ...form,

            name: form.name.trim(),
            slug: form.slug.trim(),
            sku: form.sku.trim(),

            brand:
                form.brand.trim() || null,

            image_url:
                form.image_url.trim() || null,

            short_description:
                form.short_description.trim() || null,

            description:
                form.description.trim() || null,

            category_id:
                Number(form.category_id),

            price:
                Number(form.price),

            compare_at_price:
                form.compare_at_price
                    ? Number(form.compare_at_price)
                    : null,

            stock_quantity:
                Number(form.stock_quantity),

            is_featured:
                Boolean(form.is_featured),
        }

        saveMutation.mutate(payload)
    }


    // ============================================================
    // EDIT PRODUCT
    // ============================================================

    function editProduct(product) {
        setEditingId(product.id)

        setForm({
            name: product.name,
            slug: product.slug,
            sku: product.sku,

            price:
                String(product.price),

            compare_at_price:
                product.compare_at_price
                    ? String(product.compare_at_price)
                    : '',

            stock_quantity:
                String(product.stock_quantity),

            brand:
                product.brand ?? '',

            // Existing URLs remain in the form and preview.
            image_url:
                product.image_url ?? '',

            category_id:
                String(product.category_id),

            short_description:
                product.short_description ?? '',

            description:
                product.description ?? '',

            is_featured:
                Boolean(product.is_featured),
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

            <PageHeader
                eyebrow="CATALOG"
                title="Products"
                description="Create, update and manage the products available in your store."
                action={
                    !editingId && (
                        <button
                            type="button"
                            onClick={() =>
                                window.scrollTo({
                                    top: 0,
                                    behavior: 'smooth',
                                })
                            }
                            className="inline-flex items-center gap-2 rounded-full bg-[#153d35] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#24584b]"
                        >
                            <Plus size={14} />
                            Add product
                        </button>
                    )
                }
            />


            {/* MUTATION ERRORS */}

            {saveMutation.isError && (
                <ErrorBanner error={saveMutation.error} />
            )}

            {deleteMutation.isError && (
                <ErrorBanner error={deleteMutation.error} />
            )}


            <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">

                {/* ==================================================
                    PRODUCT FORM
                ================================================== */}

                <section className="rounded-3xl border border-neutral-200 bg-[#faf9f7] p-5 sm:p-6">

                    <div className="mb-6 flex items-start justify-between gap-4">

                        <div>
                            <p className="text-[10px] font-semibold tracking-[0.2em] text-[#18705c]">
                                {editingId ? 'EDIT PRODUCT' : 'NEW PRODUCT'}
                            </p>

                            <h2 className="mt-2 text-xl font-medium">
                                {editingId ? 'Update product' : 'Add a product'}
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
                        onSubmit={handleSubmit}
                        className="space-y-4"
                    >

                        <Field
                            label="Product name"
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            required
                        />


                        <div className="grid gap-4 sm:grid-cols-2">

                            <Field
                                label="Slug"
                                name="slug"
                                value={form.slug}
                                onChange={handleChange}
                                required
                            />

                            <Field
                                label="SKU"
                                name="sku"
                                value={form.sku}
                                onChange={handleChange}
                                required
                            />

                        </div>


                        <div className="grid gap-4 sm:grid-cols-2">

                            <Field
                                label="Price"
                                name="price"
                                type="number"
                                min="1"
                                step="0.01"
                                value={form.price}
                                onChange={handleChange}
                                required
                            />

                            <Field
                                label="Compare at price"
                                name="compare_at_price"
                                type="number"
                                min="1"
                                step="0.01"
                                value={form.compare_at_price}
                                onChange={handleChange}
                            />

                        </div>


                        <div className="grid gap-4 sm:grid-cols-2">

                            <Field
                                label="Stock quantity"
                                name="stock_quantity"
                                type="number"
                                min="0"
                                value={form.stock_quantity}
                                onChange={handleChange}
                                required
                            />


                            <label>
                                <span className="mb-2 block text-xs font-medium text-neutral-600">
                                    Category
                                </span>

                                <select
                                    name="category_id"
                                    value={form.category_id}
                                    onChange={handleChange}
                                    required
                                    className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-[#18705c]"
                                >
                                    <option value="">
                                        Select category
                                    </option>

                                    {categories.map((category) => (
                                        <option
                                            key={category.id}
                                            value={category.id}
                                        >
                                            {category.name}
                                        </option>
                                    ))}
                                </select>
                            </label>

                        </div>


                        <Field
                            label="Brand"
                            name="brand"
                            value={form.brand}
                            onChange={handleChange}
                        />


                        {/* CLOUD IMAGE UPLOADER */}

                        <ImageUploader
                            label="Product image"
                            purpose="product"
                            value={form.image_url}
                            alt={
                                form.name
                                    ? `${form.name} preview`
                                    : 'Product preview'
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


                        <Field
                            label="Short description"
                            name="short_description"
                            value={form.short_description}
                            onChange={handleChange}
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


                        <label className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3.5">

                            <input
                                type="checkbox"
                                name="is_featured"
                                checked={form.is_featured}
                                onChange={handleChange}
                                className="h-4 w-4 accent-[#153d35]"
                            />

                            <div>
                                <p className="text-sm font-medium">
                                    Featured product
                                </p>

                                <p className="mt-1 text-[11px] text-neutral-500">
                                    Show this product in featured collections.
                                </p>
                            </div>

                        </label>


                        <button
                            type="submit"
                            disabled={
                                saveMutation.isPending ||
                                imageUploading
                            }
                            className="w-full rounded-xl bg-[#153d35] px-4 py-3 text-sm font-semibold text-white hover:bg-[#24584b] disabled:opacity-60"
                        >
                            {imageUploading
                                ? 'Uploading image...'
                                : saveMutation.isPending
                                    ? 'Saving...'
                                    : editingId
                                        ? 'Save product changes'
                                        : 'Create product'}
                        </button>

                    </form>

                </section>


                {/* ==================================================
                    PRODUCT LIST
                ================================================== */}

                <section className="min-w-0 rounded-3xl border border-neutral-200 bg-white p-5 sm:p-6">

                    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">

                        <div>
                            <p className="text-[10px] font-semibold tracking-[0.2em] text-[#18705c]">
                                PRODUCT CATALOG
                            </p>

                            <h2 className="mt-2 text-xl font-medium">
                                Current products
                            </h2>

                            <p className="mt-1 text-xs text-neutral-500">
                                {pagination?.total ?? 0} active products
                            </p>
                        </div>


                        <div className="relative w-full max-w-xs">
                            <Search
                                size={15}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                            />

                            <input
                                type="search"
                                value={search}
                                onChange={(event) => {
                                    setSearch(event.target.value)
                                    setPage(1)
                                }}
                                placeholder="Search products..."
                                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#18705c]"
                            />
                        </div>

                    </div>


                    {productsQuery.isLoading ? (
                        <p className="text-sm text-neutral-500">
                            Loading products...
                        </p>
                    ) : productsQuery.isError ? (
                        <ErrorBanner error={productsQuery.error} />
                    ) : products.length === 0 ? (
                        <EmptyState text="No products match your search." />
                    ) : (

                        <div className="overflow-x-auto">

                            <table className="min-w-[760px] w-full text-left text-sm">

                                <thead>
                                    <tr className="border-b border-neutral-200 text-xs text-neutral-500">

                                        <th className="pb-3 pr-4 font-medium">
                                            Product
                                        </th>

                                        <th className="pb-3 pr-4 font-medium">
                                            Category
                                        </th>

                                        <th className="pb-3 pr-4 font-medium">
                                            Price
                                        </th>

                                        <th className="pb-3 pr-4 font-medium">
                                            Stock
                                        </th>

                                        <th className="pb-3 text-right font-medium">
                                            Actions
                                        </th>

                                    </tr>
                                </thead>


                                <tbody>
                                    {products.map((product) => (

                                        <tr
                                            key={product.id}
                                            className="border-b border-neutral-100 align-middle last:border-0"
                                        >

                                            <td className="py-4 pr-4">
                                                <div className="flex items-center gap-3">

                                                    <img
                                                        src={
                                                            product.image_url ||
                                                            '/product-placeholder.svg'
                                                        }
                                                        alt=""
                                                        onError={handleImageError}
                                                        className="h-12 w-12 rounded-xl bg-[#f4f3ee] object-contain p-1"
                                                    />

                                                    <div className="min-w-0">
                                                        <p className="truncate font-medium">
                                                            {product.name}
                                                        </p>

                                                        <p className="mt-1 text-[10px] text-neutral-400">
                                                            {product.sku}
                                                        </p>
                                                    </div>

                                                </div>
                                            </td>


                                            <td className="py-4 pr-4 text-xs text-neutral-500">
                                                {
                                                    categories.find(
                                                        (category) =>
                                                            category.id ===
                                                            product.category_id,
                                                    )?.name ?? '—'
                                                }
                                            </td>


                                            <td className="py-4 pr-4 font-semibold">
                                                ₹
                                                {Number(
                                                    product.price,
                                                ).toLocaleString('en-IN')}
                                            </td>


                                            <td className="py-4 pr-4">
                                                <span
                                                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${product.stock_quantity <= 5
                                                            ? 'bg-red-50 text-red-700'
                                                            : 'bg-emerald-50 text-emerald-700'
                                                        }`}
                                                >
                                                    {product.stock_quantity} units
                                                </span>
                                            </td>


                                            <td className="py-4 text-right">
                                                <div className="flex justify-end gap-2">

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            editProduct(product)
                                                        }
                                                        className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 hover:border-[#18705c] hover:text-[#18705c]"
                                                        aria-label={`Edit ${product.name}`}
                                                    >
                                                        <Pencil size={14} />
                                                    </button>


                                                    <button
                                                        type="button"
                                                        disabled={
                                                            deleteMutation.isPending
                                                        }
                                                        onClick={() => {
                                                            if (
                                                                window.confirm(
                                                                    `Delete ${product.name}?`,
                                                                )
                                                            ) {
                                                                deleteMutation.mutate(
                                                                    product.id,
                                                                )
                                                            }
                                                        }}
                                                        className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 hover:border-red-200 hover:text-red-600 disabled:opacity-50"
                                                        aria-label={`Delete ${product.name}`}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>

                                                </div>
                                            </td>

                                        </tr>
                                    ))}
                                </tbody>

                            </table>

                        </div>
                    )}


                    {pagination &&
                        pagination.total_pages > 1 && (
                            <Pagination
                                page={pagination.page}
                                totalPages={pagination.total_pages}
                                hasPrevious={pagination.has_previous}
                                hasNext={pagination.has_next}
                                onPrevious={() =>
                                    setPage((current) => current - 1)
                                }
                                onNext={() =>
                                    setPage((current) => current + 1)
                                }
                            />
                        )}

                </section>

            </div>

        </div>
    )
}


// ============================================================
// REUSABLE PAGE HEADER
// ============================================================

function PageHeader({
    eyebrow,
    title,
    description,
    action,
}) {
    return (
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">

            <div>
                <p className="text-[10px] font-semibold tracking-[0.22em] text-[#18705c]">
                    {eyebrow}
                </p>

                <h1 className="mt-2 text-3xl font-medium tracking-[-0.05em] sm:text-4xl">
                    {title}
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
                    {description}
                </p>
            </div>

            {action}

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
// PAGINATION
// ============================================================

function Pagination({
    page,
    totalPages,
    hasPrevious,
    hasNext,
    onPrevious,
    onNext,
}) {
    return (
        <div className="mt-6 flex items-center justify-center gap-4">

            <button
                type="button"
                disabled={!hasPrevious}
                onClick={onPrevious}
                className="rounded-full border border-neutral-200 px-4 py-2 text-xs font-semibold disabled:opacity-40"
            >
                Previous
            </button>

            <span className="text-xs text-neutral-500">
                Page {page} of {totalPages}
            </span>

            <button
                type="button"
                disabled={!hasNext}
                onClick={onNext}
                className="rounded-full border border-neutral-200 px-4 py-2 text-xs font-semibold disabled:opacity-40"
            >
                Next
            </button>

        </div>
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


export default AdminProducts