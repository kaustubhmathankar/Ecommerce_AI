import {
    useEffect,
    useState,
} from 'react'


import {
    load as loadCashfree,
} from '@cashfreepayments/cashfree-js'


import {
    useMutation,
    useQueries,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query'


import {
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    CreditCard,
    MapPin,
    ShieldCheck,
    ShoppingBag,
    Truck,
} from 'lucide-react'


import {
    Link,
    Navigate,
    useNavigate,
} from 'react-router-dom'


import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'


import {
    getAddresses,
    createAddress,
} from '../api/addresses'


import {
    getApiErrorMessage,
} from '../api/client'


import {
    placeOrder,
} from '../api/orders'


import {
    createCashfreePayment,
    verifyCashfreePayment,
} from '../api/payments'


import {
    getProduct,
} from '../api/products'


import {
    useCart,
} from '../context/CartContext'


const initialForm = {

    label:
        'Home',

    full_name:
        '',

    phone:
        '',

    address_line:
        '',

    city:
        '',

    state:
        '',

    postal_code:
        '',

    country:
        'India',

}


const formatPrice =
    (
        amount,
    ) =>
        new Intl.NumberFormat(
            'en-IN',
            {
                style:
                    'currency',

                currency:
                    'INR',

                maximumFractionDigits:
                    2,
            },
        ).format(
            Number(
                amount,
            ) || 0,
        )


function Checkout() {

    const [
        form,
        setForm,
    ] =
        useState(
            initialForm,
        )


    const [
        selectedAddressId,
        setSelectedAddressId,
    ] =
        useState(
            null,
        )


    const [
        saveNewAddress,
        setSaveNewAddress,
    ] =
        useState(
            true,
        )


    const [
        placedOrder,
        setPlacedOrder,
    ] =
        useState(
            null,
        )


    const [
        paymentMethod,
        setPaymentMethod,
    ] =
        useState(
            'cash_on_delivery',
        )


    const [
        paymentError,
        setPaymentError,
    ] =
        useState(
            null,
        )


    const [
        paymentAttempt,
        setPaymentAttempt,
    ] =
        useState(
            null,
        )


    const navigate =
        useNavigate()


    const queryClient =
        useQueryClient()


    const {
        items,
        clearCart,
    } =
        useCart()


    // ========================================================
    // LOAD SAVED ADDRESSES
    // ========================================================

    const addressesQuery =
        useQuery({
            queryKey:
                [
                    'addresses',
                ],

            queryFn:
                getAddresses,

            staleTime:
                0,
        })


    const addresses =
        addressesQuery.data ??
        []


    // ========================================================
    // DEFAULT ADDRESS
    // ========================================================

    const defaultAddress =
        addresses.find(
            (
                address,
            ) =>
                address.is_default,
        ) ??
        addresses[0] ??
        null


    // ========================================================
    // SELECT DEFAULT ADDRESS
    // ========================================================

    useEffect(
        () => {

            if (
                !addresses.length
            ) {

                if (
                    selectedAddressId !==
                    'new'
                ) {

                    setSelectedAddressId(
                        'new',
                    )

                }

                return
            }


            if (
                selectedAddressId ===
                'new'
            ) {

                return
            }


            const selectedStillExists =
                addresses.some(
                    (
                        address,
                    ) =>
                        String(
                            address.id,
                        ) ===
                        String(
                            selectedAddressId,
                        ),
                )


            if (
                selectedStillExists
            ) {

                return
            }


            if (
                defaultAddress
            ) {

                setSelectedAddressId(
                    String(
                        defaultAddress.id,
                    ),
                )


                setForm({
                    label:
                        defaultAddress.label ||
                        'Home',

                    full_name:
                        defaultAddress.full_name ||
                        '',

                    phone:
                        defaultAddress.phone ||
                        '',

                    address_line:
                        defaultAddress.address_line ||
                        '',

                    city:
                        defaultAddress.city ||
                        '',

                    state:
                        defaultAddress.state ||
                        '',

                    postal_code:
                        defaultAddress.postal_code ||
                        '',

                    country:
                        defaultAddress.country ||
                        'India',
                })

            }

        },
        [
            addresses,
            defaultAddress,
            selectedAddressId,
        ],
    )


    // ========================================================
    // CURRENT ADDRESS
    // ========================================================

    const selectedAddress =
        addresses.find(
            (
                address,
            ) =>
                String(
                    address.id,
                ) ===
                String(
                    selectedAddressId,
                ),
        )


    // ========================================================
    // PRODUCT QUERIES
    // ========================================================

    const productQueries =
        useQueries({
            queries:
                items.map(
                    ({
                        product,
                    }) => ({

                        queryKey:
                            [
                                'product',
                                product.id,
                            ],

                        queryFn:
                            () =>
                                getProduct(
                                    product.id,
                                ),

                        staleTime:
                            0,

                    }),
                ),
        })


    const liveItems =
        items.map(
            (
                item,
                index,
            ) => ({

                ...item,

                product:
                    productQueries[
                        index
                    ]?.data ??
                    item.product,

            }),
        )


    const productsLoading =
        productQueries.some(
            (
                query,
            ) =>
                query.isLoading,
        )


    const productRefreshFailed =
        productQueries.some(
            (
                query,
            ) =>
                query.isError,
        )


    // ========================================================
    // PRICE
    // ========================================================

    const subtotal =
        liveItems.reduce(
            (
                sum,
                item,
            ) =>
                sum +
                Number(
                    item.product.price,
                ) *
                item.quantity,

            0,
        )


    const shipping =
        subtotal === 0 ||
            subtotal >= 1999

            ? 0

            : 99


    const total =
        subtotal +
        shipping


    // ========================================================
    // SAVE ADDRESS MUTATION
    // ========================================================

    const saveAddressMutation =
        useMutation({

            mutationFn:
                createAddress,

        })


    // ========================================================
    // COMPLETE ORDER SUCCESS
    // ========================================================

    const handleOrderSuccess =
        (
            order,
        ) => {

            setPlacedOrder(
                order,
            )


            setPaymentAttempt(
                null,
            )


            setPaymentError(
                null,
            )


            clearCart()


            queryClient.invalidateQueries({
                queryKey:
                    [
                        'orders',
                    ],
            })


            queryClient.invalidateQueries({
                queryKey:
                    [
                        'addresses',
                    ],
            })


            queryClient.invalidateQueries({
                queryKey:
                    [
                        'products',
                    ],
            })


            queryClient.invalidateQueries({
                queryKey:
                    [
                        'shop-products',
                    ],
            })


            queryClient.invalidateQueries({
                queryKey:
                    [
                        'product',
                    ],
            })


            queryClient.invalidateQueries({
                queryKey:
                    [
                        'admin-products',
                    ],
            })


            queryClient.invalidateQueries({
                queryKey:
                    [
                        'admin-overview',
                    ],
            })

        }


    // ========================================================
    // COD ORDER MUTATION
    // ========================================================

    const orderMutation =
        useMutation({

            mutationFn:
                placeOrder,

            onSuccess:
                handleOrderSuccess,

        })


    // ========================================================
    // ONLINE PAYMENT
    // ========================================================

    const startOnlinePayment =
        async (
            payload,
        ) => {

            setPaymentError(
                null,
            )

            setPaymentAttempt(
                null,
            )

            try {

                const payment =
                    await createCashfreePayment(
                        payload,
                    )


                setPaymentAttempt(
                    payment,
                )


                const cashfree =
                    await loadCashfree({
                        mode: 'sandbox',
                    })


                if (!cashfree) {
                    throw new Error(
                        'Cashfree checkout could not be loaded in this browser.',
                    )
                }


                const result =
                    await cashfree.checkout({
                        paymentSessionId:
                            payment.payment_session_id,

                        redirectTarget:
                            '_modal',
                    })


                if (
                    result?.error
                ) {
                    throw new Error(
                        result.error.message ||
                        'The payment could not be completed.',
                    )
                }


                if (
                    !result?.paymentDetails
                ) {
                    setPaymentAttempt(
                        null,
                    )

                    setPaymentError(
                        'Payment was not completed. Your order has not been placed. You can try again.',
                    )

                    return
                }


                const order =
                    await verifyCashfreePayment(
                        payment.payment_attempt_id,
                        payload,
                    )


                handleOrderSuccess(
                    order,
                )

            } catch (
            error) {

                setPaymentError(
                    getApiErrorMessage(
                        error,
                        'Online payment could not be completed. No order was placed.',
                    ),
                )

                setPaymentAttempt(
                    null,
                )

            }

        }


    // ========================================================
    // STOCK CHECK
    // ========================================================

    const outOfStock =
        liveItems.some(
            ({
                product,
                quantity,
            }) =>

                Number(
                    product.stock_quantity,
                ) <
                quantity

                ||

                Number(
                    product.stock_quantity,
                ) <=
                0,
        )


    // ========================================================
    // SELECT SAVED ADDRESS
    // ========================================================

    const handleAddressSelect =
        (
            event,
        ) => {

            const value =
                event.target.value


            orderMutation.reset()


            setPaymentError(null)


            saveAddressMutation.reset()


            setSelectedAddressId(
                value,
            )


            if (
                value ===
                'new'
            ) {

                setForm({
                    ...initialForm,
                })


                setSaveNewAddress(
                    true,
                )


                return
            }


            const address =
                addresses.find(
                    (
                        item,
                    ) =>
                        String(
                            item.id,
                        ) ===
                        String(
                            value,
                        ),
                )


            if (
                !address
            ) {

                return
            }


            setForm({

                label:
                    address.label ||
                    'Home',

                full_name:
                    address.full_name ||
                    '',

                phone:
                    address.phone ||
                    '',

                address_line:
                    address.address_line ||
                    '',

                city:
                    address.city ||
                    '',

                state:
                    address.state ||
                    '',

                postal_code:
                    address.postal_code ||
                    '',

                country:
                    address.country ||
                    'India',

            })

        }


    // ========================================================
    // EXPLICIT ADD NEW ADDRESS
    // ========================================================

    const handleAddNewAddress =
        () => {

            orderMutation.reset()


            setPaymentError(null)


            saveAddressMutation.reset()


            setSelectedAddressId(
                'new',
            )


            setForm({
                ...initialForm,
            })


            setSaveNewAddress(
                true,
            )

        }


    // ========================================================
    // FORM CHANGE
    // ========================================================

    const handleChange =
        (
            event,
        ) => {

            setForm(
                (
                    current,
                ) => ({

                    ...current,

                    [
                        event.target.name
                    ]:
                        event.target.value,

                }),
            )


            orderMutation.reset()


            setPaymentError(null)


            saveAddressMutation.reset()

        }


    // ========================================================
    // ORDER PAYLOAD HELPERS
    // ========================================================

    const getCartItemsPayload =
        () =>
            liveItems.map(
                ({
                    product,
                    quantity,
                }) => ({

                    product_id:
                        product.id,

                    quantity,

                }),
            )


    const submitSavedAddressOrder =
        (
            addressId,
        ) => {

            const payload = {

                address_id:
                    Number(
                        addressId,
                    ),

                payment_method:
                    paymentMethod,

                items:
                    getCartItemsPayload(),

            }


            if (
                paymentMethod ===
                'online_payment'
            ) {

                startOnlinePayment(
                    payload,
                )

                return
            }


            orderMutation.mutate(
                payload,
            )

        }


    const submitNewAddressOrder =
        () => {

            const payload = {

                ...form,

                payment_method:
                    paymentMethod,

                items:
                    getCartItemsPayload(),

            }


            if (
                paymentMethod ===
                'online_payment'
            ) {

                startOnlinePayment(
                    payload,
                )

                return
            }


            orderMutation.mutate(
                payload,
            )

        }


    // ========================================================
    // CHECKOUT SUBMIT
    // ========================================================

    const handleSubmit =
        async (
            event,
        ) => {

            event.preventDefault()


            try {

                // ------------------------------------------------
                // NEW ADDRESS
                // ------------------------------------------------

                if (
                    selectedAddressId ===
                    'new'
                ) {

                    if (
                        saveNewAddress
                    ) {

                        const saved =
                            await
                                saveAddressMutation.mutateAsync({

                                    ...form,

                                    is_default:
                                        addresses.length ===
                                        0,

                                })


                        queryClient.invalidateQueries({

                            queryKey:
                                [
                                    'addresses',
                                ],

                        })


                        submitSavedAddressOrder(
                            saved.id,
                        )


                        return

                    }


                    submitNewAddressOrder()


                    return

                }


                // ------------------------------------------------
                // SAVED ADDRESS
                // ------------------------------------------------

                if (
                    !selectedAddress
                ) {

                    return

                }


                submitSavedAddressOrder(
                    selectedAddress.id,
                )

            } catch {

                /*
                 * Mutation errors are shown through
                 * the mutation state below.
                 */

            }

        }


    // ========================================================
    // CONTINUE SHOPPING
    // ========================================================

    const handleContinueShopping =
        () => {

            navigate(
                '/shop',
                {
                    replace:
                        true,
                },
            )

        }


    // ========================================================
    // VIEW ORDERS
    // ========================================================

    const handleViewOrders =
        () => {

            navigate(
                '/orders',
                {
                    replace:
                        true,

                    state: {

                        placedOrderId:
                            placedOrder?.id,

                    },

                },
            )

        }


    // ========================================================
    // EMPTY CART
    // ========================================================

    /*
     * Do not redirect when placedOrder exists.
     * This is what keeps the success popup visible
     * after clearCart().
     */

    if (
        !items.length &&
        !placedOrder
    ) {

        return (
            <Navigate
                to="/cart"
                replace
            />
        )

    }


    // ========================================================
    // ERROR
    // ========================================================

    const submitError =
        paymentError ||
            saveAddressMutation.isError
            ? paymentError ||
            saveAddressMutation.error ||
            orderMutation.error
            : orderMutation.error


    const submitErrorMessage =
        paymentError ||
            saveAddressMutation.isError
            ? paymentError ||
            getApiErrorMessage(
                saveAddressMutation.error,
                'We could not save your address. Please verify the details and try again.',
            )
            : getApiErrorMessage(
                orderMutation.error,
                'We could not place your order. Please verify stock and try again.',
            )


    return (

        <div className="min-h-screen bg-white text-neutral-900">

            <Navbar />


            <main className="mx-auto max-w-[1200px] px-5 py-10 sm:px-8 sm:py-14">

                <Link
                    to="/cart"
                    className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-500 hover:text-[#18705c]"
                >

                    <ArrowLeft
                        size={14}
                    />

                    BACK TO BAG

                </Link>


                <div className="mt-7 grid items-start gap-8 lg:grid-cols-[1fr_380px]">

                    <section className="rounded-[28px] border border-neutral-200 bg-white p-5 sm:p-8">

                        <p className="text-[10px] font-semibold tracking-[0.2em] text-[#18705c]">

                            SAFE & SECURE

                        </p>


                        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">

                            <div>

                                <h1 className="text-3xl font-medium tracking-[-0.05em] sm:text-4xl">

                                    Delivery details

                                </h1>


                                <p className="mt-3 text-sm leading-6 text-neutral-500">

                                    Choose a saved delivery address or add a new one. Pay cash to the delivery partner when your order arrives.

                                </p>

                            </div>


                            <Link
                                to="/account/addresses"
                                className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                            >

                                <MapPin
                                    size={14}
                                />

                                Manage addresses

                            </Link>

                        </div>


                        <form
                            onSubmit={
                                handleSubmit
                            }
                            className="mt-8"
                        >

                            {addressesQuery.isLoading ? (

                                <div className="rounded-2xl border border-neutral-200 bg-[#faf9f7] p-4">

                                    <p className="text-sm text-neutral-500">

                                        Loading your saved addresses…

                                    </p>

                                </div>

                            ) : addressesQuery.isError ? (

                                <div
                                    role="alert"
                                    className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                                >

                                    {
                                        getApiErrorMessage(
                                            addressesQuery.error,
                                            'Unable to load your saved addresses.',
                                        )
                                    }

                                </div>

                            ) : (

                                <div className="rounded-2xl border border-neutral-200 bg-[#faf9f7] p-4">

                                    {addresses.length > 0 ? (

                                        <>

                                            <label className="block">

                                                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">

                                                    Delivery address

                                                </span>


                                                <select
                                                    value={
                                                        selectedAddressId ??
                                                        'new'
                                                    }
                                                    onChange={
                                                        handleAddressSelect
                                                    }
                                                    className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#18705c]"
                                                >

                                                    {addresses.map(
                                                        (
                                                            address,
                                                        ) => (

                                                            <option
                                                                key={
                                                                    address.id
                                                                }
                                                                value={
                                                                    address.id
                                                                }
                                                            >

                                                                {
                                                                    address.label ||
                                                                    'Address'
                                                                }

                                                                {
                                                                    address.is_default
                                                                        ? ' · Default'
                                                                        : ''
                                                                }

                                                                {' — '}

                                                                {
                                                                    address.address_line
                                                                }

                                                                {', '}

                                                                {
                                                                    address.city
                                                                }

                                                            </option>

                                                        ),
                                                    )}


                                                    <option
                                                        value="new"
                                                    >

                                                        + Add new address

                                                    </option>

                                                </select>

                                            </label>


                                            <button
                                                type="button"
                                                onClick={
                                                    handleAddNewAddress
                                                }
                                                className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-[#18705c] hover:underline"
                                            >

                                                <span className="text-base leading-none">

                                                    +

                                                </span>

                                                Add a different address

                                            </button>


                                            {selectedAddress &&
                                                selectedAddressId !==
                                                'new' && (

                                                    <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-4 text-sm leading-6 text-neutral-600">

                                                        <div className="flex items-start justify-between gap-4">

                                                            <div>

                                                                <p className="font-semibold text-neutral-900">

                                                                    {
                                                                        selectedAddress.full_name
                                                                    }

                                                                    {' · '}

                                                                    {
                                                                        selectedAddress.phone
                                                                    }

                                                                </p>


                                                                <p>

                                                                    {
                                                                        selectedAddress.address_line
                                                                    }

                                                                </p>


                                                                <p>

                                                                    {

                                                                        [
                                                                            selectedAddress.city,
                                                                            selectedAddress.state,
                                                                            selectedAddress.postal_code,
                                                                        ]

                                                                            .filter(
                                                                                Boolean,
                                                                            )

                                                                            .join(
                                                                                ', ',
                                                                            )

                                                                    }

                                                                </p>


                                                                <p>

                                                                    {
                                                                        selectedAddress.country
                                                                    }

                                                                </p>

                                                            </div>


                                                            {selectedAddress.is_default && (

                                                                <span className="shrink-0 rounded-full bg-[#e7f2ed] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#18705c]">

                                                                    Default

                                                                </span>

                                                            )}

                                                        </div>

                                                    </div>

                                                )}

                                        </>

                                    ) : (

                                        <div>

                                            <p className="text-sm font-semibold">

                                                No saved addresses yet

                                            </p>


                                            <p className="mt-1 text-xs text-neutral-500">

                                                Add your first delivery address below.

                                            </p>

                                        </div>

                                    )}

                                </div>

                            )}


                            {selectedAddressId ===
                                'new' && (

                                    <div className="mt-6 grid gap-4 sm:grid-cols-2">

                                        <div className="sm:col-span-2">

                                            <p className="text-sm font-semibold">

                                                New delivery address

                                            </p>


                                            <p className="mt-1 text-xs text-neutral-500">

                                                Enter the address where you want this order delivered.

                                            </p>

                                        </div>


                                        <label>

                                            <span className="mb-2 block text-xs font-medium text-neutral-600">

                                                Label

                                            </span>


                                            <input
                                                name="label"
                                                value={
                                                    form.label
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                                placeholder="Home"
                                                required
                                                maxLength={40}
                                                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none focus:border-[#18705c]"
                                            />

                                        </label>


                                        <label>

                                            <span className="mb-2 block text-xs font-medium text-neutral-600">

                                                Full name

                                            </span>


                                            <input
                                                name="full_name"
                                                value={
                                                    form.full_name
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                                autoComplete="name"
                                                required
                                                maxLength={120}
                                                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none focus:border-[#18705c]"
                                            />

                                        </label>


                                        <label>

                                            <span className="mb-2 block text-xs font-medium text-neutral-600">

                                                Phone

                                            </span>


                                            <input
                                                name="phone"
                                                type="tel"
                                                value={
                                                    form.phone
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                                autoComplete="tel"
                                                required
                                                maxLength={30}
                                                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none focus:border-[#18705c]"
                                            />

                                        </label>


                                        <label>

                                            <span className="mb-2 block text-xs font-medium text-neutral-600">

                                                Postal code

                                            </span>


                                            <input
                                                name="postal_code"
                                                value={
                                                    form.postal_code
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                                autoComplete="postal-code"
                                                required
                                                maxLength={20}
                                                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none focus:border-[#18705c]"
                                            />

                                        </label>


                                        <label className="sm:col-span-2">

                                            <span className="mb-2 block text-xs font-medium text-neutral-600">

                                                Street address

                                            </span>


                                            <input
                                                name="address_line"
                                                value={
                                                    form.address_line
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                                autoComplete="street-address"
                                                required
                                                maxLength={255}
                                                placeholder="House / flat, street, area"
                                                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none focus:border-[#18705c]"
                                            />

                                        </label>


                                        <label>

                                            <span className="mb-2 block text-xs font-medium text-neutral-600">

                                                City

                                            </span>


                                            <input
                                                name="city"
                                                value={
                                                    form.city
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                                autoComplete="address-level2"
                                                required
                                                maxLength={100}
                                                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none focus:border-[#18705c]"
                                            />

                                        </label>


                                        <label>

                                            <span className="mb-2 block text-xs font-medium text-neutral-600">

                                                State / region

                                            </span>


                                            <input
                                                name="state"
                                                value={
                                                    form.state
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                                autoComplete="address-level1"
                                                required
                                                maxLength={100}
                                                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none focus:border-[#18705c]"
                                            />

                                        </label>


                                        <label>

                                            <span className="mb-2 block text-xs font-medium text-neutral-600">

                                                Country

                                            </span>


                                            <input
                                                name="country"
                                                value={
                                                    form.country
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                                autoComplete="country-name"
                                                required
                                                maxLength={100}
                                                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none focus:border-[#18705c]"
                                            />

                                        </label>


                                        <label className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 sm:mt-7">

                                            <input
                                                type="checkbox"
                                                checked={
                                                    saveNewAddress
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    setSaveNewAddress(
                                                        event.target.checked,
                                                    )
                                                }
                                                className="h-4 w-4 accent-[#153d35]"
                                            />


                                            <span>

                                                <span className="block text-sm font-medium">

                                                    Save this address

                                                </span>


                                                <span className="mt-0.5 block text-xs text-neutral-500">

                                                    Reuse it on your next order.

                                                </span>

                                            </span>

                                        </label>

                                    </div>

                                )}


                            {/* ==================================================
                                PAYMENT METHOD
                            ================================================== */}

                            <div className="mt-7 rounded-2xl border border-neutral-200 bg-[#faf9f7] p-4 sm:p-5">

                                <div className="flex items-start gap-3">

                                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e7f2ed] text-[#18705c]">

                                        <CreditCard
                                            size={17}
                                        />

                                    </div>


                                    <div>

                                        <p className="text-sm font-semibold">

                                            Payment method

                                        </p>

                                        <p className="mt-1 text-xs leading-5 text-neutral-500">

                                            Choose how you want to pay for this order.

                                        </p>

                                    </div>

                                </div>


                                <div className="mt-4 grid gap-3 sm:grid-cols-2">

                                    <label
                                        className={
                                            `cursor-pointer rounded-2xl border p-4 transition ${paymentMethod === 'cash_on_delivery' ? 'border-[#18705c] bg-white shadow-sm' : 'border-neutral-200 bg-white/60 hover:border-neutral-300'}`
                                        }
                                    >

                                        <input
                                            type="radio"
                                            name="payment_method"
                                            value="cash_on_delivery"
                                            checked={
                                                paymentMethod ===
                                                'cash_on_delivery'
                                            }
                                            onChange={
                                                () => {
                                                    setPaymentMethod('cash_on_delivery')
                                                    setPaymentError(null)
                                                }
                                            }
                                            className="sr-only"
                                        />

                                        <div className="flex items-start justify-between gap-3">

                                            <div>

                                                <p className="text-sm font-semibold text-neutral-900">

                                                    Cash on delivery

                                                </p>

                                                <p className="mt-1 text-xs leading-5 text-neutral-500">

                                                    Pay the delivery partner when your order arrives.

                                                </p>

                                            </div>


                                            <span className="mt-0.5 h-4 w-4 rounded-full border border-neutral-300 p-0.5">

                                                {paymentMethod === 'cash_on_delivery' && (
                                                    <span className="block h-full w-full rounded-full bg-[#18705c]" />
                                                )}

                                            </span>

                                        </div>

                                    </label>


                                    <label
                                        className={
                                            `cursor-pointer rounded-2xl border p-4 transition ${paymentMethod === 'online_payment' ? 'border-[#18705c] bg-white shadow-sm' : 'border-neutral-200 bg-white/60 hover:border-neutral-300'}`
                                        }
                                    >

                                        <input
                                            type="radio"
                                            name="payment_method"
                                            value="online_payment"
                                            checked={
                                                paymentMethod ===
                                                'online_payment'
                                            }
                                            onChange={
                                                () => {
                                                    setPaymentMethod('online_payment')
                                                    setPaymentError(null)
                                                }
                                            }
                                            className="sr-only"
                                        />

                                        <div className="flex items-start justify-between gap-3">

                                            <div>

                                                <p className="text-sm font-semibold text-neutral-900">

                                                    Online payment

                                                </p>

                                                <p className="mt-1 text-xs leading-5 text-neutral-500">

                                                    Secure Cashfree sandbox checkout for your demo.

                                                </p>

                                            </div>


                                            <span className="mt-0.5 h-4 w-4 rounded-full border border-neutral-300 p-0.5">

                                                {paymentMethod === 'online_payment' && (
                                                    <span className="block h-full w-full rounded-full bg-[#18705c]" />
                                                )}

                                            </span>

                                        </div>

                                    </label>

                                </div>


                                {paymentMethod === 'online_payment' && (

                                    <p className="mt-3 rounded-xl bg-white px-3 py-2.5 text-xs leading-5 text-neutral-500">

                                        You will complete the payment in a Cashfree popup. Your ShopSphere order is created only after the backend verifies successful payment.

                                    </p>

                                )}

                            </div>


                            {submitError && (

                                <p
                                    role="alert"
                                    className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                                >

                                    {
                                        submitErrorMessage
                                    }

                                </p>

                            )}


                            {productRefreshFailed && (

                                <p
                                    role="alert"
                                    className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                                >

                                    A product could not be verified. Return to your bag and remove unavailable items before checking out.

                                </p>

                            )}


                            <button
                                type="submit"
                                disabled={

                                    orderMutation.isPending ||

                                    saveAddressMutation.isPending ||

                                    productsLoading ||

                                    addressesQuery.isLoading ||

                                    productRefreshFailed ||

                                    !items.length ||

                                    outOfStock ||

                                    (
                                        !selectedAddress &&
                                        selectedAddressId !==
                                        'new'
                                    )

                                }
                                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#153d35] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#0f302a] disabled:cursor-not-allowed disabled:opacity-50"
                            >

                                {
                                    saveAddressMutation.isPending

                                        ? 'Saving address…'

                                        : orderMutation.isPending

                                            ? 'Placing order…'

                                            : paymentAttempt

                                                ? 'Payment in progress…'

                                                : productsLoading

                                                    ? 'Checking products…'

                                                    : 'Place order'
                                }


                                {
                                    !saveAddressMutation.isPending &&
                                    !orderMutation.isPending &&
                                    !paymentAttempt &&
                                    !productsLoading && (

                                        <ArrowRight
                                            size={16}
                                        />

                                    )
                                }

                            </button>

                        </form>

                    </section>


                    <aside className="rounded-[28px] border border-neutral-200 bg-[#f7f7f4] p-5 sm:p-7 lg:sticky lg:top-24">

                        <h2 className="text-lg font-semibold">

                            Order summary

                        </h2>


                        <div className="mt-5 max-h-72 space-y-4 overflow-y-auto">

                            {liveItems.map(
                                ({
                                    product,
                                    quantity,
                                }) => (

                                    <div
                                        key={
                                            product.id
                                        }
                                        className="flex justify-between gap-4 text-sm"
                                    >

                                        <span className="min-w-0 text-neutral-600">

                                            {
                                                product.name
                                            }


                                            <span className="text-neutral-400">

                                                {' '}

                                                × {quantity}

                                            </span>

                                        </span>


                                        <span className="shrink-0 font-medium">

                                            {
                                                formatPrice(
                                                    Number(
                                                        product.price,
                                                    ) *
                                                    quantity,
                                                )
                                            }

                                        </span>

                                    </div>

                                ),
                            )}

                        </div>


                        <div className="mt-6 space-y-3 border-t border-neutral-200 pt-5 text-sm">

                            <div className="flex justify-between">

                                <span className="text-neutral-500">

                                    Subtotal

                                </span>


                                <span>

                                    {
                                        formatPrice(
                                            subtotal,
                                        )
                                    }

                                </span>

                            </div>


                            <div className="flex justify-between">

                                <span className="text-neutral-500">

                                    Delivery

                                </span>


                                <span>

                                    {
                                        shipping

                                            ? formatPrice(
                                                shipping,
                                            )

                                            : 'Free'
                                    }

                                </span>

                            </div>


                            <div className="flex justify-between border-t border-neutral-200 pt-4 text-base font-semibold">

                                <span>

                                    Total

                                </span>


                                <span>

                                    {
                                        formatPrice(
                                            total,
                                        )
                                    }

                                </span>

                            </div>

                        </div>


                        {outOfStock && (

                            <p
                                role="alert"
                                className="mt-4 text-xs text-red-600"
                            >

                                A cart item is out of stock or the available quantity has changed. Update your bag before ordering.

                            </p>

                        )}


                        <div className="mt-5 space-y-3 border-t border-neutral-200 pt-5 text-xs text-neutral-500">

                            <p className="flex gap-2">

                                <Truck
                                    size={15}
                                    className="shrink-0 text-[#18705c]"
                                />

                                Free delivery on orders of ₹1,999 or more; otherwise ₹99.

                            </p>


                            <p className="flex gap-2">

                                <ShieldCheck
                                    size={15}
                                    className="shrink-0 text-[#18705c]"
                                />

                                {paymentMethod === 'online_payment'
                                    ? 'Online payment is processed through Cashfree Sandbox. Your order is created only after successful payment verification.'
                                    : 'Cash on delivery. Prices and inventory are verified securely when you place the order.'
                                }

                            </p>

                        </div>

                    </aside>

                </div>

            </main>


            <Footer />


            {/* ==================================================
                ORDER SUCCESS POPUP
            ================================================== */}

            {placedOrder && (

                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 px-5 backdrop-blur-sm">

                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="order-success-title"
                        className="w-full max-w-[460px] rounded-[30px] border border-neutral-200 bg-white p-7 shadow-2xl sm:p-9"
                    >

                        <div className="flex flex-col items-center text-center">

                            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#e7f4ee]">

                                <CheckCircle2
                                    size={42}
                                    className="text-[#18705c]"
                                />

                            </div>


                            <p className="mt-6 text-[10px] font-semibold tracking-[0.2em] text-[#18705c]">

                                ORDER CONFIRMED

                            </p>


                            <h2
                                id="order-success-title"
                                className="mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl"
                            >

                                Order placed successfully!

                            </h2>


                            <p className="mt-3 max-w-sm text-sm leading-6 text-neutral-500">

                                Thank you for your purchase. Your order has been received successfully.

                            </p>


                            {
                                placedOrder.id != null && (

                                    <div className="mt-5 w-full rounded-2xl bg-[#f7f7f4] px-5 py-4">

                                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">

                                            Order ID

                                        </p>


                                        <p className="mt-1 text-lg font-semibold text-[#153d35]">

                                            #{placedOrder.id}

                                        </p>

                                    </div>

                                )
                            }


                            <div className="mt-6 grid w-full gap-3 sm:grid-cols-2">

                                <button
                                    type="button"
                                    onClick={
                                        handleContinueShopping
                                    }
                                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#153d35] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#0f302a]"
                                >

                                    <ShoppingBag
                                        size={16}
                                    />

                                    Continue shopping

                                </button>


                                <button
                                    type="button"
                                    onClick={
                                        handleViewOrders
                                    }
                                    className="inline-flex items-center justify-center gap-2 rounded-full border border-neutral-200 px-5 py-3.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
                                >

                                    View orders

                                    <ArrowRight
                                        size={15}
                                    />

                                </button>

                            </div>

                        </div>

                    </div>

                </div>

            )}

        </div>

    )
}


export default Checkout