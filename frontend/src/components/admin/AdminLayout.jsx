import {
    LogOut,
    Menu,
    Moon,
    Store,
    Sun,
    X,
} from 'lucide-react'

import {
    Link,
    Outlet,
} from 'react-router-dom'

import { useState } from 'react'

import AdminSidebar from './AdminSidebar'
import AdminAIChatWidget from './AdminAIChatWidget'

import NotificationBell
    from '../layout/NotificationBell'

import {
    useAuth,
} from '../../context/AuthContext'

import {
    useTheme,
} from '../../context/ThemeContext'


function AdminLayout() {

    const {
        user,
        logout,
    } = useAuth()


    const {
        theme,
        toggleTheme,
    } = useTheme()


    const [
        mobileOpen,
        setMobileOpen,
    ] = useState(false)


    const handleLogout = () => {

        setMobileOpen(false)

        logout()
    }


    return (

        <div className="admin-shell min-h-screen bg-[#f4f5f1] text-neutral-900">

            {/* ==================================================
                DESKTOP SIDEBAR
            ================================================== */}

            <aside className="fixed inset-y-0 left-0 z-40 hidden w-[250px] lg:block">

                <AdminSidebar />

            </aside>


            {/* ==================================================
                MOBILE SIDEBAR
            ================================================== */}

            {mobileOpen && (

                <div className="fixed inset-0 z-50 lg:hidden">

                    <button
                        type="button"
                        aria-label="Close admin navigation"
                        onClick={() =>
                            setMobileOpen(
                                false,
                            )
                        }
                        className="absolute inset-0 bg-black/40"
                    />


                    <aside className="absolute inset-y-0 left-0 w-[280px] shadow-2xl">

                        <div className="absolute right-3 top-3 z-10">

                            <button
                                type="button"
                                onClick={() =>
                                    setMobileOpen(
                                        false,
                                    )
                                }
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                                aria-label="Close menu"
                            >

                                <X
                                    size={18}
                                />

                            </button>

                        </div>


                        <AdminSidebar
                            onNavigate={() =>
                                setMobileOpen(
                                    false,
                                )
                            }
                        />

                    </aside>

                </div>

            )}


            {/* ==================================================
                MAIN
            ================================================== */}

            <div className="lg:ml-[250px]">

                {/* ==================================================
                    HEADER
                ================================================== */}

                <header className="admin-header sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur">

                    <div className="flex min-h-[70px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">

                        {/* LEFT */}

                        <div className="flex items-center gap-3">

                            <button
                                type="button"
                                onClick={() =>
                                    setMobileOpen(
                                        true,
                                    )
                                }
                                className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 text-neutral-600 lg:hidden"
                                aria-label="Open admin navigation"
                            >

                                <Menu
                                    size={18}
                                />

                            </button>


                            <div>

                                <p className="hidden text-[9px] font-semibold uppercase tracking-[0.2em] text-neutral-400 sm:block">
                                    Administration
                                </p>


                                <p className="text-sm font-semibold text-neutral-900">
                                    <span className="hidden sm:inline">ShopSphere </span>
                                    Admin
                                </p>

                            </div>

                        </div>


                        {/* RIGHT */}

                        <div className="admin-header__actions flex items-center gap-2">

                            {/* ==================================================
                                NOTIFICATIONS
                            ================================================== */}

                            <NotificationBell
                                admin
                            />


                            {/* ==================================================
                                THEME
                            ================================================== */}

                            <button
                                type="button"
                                onClick={
                                    toggleTheme
                                }
                                aria-label={`Switch to ${theme ===
                                        'dark'
                                        ? 'light'
                                        : 'dark'
                                    } mode`}
                                className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 text-neutral-600 transition hover:bg-neutral-50"
                            >

                                {theme ===
                                    'dark' ? (

                                    <Sun
                                        size={17}
                                    />

                                ) : (

                                    <Moon
                                        size={17}
                                    />

                                )}

                            </button>


                            {/* ==================================================
                                STOREFRONT
                            ================================================== */}

                            <Link
                                to="/"
                                className="hidden h-10 items-center gap-2 rounded-full border border-neutral-200 px-3 text-xs font-semibold text-neutral-700 transition hover:border-[#18705c] hover:text-[#18705c] sm:inline-flex"
                            >

                                <Store
                                    size={14}
                                />

                                <span className="hidden sm:inline">
                                    Storefront
                                </span>

                            </Link>


                            {/* ==================================================
                                USER
                            ================================================== */}

                            <div className="hidden max-w-44 truncate text-xs font-medium text-neutral-600 sm:block">

                                {
                                    user?.name ??
                                    'Administrator'
                                }

                            </div>


                            {/* ==================================================
                                LOGOUT
                            ================================================== */}

                            <button
                                type="button"
                                onClick={
                                    handleLogout
                                }
                                className="inline-flex h-10 items-center gap-2 rounded-full bg-[#153d35] px-3 text-xs font-semibold text-white transition hover:bg-[#24584b]"
                            >

                                <LogOut
                                    size={14}
                                />

                                <span className="hidden sm:inline">
                                    Sign out
                                </span>

                            </button>

                        </div>

                    </div>

                </header>


                {/* ==================================================
                    PAGE CONTENT
                ================================================== */}

                <main className="min-h-[calc(100vh-70px)] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">

                    <Outlet />

                </main>

            </div>

            {/* Floating analytics chatbot is only mounted in the admin workspace. */}
            {user?.role === 'admin' && <AdminAIChatWidget />}

        </div>
    )
}


export default AdminLayout