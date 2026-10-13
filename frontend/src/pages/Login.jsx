import { useEffect, useState } from 'react'
import { ArrowRight, LockKeyhole, Mail } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import { getApiErrorMessage } from '../api/client'
import ThemeToggle from '../components/layout/ThemeToggle'

function Login() {
    const { login, isAuthenticated, loading } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const from = location.state?.from || '/'

    const [form, setForm] = useState({
        email: '',
        password: '',
    })

    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)

    /*
     * Prevent browser from immediately restoring
     * previously saved credentials.
     */
    const [fieldsEnabled, setFieldsEnabled] = useState(false)

    useEffect(() => {
        if (!loading && isAuthenticated) {
            navigate(from, { replace: true })
        }
    }, [from, isAuthenticated, loading, navigate])

    /*
     * Always start with a clean login form.
     */
    useEffect(() => {
        const clearRestoredFields = () => {
            setForm({
                email: '',
                password: '',
            })
            setError('')
            setFieldsEnabled(false)
        }

        clearRestoredFields()

        window.addEventListener('pageshow', clearRestoredFields)

        const timer = window.setTimeout(() => {
            clearRestoredFields()
        }, 100)

        return () => {
            window.removeEventListener('pageshow', clearRestoredFields)
            window.clearTimeout(timer)
        }
    }, [])

    /*
     * Enable typing after user interacts
     * with a field.
     */
    const enableFields = () => {
        setFieldsEnabled(true)
    }

    const handleChange = (event) => {
        setForm((current) => ({
            ...current,
            [event.target.name]: event.target.value,
        }))
    }

    const handleSubmit = async (event) => {
        event.preventDefault()

        setSubmitting(true)
        setError('')

        try {
            await login({
                email: form.email.trim(),
                password: form.password,
            })

            setForm({
                email: '',
                password: '',
            })

            navigate(from, { replace: true })
        } catch (requestError) {
            setError(
                getApiErrorMessage(
                    requestError,
                    'Unable to sign in. Please check your credentials.',
                ),
            )
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#f5f3ee] px-4 py-10 text-neutral-900 sm:px-6 lg:px-8">
            <ThemeToggle />

            <div className="mx-auto max-w-5xl overflow-hidden rounded-[28px] border border-neutral-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
                <div className="grid lg:grid-cols-2">

                    {/* ==================================================
                        LEFT PANEL
                    ================================================== */}

                    <div className="auth-art relative hidden min-h-[620px] overflow-hidden p-10 text-white lg:flex lg:flex-col lg:justify-between">

                        <div>
                            <div className="text-3xl font-black tracking-[-0.08em]">
                                shop
                                <span className="text-[#c5efe0]">
                                    sphere
                                </span>
                            </div>

                            <p className="mt-8 max-w-sm text-sm uppercase tracking-[0.2em] text-white/75">
                                Welcome back
                            </p>

                            <h1 className="mt-4 max-w-md text-4xl font-medium tracking-[-0.05em]">
                                Shop smart, ship faster.
                            </h1>
                        </div>

                        <div className="space-y-5 text-sm text-white/80">

                            <p>
                                Access your saved cart, wishlist, and order history.
                            </p>

                            <div className="relative z-10 flex items-center gap-3 rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur-sm">

                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d4ebe2] text-[#163d35]">
                                    <LockKeyhole size={18} />
                                </div>

                                <div>
                                    <div className="font-medium text-white">
                                        Account-protected checkout
                                    </div>

                                    <div className="text-xs text-white/70">
                                        Your orders stay connected to your account
                                    </div>
                                </div>

                            </div>

                        </div>

                    </div>


                    {/* ==================================================
                        RIGHT PANEL
                    ================================================== */}

                    <div className="flex items-center justify-center px-5 py-10 sm:px-8 lg:px-12">

                        <div className="w-full max-w-md">

                            <div className="mb-8 flex items-center justify-between gap-3">

                                <div>

                                    <p className="text-[10px] font-semibold tracking-[0.22em] text-[#18705c]">
                                        SIGN IN
                                    </p>

                                    <h2 className="mt-2 text-3xl font-medium tracking-[-0.05em]">
                                        Welcome back
                                    </h2>

                                </div>

                                <Link
                                    to="/"
                                    className="text-xs font-medium text-neutral-500 hover:text-[#18705c]"
                                >
                                    Back home
                                </Link>

                            </div>


                            {/* ==================================================
                                FORM
                            ================================================== */}

                            <form
                                onSubmit={handleSubmit}
                                autoComplete="off"
                                className="space-y-5"
                            >

                                {/* EMAIL */}

                                <label className="block">

                                    <span className="mb-2 block text-xs font-medium text-neutral-600">
                                        Email address
                                    </span>

                                    <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-3 focus-within:border-[#18705c]">

                                        <Mail
                                            size={16}
                                            className="text-neutral-400"
                                        />

                                        <input
                                            type="email"
                                            name="email"
                                            value={form.email}
                                            onChange={handleChange}
                                            onFocus={enableFields}
                                            readOnly={!fieldsEnabled}
                                            placeholder="you@example.com"
                                            autoComplete="off"
                                            autoCorrect="off"
                                            autoCapitalize="none"
                                            spellCheck="false"
                                            inputMode="email"
                                            data-form-type="other"
                                            className="w-full border-0 bg-transparent text-sm outline-none placeholder:text-neutral-400"
                                            required
                                        />

                                    </div>

                                </label>


                                {/* PASSWORD */}

                                <label className="block">

                                    <span className="mb-2 block text-xs font-medium text-neutral-600">
                                        Password
                                    </span>

                                    <input
                                        type="password"
                                        name="password"
                                        value={form.password}
                                        onChange={handleChange}
                                        onFocus={enableFields}
                                        readOnly={!fieldsEnabled}
                                        placeholder="Enter your password"
                                        autoComplete="new-password"
                                        data-form-type="other"
                                        className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-3 text-sm outline-none transition focus:border-[#18705c]"
                                        required
                                    />

                                </label>


                                {/* ERROR */}

                                {error && (
                                    <div
                                        role="alert"
                                        className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600"
                                    >
                                        {error}
                                    </div>
                                )}


                                {/* SUBMIT */}

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#153d35] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-[#0f302a] disabled:cursor-not-allowed disabled:opacity-70"
                                >

                                    {submitting
                                        ? 'Signing in...'
                                        : 'Sign in'}

                                    <ArrowRight size={16} />

                                </button>

                            </form>


                            {/* ==================================================
                                LINKS
                            ================================================== */}

                            <div className="mt-6 flex items-center justify-between gap-3 text-sm text-neutral-600">

                                <Link
                                    to="/forgot-password"
                                    className="font-medium text-[#18705c] hover:underline"
                                >
                                    Forgot password?
                                </Link>

                                <Link
                                    to="/register"
                                    className="font-medium text-neutral-700 hover:text-[#18705c]"
                                >
                                    Create account
                                </Link>

                            </div>

                        </div>

                    </div>

                </div>
            </div>
        </div>
    )
}

export default Login