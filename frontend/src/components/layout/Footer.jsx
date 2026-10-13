import { Link } from 'react-router-dom'

function Footer() {
    return (
        <footer className="site-footer bg-white">
            <div className="mx-auto grid max-w-[1440px] gap-9 px-5 py-12 sm:px-8 md:grid-cols-2 lg:grid-cols-4 lg:px-12">

                <div>
                    <Link
                        to="/"
                        className="text-[26px] font-black tracking-[-0.09em]"
                    >
                        shop
                        <span className="text-[#18705c]">
                            sphere
                        </span>
                        .
                    </Link>

                    <p className="mt-3 max-w-xs text-xs leading-6 text-neutral-500">
                        Everyday discoveries, thoughtfully brought together.
                        Find your kind of everyday.
                    </p>
                </div>

                <div>
                    <h3 className="text-xs font-semibold">
                        EXPLORE
                    </h3>

                    <div className="mt-4 flex flex-col gap-3 text-xs text-neutral-500">
                        <Link to="/shop" className="hover:text-black">
                            Shop all
                        </Link>

                        <Link to="/#categories" className="hover:text-black">
                            Categories
                        </Link>

                        <Link to="/#featured" className="hover:text-black">
                            Featured
                        </Link>
                    </div>
                </div>

                <div>
                    <h3 className="text-xs font-semibold">
                        YOUR ACCOUNT
                    </h3>

                    <div className="mt-4 flex flex-col gap-3 text-xs text-neutral-500">
                        <Link to="/orders" className="hover:text-black">
                            Order history
                        </Link>

                        <Link to="/wishlist" className="hover:text-black">
                            Wishlist
                        </Link>

                        <Link to="/login" className="hover:text-black">
                            Sign in
                        </Link>
                    </div>
                </div>

                <div>
                    <h3 className="text-xs font-semibold">
                        SHOPSPHERE
                    </h3>

                    <p className="mt-4 text-xs leading-6 text-neutral-500">
                        A more considered shopping experience,
                        one good find at a time.
                    </p>
                </div>
            </div>

            <div className="border-t border-neutral-100 px-5 py-5 sm:px-8 lg:px-12">
                <div className="mx-auto flex max-w-[1440px] flex-col gap-2 text-[10px] text-neutral-400 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                        © {new Date().getFullYear()} ShopSphere.
                        All rights reserved.
                    </span>

                    <span>
                        Thoughtfully made for everyday life.
                    </span>
                </div>
            </div>
        </footer>
    )
}

export default Footer