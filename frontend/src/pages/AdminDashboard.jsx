import {
    AlertTriangle,
    ArrowRight,
    CheckCircle2,
    ClipboardList,
    DollarSign,
    Package,
    ShoppingBag,
    UsersRound,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'

import { getAdminOverview } from '../api/products'
import { getApiErrorMessage } from '../api/client'


const currency = (amount) =>
    new Intl.NumberFormat(
        'en-IN',
        {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        },
    ).format(
        Number(amount) || 0,
    )


const number = (value) =>
    new Intl.NumberFormat(
        'en-IN',
    ).format(
        Number(value) || 0,
    )


const statusLabel = (status) =>
    String(status ?? '')
        .replaceAll('_', ' ')
        .replace(
            /\b\w/g,
            (letter) =>
                letter.toUpperCase(),
        )


function AdminDashboard() {
    const overviewQuery =
        useQuery({
            queryKey: [
                'admin-overview',
            ],

            queryFn:
                getAdminOverview,

            staleTime:
                60 * 1000,

            refetchOnWindowFocus:
                false,
        })

    if (
        overviewQuery.isLoading
    ) {
        return (
            <DashboardSkeleton />
        )
    }

    if (
        overviewQuery.isError
    ) {
        return (
            <div
                role="alert"
                className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700"
            >
                <p className="font-semibold">
                    Unable to load the
                    admin dashboard.
                </p>

                <p className="mt-2">
                    {getApiErrorMessage(
                        overviewQuery.error,
                        'Please try again.',
                    )}
                </p>

                <button
                    type="button"
                    onClick={() =>
                        overviewQuery.refetch()
                    }
                    className="mt-5 rounded-full bg-[#153d35] px-5 py-2.5 text-xs font-semibold text-white"
                >
                    TRY AGAIN
                </button>
            </div>
        )
    }

    const data =
        overviewQuery.data ??
        {}

    const totals =
        data.totals ??
        {}

    const sales =
        data.sales ??
        {}

    const orders =
        data.orders ??
        {}

    const customers =
        data.customers ??
        {}

    const inventory =
        data.inventory ??
        {}

    const recentOrders =
        Array.isArray(
            data.recent_orders,
        )
            ? data.recent_orders
            : []

    const topProducts =
        Array.isArray(
            data.top_products,
        )
            ? data.top_products
            : []

    const topCategories =
        Array.isArray(
            data.top_categories,
        )
            ? data.top_categories
            : []

    return (
        <div className="space-y-6">

            {/* HEADER */}

            <div className="flex flex-wrap items-end justify-between gap-4">

                <div>

                    <p className="text-[10px] font-semibold tracking-[0.22em] text-[#18705c]">
                        STORE OVERVIEW
                    </p>

                    <h1 className="mt-2 text-3xl font-medium tracking-[-0.05em] sm:text-4xl">
                        Welcome back,{' '}
                        {
                            data.user?.name ??
                            'Administrator'
                        }
                    </h1>

                    <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
                        Monitor your store,
                        orders, customers and
                        inventory from one
                        place.
                    </p>

                </div>

                <div className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-medium text-neutral-500">
                    Admin dashboard
                </div>

            </div>

            {/* PRIMARY METRICS */}

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

                <MetricCard
                    label="Total revenue"
                    value={currency(
                        sales.total_revenue,
                    )}
                    caption={`${currency(sales.month_revenue)} this month`}
                    icon={DollarSign}
                />

                <MetricCard
                    label="Total orders"
                    value={number(
                        orders.total,
                    )}
                    caption={`${number(orders.today)} placed today`}
                    icon={ShoppingBag}
                />

                <MetricCard
                    label="Customers"
                    value={number(
                        customers.total,
                    )}
                    caption={`${number(customers.new_this_month)} new this month`}
                    icon={UsersRound}
                />

                <MetricCard
                    label="Products"
                    value={number(
                        totals.products,
                    )}
                    caption={`${number(inventory.low_stock)} low-stock`}
                    icon={Package}
                />

            </section>

            {/* STORE STATUS */}

            <section className="rounded-3xl border border-neutral-200 bg-white p-5 sm:p-6">

                <div className="flex flex-wrap items-center justify-between gap-4">

                    <div>

                        <p className="text-[10px] font-semibold tracking-[0.2em] text-[#18705c]">
                            STORE STATUS
                        </p>

                        <h2 className="mt-2 text-xl font-medium tracking-tight">
                            What needs your attention
                        </h2>

                    </div>

                    <p className="text-xs text-neutral-400">
                        Current store activity
                    </p>

                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">

                    <StatusCard
                        label="Pending orders"
                        value={
                            orders.pending
                        }
                        icon={
                            ClipboardList
                        }
                        tone="amber"
                    />

                    <StatusCard
                        label="Delivered"
                        value={
                            orders.delivered
                        }
                        icon={
                            CheckCircle2
                        }
                        tone="green"
                    />

                    <StatusCard
                        label="Return requests"
                        value={
                            orders.return_requests
                        }
                        icon={
                            Package
                        }
                        tone="orange"
                    />

                    <StatusCard
                        label="Out of stock"
                        value={
                            inventory.out_of_stock
                        }
                        icon={
                            AlertTriangle
                        }
                        tone="red"
                    />

                </div>

            </section>

            {/* RECENT ORDERS */}

            <section className="rounded-3xl border border-neutral-200 bg-white p-5 sm:p-6">

                <div className="mb-6 flex items-center justify-between gap-4">

                    <div>

                        <p className="text-[10px] font-semibold tracking-[0.2em] text-[#18705c]">
                            RECENT ACTIVITY
                        </p>

                        <h2 className="mt-2 text-xl font-medium tracking-tight">
                            Recent orders
                        </h2>

                    </div>

                    <Link
                        to="/admin/orders"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#18705c]"
                    >
                        View all
                        <ArrowRight
                            size={13}
                        />
                    </Link>

                </div>

                {recentOrders.length ===
                    0 ? (
                    <EmptyState
                        text="No orders have been placed yet."
                    />
                ) : (
                    <div className="grid gap-3 md:grid-cols-2">

                        {recentOrders.map(
                            (
                                order,
                            ) => (
                                <div
                                    key={
                                        order.id
                                    }
                                    className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4"
                                >

                                    <div className="flex items-start justify-between gap-4">

                                        <div className="flex min-w-0 items-center gap-3">

                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#18705c]">
                                                <ShoppingBag
                                                    size={
                                                        17
                                                    }
                                                />
                                            </div>

                                            <div className="min-w-0">

                                                <p className="truncate text-sm font-semibold">
                                                    Order #
                                                    {
                                                        order.id
                                                    }
                                                </p>

                                                <p className="mt-1 truncate text-xs text-neutral-500">
                                                    {
                                                        order.full_name
                                                    }
                                                </p>

                                            </div>

                                        </div>

                                        <p className="shrink-0 text-sm font-semibold">
                                            {currency(
                                                order.total_amount,
                                            )}
                                        </p>

                                    </div>

                                    <div className="mt-4 flex items-center justify-between border-t border-neutral-200 pt-3">

                                        <span className="rounded-full bg-white px-2.5 py-1 text-[9px] font-semibold text-neutral-500">
                                            {statusLabel(
                                                order.status,
                                            )}
                                        </span>

                                        <span className="text-[9px] text-neutral-400">
                                            {order.created_at
                                                ? new Date(
                                                    order.created_at,
                                                ).toLocaleDateString(
                                                    'en-IN',
                                                )
                                                : '—'}
                                        </span>

                                    </div>

                                </div>
                            ),
                        )}

                    </div>
                )}

            </section>

            {/* PERFORMANCE */}

            <div className="grid gap-6 xl:grid-cols-2">

                <section className="rounded-3xl border border-neutral-200 bg-white p-5 sm:p-6">

                    <div className="mb-6">

                        <p className="text-[10px] font-semibold tracking-[0.2em] text-[#18705c]">
                            PERFORMANCE
                        </p>

                        <h2 className="mt-2 text-xl font-medium tracking-tight">
                            Top products
                        </h2>

                    </div>

                    {topProducts.length ===
                        0 ? (
                        <EmptyState
                            text="Product performance will appear after sales are recorded."
                        />
                    ) : (
                        <div className="space-y-4">

                            {topProducts.map(
                                (
                                    product,
                                    index,
                                ) => (
                                    <div
                                        key={
                                            product.id
                                        }
                                        className="flex items-center gap-3"
                                    >

                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f0f3ef] text-xs font-semibold text-[#18705c]">
                                            {index +
                                                1}
                                        </span>

                                        <div className="min-w-0 flex-1">

                                            <p className="truncate text-sm font-medium">
                                                {
                                                    product.name
                                                }
                                            </p>

                                            <p className="mt-1 text-[10px] text-neutral-400">
                                                {number(
                                                    product.units_sold,
                                                )}{' '}
                                                units sold
                                            </p>

                                        </div>

                                        <p className="text-sm font-semibold">
                                            {currency(
                                                product.revenue,
                                            )}
                                        </p>

                                    </div>
                                ),
                            )}

                        </div>
                    )}

                </section>

                <section className="rounded-3xl border border-neutral-200 bg-white p-5 sm:p-6">

                    <div className="mb-6">

                        <p className="text-[10px] font-semibold tracking-[0.2em] text-[#18705c]">
                            CATEGORIES
                        </p>

                        <h2 className="mt-2 text-xl font-medium tracking-tight">
                            Top categories
                        </h2>

                    </div>

                    {topCategories.length ===
                        0 ? (
                        <EmptyState
                            text="Category performance will appear after sales are recorded."
                        />
                    ) : (
                        <div className="space-y-4">

                            {topCategories.map(
                                (
                                    category,
                                    index,
                                ) => (
                                    <div
                                        key={
                                            category.id
                                        }
                                        className="rounded-2xl bg-neutral-50 p-4"
                                    >

                                        <div className="flex items-center justify-between gap-3">

                                            <div className="flex items-center gap-3">

                                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-semibold text-[#18705c]">
                                                    {
                                                        index +
                                                        1
                                                    }
                                                </span>

                                                <p className="text-sm font-medium">
                                                    {
                                                        category.name
                                                    }
                                                </p>

                                            </div>

                                            <p className="text-sm font-semibold">
                                                {currency(
                                                    category.revenue,
                                                )}
                                            </p>

                                        </div>

                                        <p className="mt-2 ml-11 text-[10px] text-neutral-400">
                                            {number(
                                                category.units_sold,
                                            )}{' '}
                                            units sold
                                        </p>

                                    </div>
                                ),
                            )}

                        </div>
                    )}

                </section>

            </div>

            {/* MONTHLY + INVENTORY */}

            <div className="grid gap-6 xl:grid-cols-2">

                <section className="rounded-3xl border border-neutral-200 bg-white p-5 sm:p-6">

                    <p className="text-[10px] font-semibold tracking-[0.2em] text-[#18705c]">
                        SALES SUMMARY
                    </p>

                    <h2 className="mt-2 text-xl font-medium tracking-tight">
                        This month
                    </h2>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2">

                        <SummaryBox
                            label="Revenue this month"
                            value={currency(
                                sales.month_revenue,
                            )}
                        />

                        <SummaryBox
                            label="Previous month"
                            value={currency(
                                sales.previous_month_revenue,
                            )}
                        />

                        <SummaryBox
                            label="Revenue change"
                            value={`${Number(sales.revenue_change_percent ?? 0).toFixed(1)}%`}
                        />

                        <SummaryBox
                            label="Today's revenue"
                            value={currency(
                                sales.today_revenue,
                            )}
                        />

                    </div>

                </section>

                <section className="rounded-3xl border border-neutral-200 bg-white p-5 sm:p-6">

                    <p className="text-[10px] font-semibold tracking-[0.2em] text-[#18705c]">
                        INVENTORY
                    </p>

                    <h2 className="mt-2 text-xl font-medium tracking-tight">
                        Stock overview
                    </h2>

                    <div className="mt-6 grid grid-cols-3 gap-3">

                        <SummaryBox
                            label="Active"
                            value={number(
                                inventory.active_products ??
                                totals.products ??
                                0,
                            )}
                        />

                        <SummaryBox
                            label="Low stock"
                            value={number(
                                inventory.low_stock ??
                                0,
                            )}
                        />

                        <SummaryBox
                            label="Out of stock"
                            value={number(
                                inventory.out_of_stock ??
                                0,
                            )}
                        />

                    </div>

                    <Link
                        to="/admin/products"
                        className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[#18705c]"
                    >
                        Manage products
                        <ArrowRight
                            size={13}
                        />
                    </Link>

                </section>

            </div>

        </div>
    )
}


function MetricCard({
    label,
    value,
    caption,
    icon: Icon,
}) {
    return (
        <div className="rounded-3xl border border-neutral-200 bg-white p-5">

            <div className="flex items-center justify-between gap-3">

                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                    {label}
                </span>

                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f0f3ef] text-[#18705c]">
                    <Icon size={18} />
                </span>

            </div>

            <p className="mt-5 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">
                {value}
            </p>

            <p className="mt-2 text-[10px] text-neutral-400">
                {caption}
            </p>

        </div>
    )
}


function StatusCard({
    label,
    value,
    icon: Icon,
    tone,
}) {
    const tones = {
        amber: {
            box: 'bg-amber-50',
            icon: 'text-amber-700',
        },

        green: {
            box: 'bg-emerald-50',
            icon: 'text-emerald-700',
        },

        orange: {
            box: 'bg-orange-50',
            icon: 'text-orange-700',
        },

        red: {
            box: 'bg-red-50',
            icon: 'text-red-700',
        },
    }

    const current =
        tones[tone] ??
        tones.amber

    return (
        <div
            className={`rounded-2xl p-4 ${current.box}`}
        >

            <div className="flex items-center justify-between gap-3">

                <p className="text-xs font-medium text-neutral-600">
                    {label}
                </p>

                <Icon
                    size={17}
                    className={
                        current.icon
                    }
                />

            </div>

            <p className="mt-4 text-2xl font-semibold tracking-tight">
                {number(value)}
            </p>

        </div>
    )
}


function SummaryBox({
    label,
    value,
}) {
    return (
        <div className="rounded-2xl bg-neutral-50 p-4">

            <p className="text-[10px] uppercase tracking-[0.12em] text-neutral-400">
                {label}
            </p>

            <p className="mt-2 text-lg font-semibold tracking-tight">
                {value}
            </p>

        </div>
    )
}


function EmptyState({
    text,
}) {
    return (
        <div className="flex min-h-28 items-center justify-center rounded-2xl border border-dashed border-neutral-200 p-6 text-center text-xs text-neutral-500">
            {text}
        </div>
    )
}


function DashboardSkeleton() {
    return (
        <div className="space-y-6">

            <div className="h-24 animate-pulse rounded-3xl bg-neutral-200" />

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

                {Array.from({
                    length: 4,
                }).map(
                    (_, index) => (
                        <div
                            key={
                                index
                            }
                            className="h-32 animate-pulse rounded-3xl bg-neutral-200"
                        />
                    ),
                )}

            </div>

            <div className="h-44 animate-pulse rounded-3xl bg-neutral-200" />

            <div className="h-80 animate-pulse rounded-3xl bg-neutral-200" />

        </div>
    )
}


export default AdminDashboard