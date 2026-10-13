import { Navigate, useLocation } from 'react-router-dom'

import { useAuth } from '../../context/AuthContext'

function ProtectedRoute({ children, adminOnly = false }) {
    const { isAuthenticated, isAdmin, loading } = useAuth()
    const location = useLocation()

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-white text-sm text-neutral-500">
                Loading your account...
            </div>
        )
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace state={{ from: location.pathname }} />
    }

    if (adminOnly && !isAdmin) {
        return <Navigate to="/" replace />
    }

    return children
}

export default ProtectedRoute
