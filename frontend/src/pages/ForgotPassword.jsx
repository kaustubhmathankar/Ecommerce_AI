import { useState } from 'react'
import { ArrowRight, Mail } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import { getApiErrorMessage } from '../api/client'
import ThemeToggle from '../components/layout/ThemeToggle'

function ForgotPassword() {
    const { forgotPassword } = useAuth()
    const [email, setEmail] = useState('')
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const handleSubmit = async (event) => {
        event.preventDefault()
        setSubmitting(true)
        setError('')
        setMessage('')

        try {
            const response = await forgotPassword(email)
            setMessage(
                response?.reset_token
                    ? `Reset token created in dev mode: ${response.reset_token}`
                    : 'If an account exists for that email, a reset link has been sent.',
            )
        } catch (requestError) {
            setError(getApiErrorMessage(requestError, 'Unable to process your request right now.'))
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#f5f3ee] px-4 py-10 text-neutral-900 sm:px-6 lg:px-8">
            <ThemeToggle />
            <div className="mx-auto max-w-md rounded-[28px] border border-neutral-200 bg-white p-6 shadow-[0_25px_70px_rgba(15,23,42,0.06)] sm:p-8">
                <div className="mb-8 flex items-center justify-between gap-3">
                    <div>
                        <p className="text-[10px] font-semibold tracking-[0.22em] text-[#18705c]">
                            PASSWORD RESET
                        </p>
                        <h1 className="mt-2 text-3xl font-medium tracking-[-0.05em]">
                            Forgot password?
                        </h1>
                    </div>
                    <Link to="/login" className="text-xs font-medium text-neutral-500 hover:text-[#18705c]">
                        Sign in
                    </Link>
                </div>

                <form onSubmit={handleSubmit} autoComplete="off" className="space-y-5">
                    <label className="block">
                        <span className="mb-2 block text-xs font-medium text-neutral-600">
                            Email address
                        </span>
                        <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-3 focus-within:border-[#18705c]">
                            <Mail size={16} className="text-neutral-400" />
                            <input
                                type="email"
                                autoComplete="off"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                placeholder="you@example.com"
                                className="w-full border-0 bg-transparent text-sm outline-none placeholder:text-neutral-400"
                                required
                            />
                        </div>
                    </label>

                    {message && (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 break-words">
                            {message}
                        </div>
                    )}

                    {error && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={submitting}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#153d35] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-[#0f302a] disabled:opacity-70"
                    >
                        {submitting ? 'Sending reset link...' : 'Send reset link'}
                        <ArrowRight size={16} />
                    </button>
                </form>
            </div>
        </div>
    )
}

export default ForgotPassword
