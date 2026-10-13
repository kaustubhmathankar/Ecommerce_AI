import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Edit3, MapPin, Plus, Trash2, X } from 'lucide-react'
import { Link } from 'react-router-dom'

import { createAddress, deleteAddress, getAddresses, setDefaultAddress, updateAddress } from '../api/addresses'
import { getApiErrorMessage } from '../api/client'
import Footer from '../components/layout/Footer'
import Navbar from '../components/layout/Navbar'

const emptyForm = {
    label: 'Home',
    full_name: '',
    phone: '',
    address_line: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'India',
    is_default: false,
}

const inputClass = 'w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-[#18705c] focus:bg-white'

function Addresses() {
    const queryClient = useQueryClient()
    const [formOpen, setFormOpen] = useState(false)
    const [editingAddress, setEditingAddress] = useState(null)
    const [form, setForm] = useState(emptyForm)
    const [formError, setFormError] = useState('')

    const addressesQuery = useQuery({
        queryKey: ['addresses'],
        queryFn: getAddresses,
    })

    const saveMutation = useMutation({
        mutationFn: ({ addressId, payload }) =>
            addressId ? updateAddress(addressId, payload) : createAddress(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['addresses'] })
            setFormOpen(false)
            setEditingAddress(null)
            setForm(emptyForm)
            setFormError('')
        },
        onError: (error) => {
            setFormError(getApiErrorMessage(error, 'Unable to save this address. Please try again.'))
        },
    })

    const defaultMutation = useMutation({
        mutationFn: setDefaultAddress,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addresses'] }),
    })

    const deleteMutation = useMutation({
        mutationFn: deleteAddress,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addresses'] }),
    })

    const addresses = addressesQuery.data ?? []

    const openCreate = () => {
        setEditingAddress(null)
        setForm({ ...emptyForm, is_default: addresses.length === 0 })
        setFormError('')
        setFormOpen(true)
    }

    const openEdit = (address) => {
        setEditingAddress(address)
        setForm({
            label: address.label,
            full_name: address.full_name,
            phone: address.phone,
            address_line: address.address_line,
            city: address.city,
            state: address.state,
            postal_code: address.postal_code,
            country: address.country,
            is_default: address.is_default,
        })
        setFormError('')
        setFormOpen(true)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const closeForm = () => {
        if (saveMutation.isPending) return
        setFormOpen(false)
        setEditingAddress(null)
        setForm(emptyForm)
        setFormError('')
    }

    const handleChange = (event) => {
        const { name, type, value, checked } = event.target
        setForm((current) => ({
            ...current,
            [name]: type === 'checkbox' ? checked : value,
        }))
        if (formError) setFormError('')
    }

    const handleSubmit = (event) => {
        event.preventDefault()
        saveMutation.mutate({
            addressId: editingAddress?.id,
            payload: form,
        })
    }

    const handleDelete = (address) => {
        const confirmed = window.confirm(
            `Delete the ${address.label} address? This cannot be undone.`,
        )
        if (confirmed) deleteMutation.mutate(address.id)
    }

    return (
        <div className="min-h-screen bg-white text-neutral-900">
            <Navbar />
            <main className="mx-auto max-w-[1200px] px-5 py-10 sm:px-8 sm:py-14">
                <div className="flex flex-wrap items-end justify-between gap-5 border-b border-neutral-200 pb-7">
                    <div>
                        <Link to="/orders" className="text-[10px] font-semibold tracking-[0.18em] text-neutral-400 hover:text-[#18705c]">
                            ACCOUNT
                        </Link>
                        <p className="mt-4 text-[10px] font-semibold tracking-[0.2em] text-[#18705c]">DELIVERY PREFERENCES</p>
                        <h1 className="mt-2 text-4xl font-medium tracking-[-0.05em]">Saved addresses</h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
                            Keep your delivery details ready for faster checkout. Your past orders keep their original delivery information.
                        </p>
                    </div>
                    {!formOpen && (
                        <button
                            type="button"
                            onClick={openCreate}
                            className="inline-flex items-center gap-2 rounded-full bg-[#153d35] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0f302a]"
                        >
                            <Plus size={16} /> Add address
                        </button>
                    )}
                </div>

                {formOpen && (
                    <section className="mt-8 rounded-[28px] border border-neutral-200 bg-white p-5 shadow-sm sm:p-8">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-[10px] font-semibold tracking-[0.2em] text-[#18705c]">
                                    {editingAddress ? 'UPDATE ADDRESS' : 'NEW ADDRESS'}
                                </p>
                                <h2 className="mt-2 text-2xl font-medium tracking-[-0.04em]">
                                    {editingAddress ? 'Edit delivery address' : 'Add a delivery address'}
                                </h2>
                            </div>
                            <button type="button" onClick={closeForm} className="rounded-full border border-neutral-200 p-2.5 text-neutral-500 hover:bg-neutral-50" aria-label="Close address form">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="mt-7 grid gap-4 sm:grid-cols-2">
                            <label>
                                <span className="mb-2 block text-xs font-medium text-neutral-600">Label</span>
                                <input name="label" value={form.label} onChange={handleChange} className={inputClass} maxLength={40} placeholder="Home" required />
                            </label>
                            <label>
                                <span className="mb-2 block text-xs font-medium text-neutral-600">Full name</span>
                                <input name="full_name" value={form.full_name} onChange={handleChange} autoComplete="name" className={inputClass} maxLength={120} required />
                            </label>
                            <label>
                                <span className="mb-2 block text-xs font-medium text-neutral-600">Phone</span>
                                <input name="phone" type="tel" value={form.phone} onChange={handleChange} autoComplete="tel" className={inputClass} maxLength={30} required />
                            </label>
                            <label>
                                <span className="mb-2 block text-xs font-medium text-neutral-600">Postal code</span>
                                <input name="postal_code" value={form.postal_code} onChange={handleChange} autoComplete="postal-code" className={inputClass} maxLength={20} required />
                            </label>
                            <label className="sm:col-span-2">
                                <span className="mb-2 block text-xs font-medium text-neutral-600">Street address</span>
                                <input name="address_line" value={form.address_line} onChange={handleChange} autoComplete="street-address" className={inputClass} maxLength={255} placeholder="House / flat, street, area" required />
                            </label>
                            <label>
                                <span className="mb-2 block text-xs font-medium text-neutral-600">City</span>
                                <input name="city" value={form.city} onChange={handleChange} autoComplete="address-level2" className={inputClass} maxLength={100} required />
                            </label>
                            <label>
                                <span className="mb-2 block text-xs font-medium text-neutral-600">State / region</span>
                                <input name="state" value={form.state} onChange={handleChange} autoComplete="address-level1" className={inputClass} maxLength={100} required />
                            </label>
                            <label>
                                <span className="mb-2 block text-xs font-medium text-neutral-600">Country</span>
                                <input name="country" value={form.country} onChange={handleChange} autoComplete="country-name" className={inputClass} maxLength={100} required />
                            </label>
                            <label className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 sm:mt-7">
                                <input name="is_default" type="checkbox" checked={form.is_default} onChange={handleChange} disabled={editingAddress?.is_default} className="h-4 w-4 accent-[#153d35]" />
                                <span>
                                    <span className="block text-sm font-medium">Use as default address</span>
                                    <span className="mt-0.5 block text-xs text-neutral-500">Preselect this address at checkout.</span>
                                </span>
                            </label>

                            {formError && (
                                <p role="alert" className="sm:col-span-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                    {formError}
                                </p>
                            )}

                            <div className="flex flex-col-reverse gap-3 pt-2 sm:col-span-2 sm:flex-row sm:justify-end">
                                <button type="button" onClick={closeForm} className="rounded-full border border-neutral-200 px-5 py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saveMutation.isPending} className="rounded-full bg-[#153d35] px-6 py-3 text-sm font-semibold text-white hover:bg-[#0f302a] disabled:cursor-not-allowed disabled:opacity-50">
                                    {saveMutation.isPending ? 'Saving…' : editingAddress ? 'Save changes' : 'Save address'}
                                </button>
                            </div>
                        </form>
                    </section>
                )}

                {addressesQuery.isLoading ? (
                    <div className="mt-8 grid gap-5 md:grid-cols-2">
                        {[1, 2].map((item) => <div key={item} className="h-64 animate-pulse rounded-[24px] bg-neutral-100" />)}
                    </div>
                ) : addressesQuery.isError ? (
                    <div role="alert" className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
                        {getApiErrorMessage(addressesQuery.error, 'Unable to load your saved addresses. Please refresh and try again.')}
                    </div>
                ) : addresses.length ? (
                    <div className="mt-8 grid gap-5 md:grid-cols-2">
                        {addresses.map((address) => (
                            <article key={address.id} className="rounded-[24px] border border-neutral-200 bg-[#faf9f7] p-5 sm:p-6">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e6f0eb] text-[#153d35]">
                                            <MapPin size={18} />
                                        </span>
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h2 className="text-base font-semibold">{address.label}</h2>
                                                {address.is_default && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-[#dcefe6] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#18705c]">
                                                        <Check size={11} /> Default
                                                    </span>
                                                )}
                                            </div>
                                            <p className="mt-1 text-xs text-neutral-500">{address.full_name} · {address.phone}</p>
                                        </div>
                                    </div>
                                </div>

                                <p className="mt-5 text-sm leading-6 text-neutral-600">
                                    {address.address_line}<br />
                                    {[address.city, address.state, address.postal_code].filter(Boolean).join(', ')}<br />
                                    {address.country}
                                </p>

                                <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-neutral-200 pt-4">
                                    {!address.is_default && (
                                        <button
                                            type="button"
                                            onClick={() => defaultMutation.mutate(address.id)}
                                            disabled={defaultMutation.isPending}
                                            className="rounded-full border border-neutral-200 px-3.5 py-2 text-xs font-semibold text-neutral-700 hover:bg-white disabled:opacity-50"
                                        >
                                            {defaultMutation.isPending ? 'Updating…' : 'Make default'}
                                        </button>
                                    )}
                                    <button type="button" onClick={() => openEdit(address)} className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3.5 py-2 text-xs font-semibold text-neutral-700 hover:bg-white">
                                        <Edit3 size={13} /> Edit
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(address)}
                                        disabled={deleteMutation.isPending}
                                        className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                                    >
                                        <Trash2 size={13} /> Delete
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                ) : (
                    <div className="mt-8 flex min-h-[340px] flex-col items-center justify-center rounded-[28px] border border-dashed border-neutral-300 bg-[#faf9f7] px-6 text-center">
                        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e6f0eb] text-[#153d35]">
                            <MapPin size={24} />
                        </span>
                        <h2 className="mt-5 text-2xl font-medium tracking-[-0.04em]">No saved addresses yet.</h2>
                        <p className="mt-2 max-w-md text-sm leading-6 text-neutral-500">Add your home, work, or any other delivery address once and reuse it at checkout.</p>
                        {!formOpen && (
                            <button type="button" onClick={openCreate} className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#153d35] px-5 py-3 text-sm font-semibold text-white hover:bg-[#0f302a]">
                                <Plus size={16} /> Add your first address
                            </button>
                        )}
                    </div>
                )}
            </main>
            <Footer />
        </div>
    )
}

export default Addresses
