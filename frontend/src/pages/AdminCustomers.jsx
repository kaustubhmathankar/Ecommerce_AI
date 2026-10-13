import {
    Search,
    ShieldCheck,
    UserCheck,
    UserX,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import {
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query'

import {
    getUsersAdmin,
    toggleUserStatusAdmin,
    updateUserRoleAdmin,
} from '../api/products'
import { getApiErrorMessage } from '../api/client'
import { useAuth } from '../context/AuthContext'


function AdminCustomers() {
    const queryClient = useQueryClient()
    const { user } = useAuth()

    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [roleFilter, setRoleFilter] = useState('all')

    const usersQuery = useQuery({
        queryKey: ['admin-users'],
        queryFn: getUsersAdmin,
    })

    const statusMutation = useMutation({
        mutationFn: ({ userId, isActive }) =>
            toggleUserStatusAdmin(
                userId,
                isActive,
            ),

        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['admin-users'],
            })

            queryClient.invalidateQueries({
                queryKey: ['admin-overview'],
            })
        },
    })

    const roleMutation = useMutation({
        mutationFn: ({ userId, role }) =>
            updateUserRoleAdmin(
                userId,
                role,
            ),

        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['admin-users'],
            })

            queryClient.invalidateQueries({
                queryKey: ['admin-overview'],
            })
        },
    })

    const users = useMemo(
        () =>
            Array.isArray(usersQuery.data)
                ? usersQuery.data
                : [],
        [usersQuery.data],
    )

    const filteredUsers = useMemo(() => {
        const term = search.trim().toLowerCase()

        return users.filter((member) => {
            const name = String(
                member?.name ?? '',
            ).toLowerCase()

            const email = String(
                member?.email ?? '',
            ).toLowerCase()

            const role = String(
                member?.role ?? '',
            ).toLowerCase()

            const isActive = Boolean(
                member?.is_active,
            )

            const matchesSearch =
                !term ||
                name.includes(term) ||
                email.includes(term)

            const matchesStatus =
                statusFilter === 'all' ||
                (
                    statusFilter === 'active'
                        ? isActive
                        : !isActive
                )

            const matchesRole =
                roleFilter === 'all' ||
                role === roleFilter

            return (
                matchesSearch &&
                matchesStatus &&
                matchesRole
            )
        })
    }, [
        users,
        search,
        statusFilter,
        roleFilter,
    ])

    const handleToggleStatus = (member) => {
        if (!member?.id) {
            return
        }

        statusMutation.mutate({
            userId: member.id,
            isActive: !Boolean(
                member.is_active,
            ),
        })
    }

    const handleRoleChange = (
        member,
        event,
    ) => {
        if (!member?.id) {
            return
        }

        const role = event.target.value

        if (
            role !== 'customer' &&
            role !== 'admin'
        ) {
            return
        }

        roleMutation.mutate({
            userId: member.id,
            role,
        })
    }

    return (
        <div>
            <div className="mb-8">
                <p className="text-[10px] font-semibold tracking-[0.22em] text-[#18705c]">
                    MEMBERS
                </p>

                <h1 className="mt-2 text-3xl font-medium tracking-[-0.05em] sm:text-4xl">
                    Customers
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
                    Review customer accounts,
                    manage access and control
                    administrator roles.
                </p>
            </div>

            {(statusMutation.isError ||
                roleMutation.isError) && (
                    <div
                        role="alert"
                        className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                    >
                        {getApiErrorMessage(
                            statusMutation.error ||
                            roleMutation.error,
                            'The requested customer update could not be completed.',
                        )}
                    </div>
                )}

            <section className="rounded-3xl border border-neutral-200 bg-white p-5 sm:p-6">
                <div className="mb-6 flex flex-wrap gap-3">
                    <div className="relative min-w-[220px] flex-1">
                        <Search
                            size={15}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                        />

                        <input
                            type="search"
                            value={search}
                            onChange={(event) =>
                                setSearch(
                                    event.target.value,
                                )
                            }
                            placeholder="Search by name or email..."
                            className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#18705c]"
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(event) =>
                            setStatusFilter(
                                event.target.value,
                            )
                        }
                        className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-[#18705c]"
                    >
                        <option value="all">
                            All statuses
                        </option>

                        <option value="active">
                            Active
                        </option>

                        <option value="inactive">
                            Inactive
                        </option>
                    </select>

                    <select
                        value={roleFilter}
                        onChange={(event) =>
                            setRoleFilter(
                                event.target.value,
                            )
                        }
                        className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-[#18705c]"
                    >
                        <option value="all">
                            All roles
                        </option>

                        <option value="customer">
                            Customer
                        </option>

                        <option value="admin">
                            Admin
                        </option>
                    </select>
                </div>

                {usersQuery.isLoading ? (
                    <p className="text-sm text-neutral-500">
                        Loading customers...
                    </p>
                ) : usersQuery.isError ? (
                    <div
                        role="alert"
                        className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                    >
                        {getApiErrorMessage(
                            usersQuery.error,
                            'Unable to load customers.',
                        )}
                    </div>
                ) : (
                    <>
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <p className="text-xs text-neutral-500">
                                Showing{' '}
                                <span className="font-semibold text-neutral-700">
                                    {filteredUsers.length}
                                </span>
                                <span className="px-1">
                                    of
                                </span>
                                <span className="font-semibold text-neutral-700">
                                    {users.length}
                                </span>
                                <span className="pl-1">
                                    users
                                </span>
                            </p>
                        </div>

                        {filteredUsers.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-neutral-200 p-10 text-center">
                                <p className="text-sm font-medium text-neutral-700">
                                    No customers found
                                </p>

                                <p className="mt-2 text-xs text-neutral-500">
                                    Try changing your search
                                    or filters.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-[760px] w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-neutral-200 text-xs text-neutral-500">
                                            <th className="pb-3 pr-4 font-medium">
                                                Customer
                                            </th>

                                            <th className="pb-3 pr-4 font-medium">
                                                Joined
                                            </th>

                                            <th className="pb-3 pr-4 font-medium">
                                                Role
                                            </th>

                                            <th className="pb-3 pr-4 font-medium">
                                                Status
                                            </th>

                                            <th className="pb-3 text-right font-medium">
                                                Access
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {filteredUsers.map(
                                            (member) => {
                                                const isSelf =
                                                    member.id ===
                                                    user?.id

                                                const isActive =
                                                    Boolean(
                                                        member.is_active,
                                                    )

                                                const role =
                                                    member.role ===
                                                        'admin'
                                                        ? 'admin'
                                                        : 'customer'

                                                return (
                                                    <tr
                                                        key={
                                                            member.id
                                                        }
                                                        className="border-b border-neutral-100 last:border-0"
                                                    >
                                                        <td className="py-4 pr-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f0f3ef] text-[#18705c]">
                                                                    {role ===
                                                                        'admin' ? (
                                                                        <ShieldCheck
                                                                            size={
                                                                                17
                                                                            }
                                                                        />
                                                                    ) : (
                                                                        <UserCheck
                                                                            size={
                                                                                17
                                                                            }
                                                                        />
                                                                    )}
                                                                </div>

                                                                <div className="min-w-0">
                                                                    <p className="truncate font-medium">
                                                                        {member.name ||
                                                                            'Unknown user'}
                                                                    </p>

                                                                    <p className="mt-1 truncate text-xs text-neutral-400">
                                                                        {member.email ||
                                                                            'No email'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        <td className="py-4 pr-4 text-xs text-neutral-500">
                                                            {member.created_at
                                                                ? new Date(
                                                                    member.created_at,
                                                                ).toLocaleDateString(
                                                                    'en-IN',
                                                                )
                                                                : '—'}
                                                        </td>

                                                        <td className="py-4 pr-4">
                                                            <select
                                                                value={
                                                                    role
                                                                }
                                                                disabled={
                                                                    isSelf ||
                                                                    roleMutation.isPending
                                                                }
                                                                onChange={(
                                                                    event,
                                                                ) =>
                                                                    handleRoleChange(
                                                                        member,
                                                                        event,
                                                                    )
                                                                }
                                                                className="rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-2 text-xs outline-none focus:border-[#18705c] disabled:opacity-50"
                                                            >
                                                                <option value="customer">
                                                                    Customer
                                                                </option>

                                                                <option value="admin">
                                                                    Admin
                                                                </option>
                                                            </select>

                                                            {isSelf && (
                                                                <p className="mt-1 text-[9px] text-neutral-400">
                                                                    Your account
                                                                </p>
                                                            )}
                                                        </td>

                                                        <td className="py-4 pr-4">
                                                            <span
                                                                className={`rounded-full px-2.5 py-1.5 text-[10px] font-semibold ${isActive
                                                                        ? 'bg-emerald-50 text-emerald-700'
                                                                        : 'bg-neutral-100 text-neutral-500'
                                                                    }`}
                                                            >
                                                                {isActive
                                                                    ? 'Active'
                                                                    : 'Inactive'}
                                                            </span>
                                                        </td>

                                                        <td className="py-4 text-right">
                                                            <button
                                                                type="button"
                                                                disabled={
                                                                    isSelf ||
                                                                    statusMutation.isPending
                                                                }
                                                                onClick={() =>
                                                                    handleToggleStatus(
                                                                        member,
                                                                    )
                                                                }
                                                                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${isActive
                                                                        ? 'border border-red-200 text-red-600 hover:bg-red-50'
                                                                        : 'bg-[#153d35] text-white hover:bg-[#24584b]'
                                                                    }`}
                                                            >
                                                                {isActive ? (
                                                                    <>
                                                                        <UserX
                                                                            size={
                                                                                13
                                                                            }
                                                                        />
                                                                        Deactivate
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <UserCheck
                                                                            size={
                                                                                13
                                                                            }
                                                                        />
                                                                        Activate
                                                                    </>
                                                                )}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                )
                                            },
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </section>
        </div>
    )
}

export default AdminCustomers