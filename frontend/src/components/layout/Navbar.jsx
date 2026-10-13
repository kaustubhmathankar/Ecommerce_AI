import { useState } from 'react'
import {
    ChevronDown,
    Heart,
    Menu,
    Moon,
    Package,
    Search,
    ShoppingBag,
    Sun,
    User,
    X,
} from 'lucide-react'
import {
    Link,
    useLocation,
    useNavigate,
} from 'react-router-dom'

import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { useTheme } from '../../context/ThemeContext'
import { useWishlist } from '../../context/WishlistContext'
import NotificationBell from './NotificationBell'


function Navbar({
    search = '',
    onSearchChange = () => { },
    showSearch = false,
}) {
    const [
        menuOpen,
        setMenuOpen,
    ] = useState(false)

    const [
        searchOpen,
        setSearchOpen,
    ] = useState(false)

    const [
        accountOpen,
        setAccountOpen,
    ] = useState(false)

    const {
        isAuthenticated,
        isAdmin,
        user,
        logout,
    } = useAuth()

    const {
        cartCount,
    } = useCart()

    const {
        wishlistCount,
    } = useWishlist()

    const {
        theme,
        toggleTheme,
    } = useTheme()

    const navigate =
        useNavigate()

    const location =
        useLocation()


    const closeMenu = () => {
        setMenuOpen(false)
    }


    const closeAccount = () => {
        setAccountOpen(false)
    }


    const handleLogout = () => {

        logout()

        setAccountOpen(false)
        setMenuOpen(false)

        navigate(
            '/',
            {
                replace: true,
            },
        )
    }


    const isShopActive =
        location.pathname === '/shop'


    const isWishlistActive =
        location.pathname === '/wishlist'


    const isCartActive =
        location.pathname === '/cart'


    const isAdminActive =
        location.pathname.startsWith(
            '/admin',
        )

    const isHomeSectionActive = (section) =>
        location.pathname === '/' &&
        location.hash === `#${section}`

    const sectionLinkClass = (section) =>
        `site-nav-link rounded-full px-4 py-2.5 text-[11px] font-semibold transition ${isHomeSectionActive(section)
            ? 'site-nav-link--active bg-[#153d35] text-white shadow-sm'
            : 'text-neutral-600 hover:bg-[#f3f6f2] hover:text-[#153d35]'
        }`


    return (
        <header className="site-header sticky top-0 z-50 border-b border-neutral-200/70 bg-[#fbfaf7]/95 backdrop-blur-2xl">

            <div className="mx-auto max-w-[1480px] px-4 sm:px-6 lg:px-10">

                <div className="site-header__row flex h-[76px] items-center justify-between gap-3">

                    {/* ==================================================
                        MOBILE MENU
                    ================================================== */}

                    <button
                        type="button"
                        onClick={() =>
                            setMenuOpen(
                                (value) => !value,
                            )
                        }
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 transition hover:border-[#b7c8bd] hover:bg-[#f3f6f2] hover:text-[#153d35] lg:hidden"
                        aria-label={
                            menuOpen
                                ? 'Close menu'
                                : 'Open menu'
                        }
                        aria-expanded={
                            menuOpen
                        }
                    >

                        {
                            menuOpen ? (
                                <X
                                    size={19}
                                />
                            ) : (
                                <Menu
                                    size={19}
                                />
                            )
                        }

                    </button>


                    {/* ==================================================
                        BRAND
                    ================================================== */}

                    <Link
                        to="/"
                        className="site-brand group flex shrink-0 items-center gap-2.5"
                    >

                        <span className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#153d35] text-white shadow-[0_8px_22px_rgba(21,61,53,0.16)] transition duration-300 group-hover:-translate-y-0.5 group-hover:bg-[#1c4d42]">

                            <Package
                                size={19}
                                strokeWidth={1.8}
                            />

                        </span>


                        <span className="site-brand-name hidden text-[22px] font-black tracking-[-0.075em] text-[#18231e] min-[390px]:inline sm:text-[25px]">

                            shop
                            <span className="text-[#18705c]">
                                sphere
                            </span>

                            <span className="text-[#18705c]">
                                .
                            </span>

                        </span>

                    </Link>


                    {/* ==================================================
                        DESKTOP NAVIGATION
                    ================================================== */}

                    <nav
                        aria-label="Main navigation"
                        className="site-header__nav hidden items-center gap-1 rounded-full border border-neutral-200/70 bg-white/75 p-1 shadow-[0_4px_20px_rgba(15,23,42,0.04)] lg:flex"
                    >

                        <Link
                            to="/shop"
                            className={`site-nav-link rounded-full px-4 py-2.5 text-[11px] font-semibold transition ${isShopActive
                                ? 'site-nav-link--active bg-[#153d35] text-white shadow-sm'
                                : 'text-neutral-600 hover:bg-[#f3f6f2] hover:text-[#153d35]'
                                }`}
                        >
                            Shop all
                        </Link>


                        <Link
                            to="/#categories"
                            className={sectionLinkClass('categories')}
                        >
                            Categories
                        </Link>


                        <Link
                            to="/#featured"
                            className={sectionLinkClass('featured')}
                        >
                            Featured
                        </Link>


                        <Link
                            to="/#story"
                            className={sectionLinkClass('story')}
                        >
                            About
                        </Link>


                        {isAdmin && (

                            <Link
                                to="/admin"
                                className={`site-nav-link rounded-full px-4 py-2.5 text-[11px] font-semibold transition ${isAdminActive
                                    ? 'site-nav-link--active bg-[#153d35] text-white shadow-sm'
                                    : 'text-neutral-600 hover:bg-[#f3f6f2] hover:text-[#153d35]'
                                    }`}
                            >
                                Admin
                            </Link>

                        )}

                    </nav>


                    {/* ==================================================
                        ACTIONS
                    ================================================== */}

                    <div className="site-header__actions flex items-center gap-1.5 sm:gap-2">


                        {/* Theme */}

                        <button
                            type="button"
                            onClick={
                                toggleTheme
                            }
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 transition hover:-translate-y-0.5 hover:border-[#b7c8bd] hover:bg-[#f3f6f2] hover:text-[#153d35]"
                            aria-label={`Switch to ${theme === 'dark'
                                ? 'light'
                                : 'dark'
                                } mode`}
                            title={`Switch to ${theme === 'dark'
                                ? 'light'
                                : 'dark'
                                } mode`}
                        >

                            {
                                theme === 'dark'
                                    ? (
                                        <Sun
                                            size={18}
                                        />
                                    )
                                    : (
                                        <Moon
                                            size={18}
                                        />
                                    )
                            }

                        </button>


                        {/* Search */}

                        {showSearch && (

                            <button
                                type="button"
                                onClick={() =>
                                    setSearchOpen(
                                        (value) =>
                                            !value,
                                    )
                                }
                                className={`flex h-10 w-10 items-center justify-center rounded-full border transition ${searchOpen
                                    ? 'border-[#153d35] bg-[#153d35] text-white'
                                    : 'border-neutral-200 bg-white text-neutral-700 hover:border-[#b7c8bd] hover:bg-[#f3f6f2] hover:text-[#153d35]'
                                    }`}
                                aria-label="Search products"
                                aria-expanded={
                                    searchOpen
                                }
                            >

                                <Search
                                    size={18}
                                    strokeWidth={1.8}
                                />

                            </button>

                        )}

                        {/* ==================================================
    CUSTOMER NOTIFICATIONS
================================================== */}

                        {isAuthenticated && !isAdmin && (
                            <NotificationBell />
                        )}

                        {/* Account */}

                        {isAuthenticated ? (

                            <div className="relative">

                                <button
                                    type="button"
                                    onClick={() =>
                                        setAccountOpen(
                                            (open) =>
                                                !open,
                                        )
                                    }
                                    aria-expanded={
                                        accountOpen
                                    }
                                    className={`inline-flex h-10 items-center gap-2 rounded-full border px-3 text-[10px] font-semibold uppercase tracking-[0.11em] transition ${accountOpen
                                        ? 'border-[#153d35] bg-[#153d35] text-white'
                                        : 'border-neutral-200 bg-white text-neutral-700 hover:border-[#b7c8bd] hover:bg-[#f3f6f2] hover:text-[#153d35]'
                                        }`}
                                >

                                    <User
                                        size={14}
                                    />

                                    <span className="hidden max-w-[88px] truncate sm:inline">

                                        {
                                            user?.name
                                                ?.split(
                                                    ' ',
                                                )[0] ||
                                            'Account'
                                        }

                                    </span>

                                    <ChevronDown
                                        size={13}
                                        className={`hidden transition sm:block ${accountOpen
                                            ? 'rotate-180'
                                            : ''
                                            }`}
                                    />

                                </button>


                                {accountOpen && (

                                    <>

                                        <button
                                            type="button"
                                            aria-label="Close account menu"
                                            onClick={
                                                closeAccount
                                            }
                                            className="fixed inset-0 z-40 cursor-default"
                                        />


                                        <div className="absolute right-0 top-full z-50 mt-3 w-[260px] overflow-hidden rounded-[20px] border border-neutral-200 bg-white p-2 shadow-[0_20px_55px_rgba(15,23,42,0.14)]">

                                            <div className="rounded-[15px] bg-[#f7f7f4] px-4 py-3">

                                                <p className="text-xs font-semibold text-neutral-900">

                                                    {
                                                        user?.name ||
                                                        'Account'
                                                    }

                                                </p>


                                                <p className="mt-1 truncate text-[10px] text-neutral-500">

                                                    {
                                                        user?.email
                                                    }

                                                </p>

                                            </div>


                                            <div className="mt-1.5">

                                                <Link
                                                    to="/orders"
                                                    onClick={
                                                        closeAccount
                                                    }
                                                    className="flex items-center justify-between rounded-xl px-3 py-3 text-xs font-medium text-neutral-700 transition hover:bg-[#f5f7f4] hover:text-[#153d35]"
                                                >

                                                    Order history

                                                    <span className="text-neutral-300">
                                                        →
                                                    </span>

                                                </Link>


                                                <Link
                                                    to="/wishlist"
                                                    onClick={
                                                        closeAccount
                                                    }
                                                    className="flex items-center justify-between rounded-xl px-3 py-3 text-xs font-medium text-neutral-700 transition hover:bg-[#f5f7f4] hover:text-[#153d35]"
                                                >

                                                    Wishlist

                                                    <span className="text-neutral-300">
                                                        →
                                                    </span>

                                                </Link>


                                                {isAdmin && (

                                                    <Link
                                                        to="/admin"
                                                        onClick={
                                                            closeAccount
                                                        }
                                                        className="flex items-center justify-between rounded-xl px-3 py-3 text-xs font-medium text-neutral-700 transition hover:bg-[#f5f7f4] hover:text-[#153d35]"
                                                    >

                                                        Admin dashboard

                                                        <span className="text-neutral-300">
                                                            →
                                                        </span>

                                                    </Link>

                                                )}


                                                <div className="my-1.5 border-t border-neutral-100" />


                                                <button
                                                    type="button"
                                                    onClick={
                                                        handleLogout
                                                    }
                                                    className="w-full rounded-xl px-3 py-3 text-left text-xs font-semibold text-red-600 transition hover:bg-red-50"
                                                >
                                                    Log out
                                                </button>

                                            </div>

                                        </div>

                                    </>

                                )}

                            </div>

                        ) : (

                            <Link
                                to="/login"
                                className="inline-flex h-10 items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-700 transition hover:-translate-y-0.5 hover:border-[#b7c8bd] hover:bg-[#f3f6f2] hover:text-[#153d35]"
                            >

                                <User
                                    size={14}
                                />

                                <span className="hidden sm:inline">
                                    Login
                                </span>

                            </Link>

                        )}


                        {/* Wishlist */}

                        <Link
                            to="/wishlist"
                            aria-label="Wishlist"
                            className={`relative hidden h-10 w-10 items-center justify-center rounded-full border transition sm:inline-flex ${isWishlistActive
                                ? 'border-[#153d35] bg-[#153d35] text-white'
                                : 'border-neutral-200 bg-white text-neutral-700 hover:border-[#b7c8bd] hover:bg-[#f3f6f2] hover:text-[#153d35]'
                                }`}
                        >

                            <Heart
                                size={18}
                                strokeWidth={1.8}
                                className={
                                    isWishlistActive
                                        ? 'fill-white'
                                        : ''
                                }
                            />


                            {wishlistCount >
                                0 && (

                                    <span className={`absolute -right-1 -top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full px-1 text-[9px] font-bold ${isWishlistActive
                                        ? 'bg-white text-[#153d35]'
                                        : 'bg-[#18705c] text-white'
                                        }`}>
                                        {
                                            wishlistCount
                                        }
                                    </span>

                                )}

                        </Link>


                        {/* Cart */}

                        <Link
                            to="/cart"
                            aria-label="Shopping bag"
                            className={`relative flex h-10 w-10 items-center justify-center rounded-full border transition ${isCartActive
                                ? 'border-[#153d35] bg-[#153d35] text-white'
                                : 'border-neutral-200 bg-white text-neutral-700 hover:border-[#b7c8bd] hover:bg-[#f3f6f2] hover:text-[#153d35]'
                                }`}
                        >

                            <ShoppingBag
                                size={18}
                                strokeWidth={1.8}
                            />


                            {cartCount >
                                0 && (

                                    <span className={`absolute -right-1 -top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full px-1 text-[9px] font-bold ${isCartActive
                                        ? 'bg-white text-[#153d35]'
                                        : 'bg-[#18705c] text-white'
                                        }`}>
                                        {
                                            cartCount
                                        }
                                    </span>

                                )}

                        </Link>

                    </div>

                </div>


                {/* ======================================================
                    DESKTOP / LARGE SEARCH DRAWER
                ====================================================== */}

                {showSearch &&
                    searchOpen && (

                        <div className="border-t border-neutral-200/70 py-4">

                            <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 shadow-[0_8px_28px_rgba(15,23,42,0.05)]">

                                <Search
                                    size={18}
                                    className="shrink-0 text-neutral-400"
                                />


                                <input
                                    autoFocus
                                    type="search"
                                    value={
                                        search
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        onSearchChange(
                                            event
                                                .target
                                                .value,
                                        )
                                    }
                                    placeholder="Search by product name, brand or description..."
                                    className="w-full bg-transparent py-3.5 text-sm text-neutral-800 outline-none placeholder:text-neutral-400"
                                />


                                {search && (

                                    <button
                                        type="button"
                                        onClick={() =>
                                            onSearchChange(
                                                '',
                                            )
                                        }
                                        className="rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900"
                                    >
                                        Clear
                                    </button>

                                )}

                            </div>

                        </div>

                    )}

            </div>


            {/* ==========================================================
                MOBILE MENU
            ========================================================== */}

            {menuOpen && (

                <nav
                    aria-label="Mobile navigation"
                    className="border-t border-neutral-200/70 bg-[#fbfaf7] px-4 py-3 lg:hidden"
                >

                    <div className="mx-auto max-w-[1480px]">

                        <Link
                            to="/shop"
                            onClick={
                                closeMenu
                            }
                            className={`flex items-center justify-between rounded-xl px-3 py-3.5 text-sm font-semibold ${isShopActive
                                ? 'bg-[#153d35] text-white'
                                : 'text-neutral-800 hover:bg-white'
                                }`}
                        >

                            Shop all

                            <span>
                                →
                            </span>

                        </Link>


                        <Link
                            to="/#categories"
                            onClick={
                                closeMenu
                            }
                            className={`flex items-center justify-between rounded-xl px-3 py-3.5 text-sm font-semibold ${isHomeSectionActive('categories')
                                ? 'bg-[#153d35] text-white'
                                : 'text-neutral-800 hover:bg-white'
                                }`}
                        >

                            Categories

                            <span>
                                →
                            </span>

                        </Link>


                        <Link
                            to="/#featured"
                            onClick={
                                closeMenu
                            }
                            className={`flex items-center justify-between rounded-xl px-3 py-3.5 text-sm font-semibold ${isHomeSectionActive('featured')
                                ? 'bg-[#153d35] text-white'
                                : 'text-neutral-800 hover:bg-white'
                                }`}
                        >

                            Featured

                            <span>
                                →
                            </span>

                        </Link>


                        <Link
                            to="/#story"
                            onClick={
                                closeMenu
                            }
                            className={`flex items-center justify-between rounded-xl px-3 py-3.5 text-sm font-semibold ${isHomeSectionActive('story')
                                ? 'bg-[#153d35] text-white'
                                : 'text-neutral-800 hover:bg-white'
                                }`}
                        >

                            About

                            <span>
                                →
                            </span>

                        </Link>


                        <Link
                            to="/wishlist"
                            onClick={
                                closeMenu
                            }
                            className="flex items-center justify-between rounded-xl px-3 py-3.5 text-sm font-semibold text-neutral-800 hover:bg-white"
                        >

                            Wishlist

                            <span className="rounded-full bg-[#e4eee9] px-2 py-0.5 text-[10px] font-bold text-[#153d35]">
                                {
                                    wishlistCount
                                }
                            </span>

                        </Link>


                        {isAuthenticated && (

                            <Link
                                to="/orders"
                                onClick={
                                    closeMenu
                                }
                                className="flex items-center justify-between rounded-xl px-3 py-3.5 text-sm font-semibold text-neutral-800 hover:bg-white"
                            >

                                Order history

                                <span>
                                    →
                                </span>

                            </Link>

                        )}


                        {isAdmin && (

                            <Link
                                to="/admin"
                                onClick={
                                    closeMenu
                                }
                                className={`mt-1 flex items-center justify-between rounded-xl px-3 py-3.5 text-sm font-semibold ${isAdminActive
                                    ? 'bg-[#153d35] text-white'
                                    : 'text-neutral-800 hover:bg-white'
                                    }`}
                            >

                                Admin dashboard

                                <span>
                                    →
                                </span>

                            </Link>

                        )}


                        {!isAuthenticated && (

                            <Link
                                to="/login"
                                onClick={
                                    closeMenu
                                }
                                className="mt-1 block rounded-xl bg-[#153d35] px-3 py-3.5 text-center text-sm font-semibold text-white"
                            >

                                Sign in

                            </Link>

                        )}


                        {isAuthenticated && (

                            <button
                                type="button"
                                onClick={
                                    handleLogout
                                }
                                className="mt-1 w-full rounded-xl px-3 py-3.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
                            >
                                Log out
                            </button>

                        )}

                    </div>

                </nav>

            )}

        </header>
    )
}


export default Navbar