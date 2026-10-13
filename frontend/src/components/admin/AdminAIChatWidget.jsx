import { useEffect, useMemo, useRef, useState } from 'react'
import {
    Activity,
    ArrowUpRight,
    Bot,
    CheckCircle2,
    ChevronDown,
    CircleHelp,
    Clock3,
    LoaderCircle,
    MessageCircle,
    PackageSearch,
    RotateCcw,
    Send,
    ShieldCheck,
    Sparkles,
    TrendingUp,
    X,
} from 'lucide-react'

import { askAdminAiChat } from '../../api/adminAiChat'
import { getApiErrorMessage } from '../../api/client'
import AdminAIChatMarkdown from './AdminAIChatMarkdown'
import './AdminAIChatWidget.css'

const SUGGESTIONS = [
    { label: 'Sales this month', prompt: 'How did sales and revenue perform this month?' },
    { label: 'Top products', prompt: 'Show me the top-selling products by revenue this month.' },
    { label: 'Low stock', prompt: 'Which active products are low on stock or out of stock?' },
    { label: 'Returns & refunds', prompt: 'Summarize returns, cancellations, payment attempts and refunds this month.' },
]

const INR = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
})

function money(value) {
    const number = Number(value)
    return INR.format(Number.isFinite(number) ? number : 0)
}

function number(value) {
    return new Intl.NumberFormat('en-IN').format(Number(value) || 0)
}

function AnalyticsTable({
    columns,
    rows,
    emptyMessage = 'No rows were returned for this query.',
}) {
    if (!rows?.length) {
        return <p className="shopsphere-ai-empty-table">{emptyMessage}</p>
    }

    return (
        <div className="shopsphere-ai-table-wrap">
            <table className="shopsphere-ai-table">
                <thead>
                    <tr>
                        {columns.map((column) => (
                            <th key={column.key}>{column.label}</th>
                        ))}
                    </tr>
                </thead>

                <tbody>
                    {rows.map((row, index) => (
                        <tr
                            key={`${
                                row.id ??
                                row.product_id ??
                                row.category_id ??
                                row.status ??
                                row.date ??
                                row.rating ??
                                index
                            }-${index}`}
                        >
                            {columns.map((column) => (
                                <td key={column.key}>
                                    {column.render
                                        ? column.render(row[column.key], row)
                                        : (row[column.key] ?? '—')}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

function Metric({ label, value, icon: Icon = Activity, accent = false }) {
    return (
        <div
            className={`shopsphere-ai-metric${
                accent ? ' shopsphere-ai-metric--accent' : ''
            }`}
        >
            <span className="shopsphere-ai-metric-icon">
                <Icon size={14} />
            </span>

            <span className="shopsphere-ai-metric-label">{label}</span>
            <strong>{value}</strong>
        </div>
    )
}

function AnalyticsResult({ item }) {
    const { tool, title, data = {} } = item

    const periodLabel = data.period?.start_date
        ? `${data.period.start_date} – ${data.period.end_date}`
        : 'Current snapshot'

    let content = null

    if (tool === 'sales_summary') {
        content = (
            <div className="shopsphere-ai-metrics-grid">
                <Metric
                    label="Estimated revenue"
                    value={money(data.revenue_estimate)}
                    icon={TrendingUp}
                    accent
                />
                <Metric
                    label="Orders"
                    value={number(data.orders)}
                    icon={Activity}
                />
                <Metric
                    label="Average order value"
                    value={money(data.average_order_value)}
                    icon={ArrowUpRight}
                />
                <Metric
                    label="Cancelled"
                    value={number(data.cancelled_orders)}
                    icon={RotateCcw}
                />
            </div>
        )
    } else if (tool === 'sales_trend') {
        const points = data.points ?? []
        const maxValue = Math.max(
            1,
            ...points.map((point) => Number(point.revenue) || 0),
        )

        content = (
            <div className="shopsphere-ai-trend">
                <div className="shopsphere-ai-trend-summary">
                    <strong>{money(data.revenue_estimate)}</strong>
                    <span>{number(data.total_orders)} orders in period</span>
                </div>

                {points.length ? (
                    points.slice(-14).map((point) => (
                        <div
                            className="shopsphere-ai-trend-row"
                            key={point.date}
                        >
                            <span>{point.date}</span>

                            <div className="shopsphere-ai-trend-track">
                                <div
                                    className="shopsphere-ai-trend-bar"
                                    style={{
                                        width: `${Math.max(
                                            2,
                                            ((Number(point.revenue) || 0) /
                                                maxValue) *
                                                100,
                                        )}%`,
                                    }}
                                />
                            </div>

                            <strong>{money(point.revenue)}</strong>
                        </div>
                    ))
                ) : (
                    <p className="shopsphere-ai-empty-table">
                        No daily order activity was found for this period.
                    </p>
                )}
            </div>
        )
    } else if (tool === 'orders_by_status') {
        content = (
            <AnalyticsTable
                columns={[
                    {
                        key: 'status',
                        label: 'Status',
                        render: (value) => value?.replaceAll('_', ' '),
                    },
                    { key: 'orders', label: 'Orders', render: number },
                    {
                        key: 'order_value',
                        label: 'Order value',
                        render: money,
                    },
                ]}
                rows={data.statuses ?? []}
            />
        )
    } else if (tool === 'top_products') {
        content = (
            <AnalyticsTable
                columns={[
                    { key: 'product_name', label: 'Product' },
                    { key: 'units_sold', label: 'Units', render: number },
                    { key: 'revenue', label: 'Revenue', render: money },
                ]}
                rows={data.products ?? []}
            />
        )
    } else if (tool === 'category_performance') {
        content = (
            <AnalyticsTable
                columns={[
                    { key: 'category_name', label: 'Category' },
                    { key: 'units_sold', label: 'Units', render: number },
                    { key: 'revenue', label: 'Revenue', render: money },
                ]}
                rows={data.categories ?? []}
            />
        )
    } else if (tool === 'inventory_overview') {
        content = (
            <>
                <div className="shopsphere-ai-metrics-grid">
                    <Metric
                        label="Active products"
                        value={number(data.active_products)}
                        icon={PackageSearch}
                    />
                    <Metric
                        label="Low stock"
                        value={number(data.low_stock_products)}
                        icon={Activity}
                        accent
                    />
                    <Metric
                        label="Out of stock"
                        value={number(data.out_of_stock_products)}
                        icon={CircleHelp}
                    />
                </div>

                <AnalyticsTable
                    columns={[
                        { key: 'product_name', label: 'Product' },
                        { key: 'sku', label: 'SKU' },
                        {
                            key: 'stock_quantity',
                            label: 'Units left',
                            render: number,
                        },
                    ]}
                    rows={data.products ?? []}
                />
            </>
        )
    } else if (tool === 'customer_insights') {
        content = (
            <>
                <div className="shopsphere-ai-metrics-grid">
                    <Metric
                        label="Customers"
                        value={number(data.total_customers)}
                        icon={Activity}
                    />
                    <Metric
                        label="New in period"
                        value={number(data.new_customers_in_period)}
                        icon={Sparkles}
                        accent
                    />
                    <Metric
                        label="Repeat buyers"
                        value={number(data.repeat_buyers_in_period)}
                        icon={TrendingUp}
                    />
                    <Metric
                        label="Repeat buyer rate"
                        value={`${Number(
                            data.repeat_buyer_rate_percent || 0,
                        ).toFixed(1)}%`}
                        icon={ArrowUpRight}
                    />
                </div>

                <AnalyticsTable
                    columns={[
                        { key: 'customer_name', label: 'Customer' },
                        { key: 'orders', label: 'Orders', render: number },
                        {
                            key: 'order_value',
                            label: 'Order value',
                            render: money,
                        },
                    ]}
                    rows={data.top_customers ?? []}
                />
            </>
        )
    } else if (tool === 'payment_refund_summary') {
        content = (
            <>
                <div className="shopsphere-ai-metrics-grid shopsphere-ai-metrics-grid--single">
                    <Metric
                        label="Recorded completed refunds"
                        value={money(data.completed_refund_amount)}
                        icon={RotateCcw}
                        accent
                    />
                </div>

                <p className="shopsphere-ai-table-heading">Payment attempts</p>

                <AnalyticsTable
                    columns={[
                        { key: 'status', label: 'Status' },
                        {
                            key: 'attempts',
                            label: 'Attempts',
                            render: number,
                        },
                        {
                            key: 'attempted_amount',
                            label: 'Attempted value',
                            render: money,
                        },
                    ]}
                    rows={data.payment_attempts ?? []}
                />

                <p className="shopsphere-ai-table-heading">Refund records</p>

                <AnalyticsTable
                    columns={[
                        { key: 'status', label: 'Status' },
                        { key: 'refunds', label: 'Count', render: number },
                        { key: 'amount', label: 'Amount', render: money },
                    ]}
                    rows={data.refunds ?? []}
                />
            </>
        )
    } else if (tool === 'returns_cancellations') {
        const statuses = Object.entries(data.status_counts ?? {}).map(
            ([status, orders]) => ({ status, orders }),
        )

        content = (
            <>
                <div className="shopsphere-ai-metrics-grid">
                    <Metric
                        label="Cancelled orders"
                        value={number(data.cancelled_orders)}
                        icon={X}
                    />
                    <Metric
                        label="Cancellation rate"
                        value={`${Number(
                            data.cancellation_rate_percent || 0,
                        ).toFixed(1)}%`}
                        icon={Activity}
                        accent
                    />
                    <Metric
                        label="Return lifecycle"
                        value={number(data.orders_in_return_lifecycle)}
                        icon={RotateCcw}
                    />
                    <Metric
                        label="Return lifecycle rate"
                        value={`${Number(
                            data.return_lifecycle_rate_percent || 0,
                        ).toFixed(1)}%`}
                        icon={ArrowUpRight}
                    />
                </div>

                <p className="shopsphere-ai-table-heading">Order states</p>

                <AnalyticsTable
                    columns={[
                        {
                            key: 'status',
                            label: 'Status',
                            render: (value) => value?.replaceAll('_', ' '),
                        },
                        { key: 'orders', label: 'Orders', render: number },
                    ]}
                    rows={statuses}
                />

                {data.common_cancellation_reasons?.length > 0 && (
                    <>
                        <p className="shopsphere-ai-table-heading">
                            Recorded cancellation reasons
                        </p>

                        <AnalyticsTable
                            columns={[
                                { key: 'reason', label: 'Reason' },
                                {
                                    key: 'count',
                                    label: 'Count',
                                    render: number,
                                },
                            ]}
                            rows={data.common_cancellation_reasons}
                        />
                    </>
                )}
            </>
        )
    } else if (tool === 'reviews_summary') {
        content = (
            <>
                <div className="shopsphere-ai-metrics-grid shopsphere-ai-metrics-grid--single">
                    <Metric
                        label="Reviews"
                        value={number(data.review_count)}
                        icon={MessageCircle}
                    />
                    <Metric
                        label="Average rating"
                        value={`${Number(data.average_rating || 0).toFixed(2)} / 5`}
                        icon={Sparkles}
                        accent
                    />
                </div>

                <AnalyticsTable
                    columns={[
                        {
                            key: 'rating',
                            label: 'Rating',
                            render: (value) => `${value} / 5`,
                        },
                        { key: 'reviews', label: 'Reviews', render: number },
                    ]}
                    rows={data.rating_distribution ?? []}
                />
            </>
        )
    }

    return (
        <section className="shopsphere-ai-result-card">
            <div className="shopsphere-ai-result-heading">
                <div className="shopsphere-ai-result-icon">
                    <Activity size={14} />
                </div>

                <div>
                    <h4>{title}</h4>
                    <p>{periodLabel}</p>
                </div>
            </div>

            {content}

            {data.note && (
                <p className="shopsphere-ai-data-note">{data.note}</p>
            )}
        </section>
    )
}

function AdminAIChatWidget() {
    const [open, setOpen] = useState(false)
    const [input, setInput] = useState('')
    const [sending, setSending] = useState(false)
    const [notice, setNotice] = useState('')
    const [mode, setMode] = useState('')

    const [messages, setMessages] = useState([
        {
            id: 'welcome',
            role: 'assistant',
            content:
                'Hello! I’m your ShopSphere AI Analyst. Ask me about sales, orders, products, inventory, customers, payments, returns, refunds or reviews. I’ll ground analytics in your store database.',
        },
    ])

    const scrollRef = useRef(null)
    const inputRef = useRef(null)

    const priorHistory = useMemo(
        () =>
            messages
                .filter(
                    (message) =>
                        (message.role === 'user' ||
                            message.role === 'assistant') &&
                        message.id !== 'welcome',
                )
                .slice(-10)
                .map(({ role, content }) => ({
                    role,
                    content: content.slice(0, 3000),
                })),
        [messages],
    )

    useEffect(() => {
        if (open && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages, open, sending])

    useEffect(() => {
        if (open) inputRef.current?.focus()
    }, [open])

    const submitQuestion = async (event) => {
        event?.preventDefault()

        const question = input.trim()
        if (!question || sending) return

        const userMessage = {
            id: `${Date.now()}-user`,
            role: 'user',
            content: question,
        }

        const history = priorHistory

        setMessages((current) => [...current, userMessage])
        setInput('')
        setSending(true)
        setNotice('')

        try {
            const result = await askAdminAiChat(question, history)

            setMode(result.mode || 'ai')
            setNotice(result.notice || '')

            setMessages((current) => [
                ...current,
                {
                    id: `${Date.now()}-assistant`,
                    role: 'assistant',
                    content: result.answer,
                    analytics: result.analytics || [],
                    mode: result.mode,
                },
            ])
        } catch (error) {
            const detail =
                typeof error?.response?.data?.detail === 'string' &&
                error.response.data.detail.trim()
                    ? error.response.data.detail
                    : getApiErrorMessage(
                          error,
                          'The analyst could not complete this request.',
                      )

            setMessages((current) => [
                ...current,
                {
                    id: `${Date.now()}-error`,
                    role: 'assistant',
                    content: detail,
                    error: true,
                },
            ])
        } finally {
            setSending(false)
        }
    }

    const resetConversation = () => {
        setMessages([
            {
                id: `welcome-${Date.now()}`,
                role: 'assistant',
                content:
                    'New conversation started. What would you like to understand about ShopSphere?',
            },
        ])

        setNotice('')
        setMode('')
        setInput('')
    }

    return (
        <div className="shopsphere-ai-widget" aria-live="polite">
            {open && (
                <section
                    className="shopsphere-ai-panel"
                    aria-label="ShopSphere AI Analyst chat"
                >
                    <header className="shopsphere-ai-header">
                        <div className="shopsphere-ai-avatar">
                            <Bot size={21} />
                        </div>

                        <div className="shopsphere-ai-header-copy">
                            <div className="shopsphere-ai-title-row">
                                <h2>ShopSphere AI</h2>
                                <span className="shopsphere-ai-live-dot" />
                            </div>

                            <p>Admin analytics assistant</p>
                        </div>

                        <button
                            type="button"
                            className="shopsphere-ai-header-action"
                            onClick={resetConversation}
                            aria-label="Start a new conversation"
                            title="New conversation"
                        >
                            <RotateCcw size={16} />
                        </button>

                        <button
                            type="button"
                            className="shopsphere-ai-header-action"
                            onClick={() => setOpen(false)}
                            aria-label="Minimize ShopSphere AI"
                        >
                            <ChevronDown size={19} />
                        </button>
                    </header>

                    <div className="shopsphere-ai-trust-row">
                        <ShieldCheck size={13} />
                        <span>Admin-only · Read-only business analytics</span>
                    </div>

                    {notice && (
                        <div
                            className={`shopsphere-ai-notice${
                                mode === 'analytics_only'
                                    ? ' shopsphere-ai-notice--soft'
                                    : ''
                            }`}
                        >
                            {mode === 'analytics_only' ? (
                                <CircleHelp size={14} />
                            ) : (
                                <CheckCircle2 size={14} />
                            )}
                            <span>{notice}</span>
                        </div>
                    )}

                    <div className="shopsphere-ai-messages" ref={scrollRef}>
                        {messages.map((message) => (
                            <div
                                className={`shopsphere-ai-message-row shopsphere-ai-message-row--${message.role}`}
                                key={message.id}
                            >
                                {message.role === 'assistant' && (
                                    <div
                                        className={`shopsphere-ai-message-avatar${
                                            message.error ? ' is-error' : ''
                                        }`}
                                    >
                                        <Bot size={15} />
                                    </div>
                                )}

                                <div
                                    className={`shopsphere-ai-message${
                                        message.role === 'user'
                                            ? ' shopsphere-ai-message--user'
                                            : ''
                                    }${
                                        message.error
                                            ? ' shopsphere-ai-message--error'
                                            : ''
                                    }`}
                                >
                                    {message.role === 'assistant' ? (
                                        <div className="shopsphere-ai-message-text shopsphere-ai-markdown-host">
                                            <AdminAIChatMarkdown
                                                content={message.content}
                                            />
                                        </div>
                                    ) : (
                                        <p className="shopsphere-ai-message-text">
                                            {message.content}
                                        </p>
                                    )}

                                    {message.analytics?.length > 0 && (
                                        <div className="shopsphere-ai-results">
                                            {message.analytics.map(
                                                (item, index) => (
                                                    <AnalyticsResult
                                                        item={item}
                                                        key={`${item.tool}-${index}`}
                                                    />
                                                ),
                                            )}
                                        </div>
                                    )}

                                    {message.mode === 'ai' &&
                                        message.analytics?.length > 0 && (
                                            <p className="shopsphere-ai-grounding">
                                                <ShieldCheck size={12} />
                                                Based on live ShopSphere database queries
                                            </p>
                                        )}
                                </div>
                            </div>
                        ))}

                        {messages.length === 1 && !sending && (
                            <div className="shopsphere-ai-suggestions">
                                <p>Try asking</p>

                                {SUGGESTIONS.map((suggestion) => (
                                    <button
                                        type="button"
                                        key={suggestion.label}
                                        onClick={() =>
                                            setInput(suggestion.prompt)
                                        }
                                    >
                                        <Sparkles size={13} />
                                        {suggestion.label}
                                        <ArrowUpRight size={13} />
                                    </button>
                                ))}
                            </div>
                        )}

                        {sending && (
                            <div className="shopsphere-ai-thinking">
                                <span className="shopsphere-ai-message-avatar">
                                    <Bot size={15} />
                                </span>

                                <div>
                                    <LoaderCircle
                                        size={15}
                                        className="shopsphere-ai-spinner"
                                    />
                                    <span>Checking store analytics…</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <form
                        className="shopsphere-ai-composer"
                        onSubmit={submitQuestion}
                    >
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(event) => setInput(event.target.value)}
                            onKeyDown={(event) => {
                                if (
                                    event.key === 'Enter' &&
                                    !event.shiftKey
                                ) {
                                    event.preventDefault()
                                    submitQuestion()
                                }
                            }}
                            placeholder="Ask about your store…"
                            rows={1}
                            maxLength={2000}
                            aria-label="Ask ShopSphere AI a question"
                            disabled={sending}
                        />

                        <button
                            type="submit"
                            disabled={!input.trim() || sending}
                            aria-label="Send question"
                        >
                            {sending ? (
                                <LoaderCircle
                                    size={17}
                                    className="shopsphere-ai-spinner"
                                />
                            ) : (
                                <Send size={17} />
                            )}
                        </button>
                    </form>

                    <div className="shopsphere-ai-footer">
                        <Clock3 size={11} />
                        Analytics reflect records currently stored in ShopSphere
                    </div>
                </section>
            )}

            {!open && (
                <div className="shopsphere-ai-launcher-wrap">
                    <button
                        type="button"
                        className="shopsphere-ai-launcher-label"
                        onClick={() => setOpen(true)}
                    >
                        <span>Ask ShopSphere AI</span>
                        <small>Store insights, instantly</small>
                    </button>

                    <button
                        type="button"
                        className="shopsphere-ai-launcher"
                        onClick={() => setOpen(true)}
                        aria-label="Open ShopSphere AI Analyst"
                    >
                        <span className="shopsphere-ai-launcher-inner">
                            <Bot size={25} strokeWidth={2.25} />
                        </span>
                        <span className="shopsphere-ai-launcher-pulse" />
                    </button>
                </div>
            )}
        </div>
    )
}

export default AdminAIChatWidget