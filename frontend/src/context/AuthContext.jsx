import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react'

import {
    getCurrentUser,
    loginUser,
    logoutUser,
    registerUser,
    requestPasswordReset,
    resetPassword as resetPasswordRequest,
} from '../api/auth'

const AuthContext = createContext(null)

function readStoredUser() {
    try {
        const storedUser = localStorage.getItem('shopsphere_user')
        return storedUser ? JSON.parse(storedUser) : null
    } catch (error) {
        console.error('Unable to restore the ShopSphere account session:', error)
        return null
    }
}

export function AuthProvider({ children }) {
    const [token, setToken] = useState(
        () => localStorage.getItem('shopsphere_token') || '',
    )
    const [user, setUser] = useState(readStoredUser)
    const [loading, setLoading] = useState(Boolean(token))

    const refreshUser = useCallback(async () => {
        if (!token) {
            setLoading(false)
            return null
        }

        try {
            const currentUser = await getCurrentUser()
            setUser(currentUser)
            localStorage.setItem(
                'shopsphere_user',
                JSON.stringify(currentUser),
            )
            return currentUser
        } catch (error) {
            if (error?.response?.status === 401) {
                logoutUser()
                setToken('')
                setUser(null)
            } else {
                console.error('Unable to refresh the ShopSphere account session:', error)
            }
            return null
        } finally {
            setLoading(false)
        }
    }, [token])

    useEffect(() => {
        if (!token) return

        // The refresh performs an API request before it updates authentication state.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        refreshUser()
    }, [refreshUser, token])

    const login = useCallback(async (payload) => {
        const response = await loginUser(payload)
        setToken(response.access_token)
        setUser(response.user)
        setLoading(false)
        localStorage.setItem(
            'shopsphere_user',
            JSON.stringify(response.user),
        )
        return response
    }, [])

    const register = useCallback(async (payload) => {
        const response = await registerUser(payload)
        return response
    }, [])

    const logout = useCallback(() => {
        logoutUser()
        setToken('')
        setUser(null)
        setLoading(false)
    }, [])

    const forgotPassword = useCallback(async (email) => {
        const response = await requestPasswordReset(email)
        return response
    }, [])

    const resetPassword = useCallback(async (payload) => {
        const response = await resetPasswordRequest(payload)
        return response
    }, [])

    const value = useMemo(
        () => ({
            token,
            user,
            loading,
            isAuthenticated: Boolean(token && user),
            isAdmin: user?.role === 'admin',
            login,
            register,
            logout,
            forgotPassword,
            resetPassword,
            refreshUser,
        }),
        [token, user, loading, login, register, logout, forgotPassword, resetPassword, refreshUser],
    )

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const context = useContext(AuthContext)

    if (!context) {
        throw new Error('useAuth must be used inside AuthProvider')
    }

    return context
}
