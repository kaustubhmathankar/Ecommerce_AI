import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react'

import { useAuth } from './AuthContext'

import {
    addCartItem,
    clearServerCart,
    getCart,
    removeCartItem,
    syncCart,
    updateCartItem,
} from '../api/cart'

const CartContext = createContext(null)

const GUEST_STORAGE_KEY = 'shopsphere_cart_guest'
const LEGACY_STORAGE_KEY = 'shopsphere_cart'
const MAX_ITEM_QUANTITY = 10

function legacyUserStorageKey(userId) {
    return `shopsphere_cart_user_${userId}`
}

function parseStoredCart(storageKey) {
    try {
        const stored = localStorage.getItem(storageKey)
        const parsed = stored ? JSON.parse(stored) : []

        if (!Array.isArray(parsed)) {
            return []
        }

        return parsed.filter(
            (item) =>
                item?.product?.id != null &&
                Number.isInteger(item.quantity) &&
                item.quantity > 0 &&
                item.quantity <= MAX_ITEM_QUANTITY,
        )
    } catch (error) {
        console.error(
            'Unable to restore ShopSphere cart:',
            error,
        )

        return []
    }
}

function readGuestCart() {
    const modern = parseStoredCart(
        GUEST_STORAGE_KEY,
    )

    if (modern.length) {
        return modern
    }

    return parseStoredCart(
        LEGACY_STORAGE_KEY,
    )
}

function readInitialCart(userId) {
    const guestItems = readGuestCart()

    if (!userId) {
        return guestItems
    }

    const userItems = parseStoredCart(
        legacyUserStorageKey(userId),
    )

    const merged = [...userItems]

    for (const guestItem of guestItems) {
        const existing = merged.find(
            (item) =>
                String(item.product.id) ===
                String(guestItem.product.id),
        )

        if (existing) {
            existing.quantity = Math.min(
                existing.quantity + guestItem.quantity,
                MAX_ITEM_QUANTITY,
            )
        } else {
            merged.push(guestItem)
        }
    }

    return merged
}

function getStock(product) {
    return Math.max(
        0,
        Number(product?.stock_quantity) || 0,
    )
}

export function CartProvider({ children }) {
    const { user } = useAuth()

    return (
        <CartStateProvider
            key={user?.id ? `user-${user.id}` : 'guest'}
            userId={user?.id ?? null}
        >
            {children}
        </CartStateProvider>
    )
}

function CartStateProvider({
    children,
    userId,
}) {
    const [items, setItems] = useState(
        () => readInitialCart(userId),
    )

    const itemsRef = useRef(items)
    const serverSyncStartedRef = useRef(false)
    const operationQueueRef = useRef(
        Promise.resolve(),
    )

    const applyItems = useCallback((nextItems) => {
        itemsRef.current = nextItems
        setItems(nextItems)
    }, [])

    const queueServerOperation = useCallback(
        (operation) => {
            operationQueueRef.current =
                operationQueueRef.current
                    .catch(() => undefined)
                    .then(operation)

            return operationQueueRef.current
        },
        [],
    )

    const refreshServerCart =
        useCallback(async () => {
            try {
                const response = await getCart()

                const serverItems =
                    response.items.map((item) => ({
                        product: item.product,
                        quantity: item.quantity,
                    }))

                applyItems(serverItems)

                return serverItems
            } catch (error) {
                console.error(
                    'Unable to refresh ShopSphere cart:',
                    error,
                )

                return null
            }
        }, [applyItems])

    useEffect(() => {
        if (userId) {
            return
        }

        try {
            localStorage.setItem(
                GUEST_STORAGE_KEY,
                JSON.stringify(items),
            )
        } catch (error) {
            console.error(
                'Unable to save ShopSphere guest cart:',
                error,
            )
        }
    }, [items, userId])

    useEffect(() => {
        if (!userId || serverSyncStartedRef.current) {
            return
        }

        serverSyncStartedRef.current = true

        const localItems = itemsRef.current

        queueServerOperation(async () => {
            try {
                const response = await syncCart(
                    localItems,
                )

                const serverItems =
                    response.items.map((item) => ({
                        product: item.product,
                        quantity: item.quantity,
                    }))

                applyItems(serverItems)

                localStorage.removeItem(
                    GUEST_STORAGE_KEY,
                )

                localStorage.removeItem(
                    LEGACY_STORAGE_KEY,
                )

                localStorage.removeItem(
                    legacyUserStorageKey(userId),
                )
            } catch (error) {
                console.error(
                    'Unable to sync ShopSphere cart:',
                    error,
                )

                await refreshServerCart()
            }
        })
    }, [
        userId,
        applyItems,
        queueServerOperation,
        refreshServerCart,
    ])

    const addItem = useCallback(
        (product, quantity = 1) => {
            if (
                !product?.id ||
                getStock(product) < 1
            ) {
                return {
                    success: false,
                    message:
                        'This product is out of stock.',
                }
            }

            const requested = Math.max(
                1,
                Math.floor(
                    Number(quantity) || 1,
                ),
            )

            const current =
                itemsRef.current

            const existing = current.find(
                (item) =>
                    String(item.product.id) ===
                    String(product.id),
            )

            const currentQuantity =
                existing?.quantity || 0

            const limit = Math.min(
                getStock(product),
                MAX_ITEM_QUANTITY,
            )

            const nextQuantity = Math.min(
                currentQuantity + requested,
                limit,
            )

            if (
                nextQuantity <=
                currentQuantity
            ) {
                return {
                    success: false,
                    message: `Maximum available quantity is ${limit}.`,
                }
            }

            const nextItems = existing
                ? current.map((item) =>
                    String(item.product.id) ===
                        String(product.id)
                        ? {
                            product,
                            quantity:
                                nextQuantity,
                        }
                        : item,
                )
                : [
                    ...current,
                    {
                        product,
                        quantity:
                            nextQuantity,
                    },
                ]

            applyItems(nextItems)

            if (userId) {
                queueServerOperation(
                    async () => {
                        try {
                            await addCartItem(
                                product.id,
                                requested,
                            )
                        } catch (error) {
                            console.error(
                                'Unable to add cart item:',
                                error,
                            )

                            await refreshServerCart()
                        }
                    },
                )
            }

            return {
                success: true,
                message: 'Added to your bag.',
            }
        },
        [
            userId,
            applyItems,
            queueServerOperation,
            refreshServerCart,
        ],
    )

    const updateQuantity = useCallback(
        (productId, quantity) => {
            const requested =
                Math.floor(Number(quantity))

            if (
                !Number.isFinite(requested) ||
                requested < 1
            ) {
                return
            }

            const current =
                itemsRef.current

            const item = current.find(
                (entry) =>
                    String(entry.product.id) ===
                    String(productId),
            )

            if (!item) {
                return
            }

            const limit = Math.min(
                getStock(item.product),
                MAX_ITEM_QUANTITY,
            )

            const nextQuantity = Math.min(
                requested,
                limit,
            )

            if (nextQuantity < 1) {
                return
            }

            const nextItems = current.map(
                (entry) =>
                    String(entry.product.id) ===
                        String(productId)
                        ? {
                            ...entry,
                            quantity:
                                nextQuantity,
                        }
                        : entry,
            )

            applyItems(nextItems)

            if (userId) {
                queueServerOperation(
                    async () => {
                        try {
                            await updateCartItem(
                                productId,
                                nextQuantity,
                            )
                        } catch (error) {
                            console.error(
                                'Unable to update cart item:',
                                error,
                            )

                            await refreshServerCart()
                        }
                    },
                )
            }
        },
        [
            userId,
            applyItems,
            queueServerOperation,
            refreshServerCart,
        ],
    )

    const removeItem = useCallback(
        (productId) => {
            const nextItems =
                itemsRef.current.filter(
                    (item) =>
                        String(item.product.id) !==
                        String(productId),
                )

            applyItems(nextItems)

            if (userId) {
                queueServerOperation(
                    async () => {
                        try {
                            await removeCartItem(
                                productId,
                            )
                        } catch (error) {
                            console.error(
                                'Unable to remove cart item:',
                                error,
                            )

                            await refreshServerCart()
                        }
                    },
                )
            }
        },
        [
            userId,
            applyItems,
            queueServerOperation,
            refreshServerCart,
        ],
    )

    const clearCart = useCallback(() => {
        applyItems([])

        if (userId) {
            queueServerOperation(
                async () => {
                    try {
                        await clearServerCart()
                    } catch (error) {
                        console.error(
                            'Unable to clear server cart:',
                            error,
                        )

                        await refreshServerCart()
                    }
                },
            )
        }
    }, [
        userId,
        applyItems,
        queueServerOperation,
        refreshServerCart,
    ])

    const cartCount = items.reduce(
        (total, item) =>
            total + item.quantity,
        0,
    )

    const subtotal = items.reduce(
        (total, item) =>
            total +
            Number(item.product.price) *
            item.quantity,
        0,
    )

    const shipping =
        subtotal === 0 || subtotal >= 1999
            ? 0
            : 99

    const total =
        subtotal + shipping

    const value = useMemo(
        () => ({
            items,
            cartCount,
            subtotal,
            shipping,
            total,
            addItem,
            updateQuantity,
            removeItem,
            clearCart,
        }),
        [
            items,
            cartCount,
            subtotal,
            shipping,
            total,
            addItem,
            updateQuantity,
            removeItem,
            clearCart,
        ],
    )

    return (
        <CartContext.Provider value={value}>
            {children}
        </CartContext.Provider>
    )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart() {
    const context =
        useContext(CartContext)

    if (!context) {
        throw new Error(
            'useCart must be used inside CartProvider',
        )
    }

    return context
}