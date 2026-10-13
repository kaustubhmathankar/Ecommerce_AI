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
    getWishlist,
    syncWishlist,
    toggleWishlistItem,
} from '../api/wishlist'

const WishlistContext =
    createContext(null)

const GUEST_STORAGE_KEY =
    'shopsphere_wishlist_guest'

function legacyUserStorageKey(userId) {
    return `shopsphere_wishlist_user_${userId}`
}

function parseStoredWishlist(storageKey) {
    try {
        const stored =
            localStorage.getItem(storageKey)

        const parsed = stored
            ? JSON.parse(stored)
            : []

        if (!Array.isArray(parsed)) {
            return []
        }

        return [
            ...new Set(
                parsed
                    .map(Number)
                    .filter(
                        (id) =>
                            Number.isInteger(id) &&
                            id > 0,
                    ),
            ),
        ]
    } catch (error) {
        console.error(
            'Unable to restore ShopSphere wishlist:',
            error,
        )

        return []
    }
}

function readInitialWishlist(userId) {
    const guestIds =
        parseStoredWishlist(
            GUEST_STORAGE_KEY,
        )

    if (!userId) {
        return guestIds
    }

    const userIds =
        parseStoredWishlist(
            legacyUserStorageKey(userId),
        )

    return [
        ...new Set([
            ...userIds,
            ...guestIds,
        ]),
    ]
}

export function WishlistProvider({
    children,
}) {
    const { user } = useAuth()

    return (
        <WishlistStateProvider
            key={
                user?.id
                    ? `user-${user.id}`
                    : 'guest'
            }
            userId={user?.id ?? null}
        >
            {children}
        </WishlistStateProvider>
    )
}

function WishlistStateProvider({
    children,
    userId,
}) {
    const [productIds, setProductIds] =
        useState(
            () =>
                readInitialWishlist(userId),
        )

    const productIdsRef =
        useRef(productIds)

    const serverSyncStartedRef =
        useRef(false)

    const operationQueueRef = useRef(
        Promise.resolve(),
    )

    const applyProductIds =
        useCallback((nextIds) => {
            const cleanIds = [
                ...new Set(
                    nextIds
                        .map(Number)
                        .filter(
                            (id) =>
                                Number.isInteger(
                                    id,
                                ) &&
                                id > 0,
                        ),
                ),
            ]

            productIdsRef.current =
                cleanIds

            setProductIds(cleanIds)
        }, [])

    const queueServerOperation =
        useCallback(
            (operation) => {
                operationQueueRef.current =
                    operationQueueRef.current
                        .catch(
                            () => undefined,
                        )
                        .then(operation)

                return operationQueueRef.current
            },
            [],
        )

    const refreshServerWishlist =
        useCallback(async () => {
            try {
                const response =
                    await getWishlist()

                applyProductIds(
                    response.product_ids,
                )

                return response.product_ids
            } catch (error) {
                console.error(
                    'Unable to refresh ShopSphere wishlist:',
                    error,
                )

                return null
            }
        }, [applyProductIds])

    useEffect(() => {
        if (userId) {
            return
        }

        try {
            localStorage.setItem(
                GUEST_STORAGE_KEY,
                JSON.stringify(productIds),
            )
        } catch (error) {
            console.error(
                'Unable to save ShopSphere wishlist:',
                error,
            )
        }
    }, [productIds, userId])

    useEffect(() => {
        if (
            !userId ||
            serverSyncStartedRef.current
        ) {
            return
        }

        serverSyncStartedRef.current = true

        const localIds =
            productIdsRef.current

        queueServerOperation(
            async () => {
                try {
                    const response =
                        await syncWishlist(
                            localIds,
                        )

                    applyProductIds(
                        response.product_ids,
                    )

                    localStorage.removeItem(
                        GUEST_STORAGE_KEY,
                    )

                    localStorage.removeItem(
                        legacyUserStorageKey(
                            userId,
                        ),
                    )
                } catch (error) {
                    console.error(
                        'Unable to sync ShopSphere wishlist:',
                        error,
                    )

                    await refreshServerWishlist()
                }
            },
        )
    }, [
        userId,
        applyProductIds,
        queueServerOperation,
        refreshServerWishlist,
    ])

    const toggleWishlist =
        useCallback(
            (product) => {
                if (!product?.id) {
                    return
                }

                const productId =
                    Number(product.id)

                const current =
                    productIdsRef.current

                const exists =
                    current.includes(productId)

                const nextIds = exists
                    ? current.filter(
                        (id) =>
                            id !==
                            productId,
                    )
                    : [
                        ...current,
                        productId,
                    ]

                applyProductIds(nextIds)

                if (userId) {
                    queueServerOperation(
                        async () => {
                            try {
                                await toggleWishlistItem(
                                    productId,
                                )
                            } catch (error) {
                                console.error(
                                    'Unable to update server wishlist:',
                                    error,
                                )

                                await refreshServerWishlist()
                            }
                        },
                    )
                }
            },
            [
                userId,
                applyProductIds,
                queueServerOperation,
                refreshServerWishlist,
            ],
        )

    const value = useMemo(
        () => ({
            productIds,
            wishlistCount:
                productIds.length,
            toggleWishlist,
        }),
        [
            productIds,
            toggleWishlist,
        ],
    )

    return (
        <WishlistContext.Provider
            value={value}
        >
            {children}
        </WishlistContext.Provider>
    )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWishlist() {
    const context =
        useContext(WishlistContext)

    if (!context) {
        throw new Error(
            'useWishlist must be used inside WishlistProvider',
        )
    }

    return context
}