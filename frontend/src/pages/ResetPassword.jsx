import { useState } from 'react'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import { getApiErrorMessage } from '../api/client'
import ThemeToggle from '../components/layout/ThemeToggle'

function ResetPassword() {
    const [searchParams] = useSearchParams()
    const { resetPassword: submitResetPassword } = useAuth()
    const initialToken = searchParams.get('token') || ''

    const [token, setToken] = useState(initialToken)
    const [password, setPassword] = useState('')
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const handleSubmit = async (event) => {
        event.preventDefault()
        setSubmitting(true)
        setError('')
        setMessage('')

        try {
            const response = await submitResetPassword({
                token,
                password,
            })
            setMessage(response.message)
            setPassword('')
            setToken('')
        } catch (requestError) {
            setError(getApiErrorMessage(requestError, 'We could not reset your password. Please try again.'))
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
                            RESET PASSWORD
                        </p>
                        <h1 className="mt-2 text-3xl font-medium tracking-[-0.05em]">
                            Choose a new one
                        </h1>
                    </div>
                    <Link to="/login" className="text-xs font-medium text-neutral-500 hover:text-[#18705c]">
                        Login
                    </Link>
                </div>

                <form onSubmit={handleSubmit} autoComplete="off" className="space-y-5">
                    <label className="block">
                        <span className="mb-2 block text-xs font-medium text-neutral-600">
                            Reset token
                        </span>
                        <input
                            type="text"
                            value={token}
                            onChange={(event) => setToken(event.target.value)}
                            placeholder="Paste your reset token"
                            className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-3 text-sm outline-none transition focus:border-[#18705c]"
                            required
                        />
                    </label>

                    <label className="block">
                        <span className="mb-2 block text-xs font-medium text-neutral-600">
                            New password
                        </span>
                        <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-3 focus-within:border-[#18705c]">
                            <ShieldCheck size={16} className="text-neutral-400" />
                            <input
                                type="password"
                                autoComplete="new-password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                placeholder="Minimum 8 characters"
                                className="w-full border-0 bg-transparent text-sm outline-none placeholder:text-neutral-400"
                                minLength={8}
                                required
                            />
                        </div>
                    </label>

                    {message && (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
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
                        {submitting ? 'Updating password...' : 'Update password'}
                        <ArrowRight size={16} />
                    </button>
                </form>
            </div>
        </div>
    )
}

export default ResetPassword
