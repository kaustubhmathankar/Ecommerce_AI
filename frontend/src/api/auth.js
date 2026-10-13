import apiClient from './client'

export async function loginUser(payload) {
    const response = await apiClient.post('/auth/login', payload)
    const token = response.data.access_token

    if (token) {
        localStorage.setItem('shopsphere_token', token)
        localStorage.setItem(
            'shopsphere_user',
            JSON.stringify(response.data.user),
        )
    }

    return response.data
}

export async function registerUser(payload) {
    const response = await apiClient.post('/auth/register', payload)
    return response.data
}

export async function getCurrentUser() {
    const response = await apiClient.get('/auth/me')
    return response.data
}

export async function requestPasswordReset(email) {
    const response = await apiClient.post('/auth/forgot-password', { email })
    return response.data
}

export async function resetPassword(payload) {
    const response = await apiClient.post('/auth/reset-password', payload)
    return response.data
}

export function logoutUser() {
    localStorage.removeItem('shopsphere_token')
    localStorage.removeItem('shopsphere_user')
}
