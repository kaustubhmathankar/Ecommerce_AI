import {
    Boxes,
    ClipboardList,
    LayoutDashboard,
    Package,
    Star,
    UsersRound,
} from 'lucide-react'

import {
    NavLink,
} from 'react-router-dom'


const navigation = [
    {
        to: '/admin',
        label: 'Dashboard',
        icon: LayoutDashboard,
        end: true,
    },
    {
        to: '/admin/products',
        label: 'Products',
        icon: Package,
    },
    {
        to: '/admin/categories',
        label: 'Categories',
        icon: Boxes,
    },
    {
        to: '/admin/orders',
        label: 'Orders',
        icon: ClipboardList,
    },
    {
        to: '/admin/customers',
        label: 'Customers',
        icon: UsersRound,
    },
    {
        to: '/admin/reviews',
        label: 'Reviews',
        icon: Star,
    },
]


function AdminSidebar({
    onNavigate,
}) {

    return (

        <aside className="admin-sidebar flex h-full flex-col text-white">

            <div className="border-b border-white/10 px-5 py-5">

                <p className="text-[10px] font-semibold tracking-[0.22em] text-white/50">
                    SHOPSPHERE
                </p>

                <h2 className="mt-2 text-lg font-semibold tracking-tight">
                    Admin Console
                </h2>

                <p className="mt-1 text-[11px] leading-5 text-white/50">
                    Manage your store from one place.
                </p>

            </div>


            <nav className="flex-1 space-y-1 overflow-y-auto p-3">

                {navigation.map(
                    ({
                        to,
                        label,
                        icon: Icon,
                        end,
                    }) => (

                        <NavLink
                            key={to}
                            to={to}
                            end={end}
                            onClick={
                                onNavigate
                            }
                            className={({
                                isActive,
                            }) =>
                                `flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition ${isActive
                                    ? 'bg-white text-[#153d35] shadow-sm'
                                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                                }`
                            }
                        >

                            <Icon
                                size={17}
                            />

                            <span>
                                {label}
                            </span>

                        </NavLink>

                    ),
                )}

            </nav>


            <div className="m-3 rounded-xl border border-white/10 bg-white/5 p-4">

                <p className="text-xs font-semibold">
                    Store management
                </p>

                <p className="mt-2 text-[11px] leading-5 text-white/55">
                    Product, order, category, customer and
                    review controls are available
                    from the admin workspace.
                </p>

            </div>

        </aside>
    )
}


export default AdminSidebar