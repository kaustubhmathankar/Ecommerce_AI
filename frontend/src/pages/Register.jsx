import { useState } from 'react'
import { ArrowRight, Mail, UserRound } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import { getApiErrorMessage } from '../api/client'
import ThemeToggle from '../components/layout/ThemeToggle'

function Register() {
    const { register } = useAuth()
    const navigate = useNavigate()
    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
    })
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [submitting, setSubmitting] = useState(false)

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
        setSuccess('')

        try {
            await register(form)
            setSuccess('Your account has been created. Redirecting to sign in...')
            setTimeout(() => navigate('/login'), 1200)
        } catch (requestError) {
            setError(getApiErrorMessage(requestError, 'We could not create your account right now.'))
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#f5f3ee] px-4 py-10 text-neutral-900 sm:px-6 lg:px-8">
            <ThemeToggle />
            <div className="mx-auto max-w-5xl overflow-hidden rounded-[28px] border border-neutral-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
                <div className="grid lg:grid-cols-2">
                    <div className="auth-art relative hidden min-h-[640px] overflow-hidden p-10 text-white lg:flex lg:flex-col lg:justify-between">
                        <Link to="/" className="text-3xl font-black tracking-[-0.08em]">
                            shop<span className="text-[#c5efe0]">sphere.</span>
                        </Link>
                        <div>
                            <p className="text-xs font-semibold tracking-[0.22em] text-white/75">GOOD FINDS START HERE</p>
                            <h2 className="mt-4 max-w-md text-4xl font-medium leading-tight tracking-[-0.05em]">
                                Make room for the things you love.
                            </h2>
                            <p className="mt-4 max-w-sm text-sm leading-6 text-white/80">
                                One account for your wishlist, checkout, and order history.
                            </p>
                        </div>
                    </div>
                    <div className="p-6 sm:p-8 lg:p-12">
                <div className="mb-8 flex items-center justify-between gap-3">
                    <div>
                        <p className="text-[10px] font-semibold tracking-[0.22em] text-[#18705c]">
                            CREATE ACCOUNT
                        </p>
                        <h1 className="mt-2 text-3xl font-medium tracking-[-0.05em]">
                            Join ShopSphere
                        </h1>
                    </div>
                    <Link to="/" className="text-xs font-medium text-neutral-500 hover:text-[#18705c]">
                        Home
                    </Link>
                </div>

                <form onSubmit={handleSubmit} autoComplete="off" className="space-y-5">
                    <label className="block">
                        <span className="mb-2 block text-xs font-medium text-neutral-600">
                            Full name
                        </span>
                        <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-3 focus-within:border-[#18705c]">
                            <UserRound size={16} className="text-neutral-400" />
                            <input
                                type="text"
                                name="name"
                                autoComplete="off"
                                value={form.name}
                                onChange={handleChange}
                                placeholder="Your name"
                                className="w-full border-0 bg-transparent text-sm outline-none placeholder:text-neutral-400"
                                required
                            />
                        </div>
                    </label>

                    <label className="block">
                        <span className="mb-2 block text-xs font-medium text-neutral-600">
                            Email address
                        </span>
                        <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-3 focus-within:border-[#18705c]">
                            <Mail size={16} className="text-neutral-400" />
                            <input
                                type="email"
                                name="email"
                                autoComplete="off"
                                value={form.email}
                                onChange={handleChange}
                                placeholder="you@example.com"
                                className="w-full border-0 bg-transparent text-sm outline-none placeholder:text-neutral-400"
                                required
                            />
                        </div>
                    </label>

                    <label className="block">
                        <span className="mb-2 block text-xs font-medium text-neutral-600">
                            Password
                        </span>
                        <input
                            type="password"
                            name="password"
                            autoComplete="new-password"
                            value={form.password}
                            onChange={handleChange}
                            placeholder="Create a password"
                            className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-3 text-sm outline-none transition focus:border-[#18705c]"
                            required
                            minLength={8}
                        />
                    </label>

                    {error && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                            {success}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={submitting}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#153d35] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-[#0f302a] disabled:opacity-70"
                    >
                        {submitting ? 'Creating account...' : 'Create account'}
                        <ArrowRight size={16} />
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-neutral-600">
                    Already have an account?{' '}
                    <Link to="/login" className="font-medium text-[#18705c] hover:underline">
                        Sign in
                    </Link>
                </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Register
