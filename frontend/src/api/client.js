import axios from 'axios'

export function getApiErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
    const detail = error?.response?.data?.detail
    const requestId = error?.response?.data?.request_id ||
        error?.response?.headers?.['x-request-id']

    if (error?.response?.status >= 500) {
        return requestId
            ? `The store could not complete that request. Reference: ${requestId}`
            : 'The store could not complete that request. Please try again.'
    }

    if (typeof detail === 'string' && detail.trim()) {
        return detail
    }

    if (Array.isArray(detail) && detail.length) {
        return detail
            .map((item) => item?.msg)
            .filter((message) => typeof message === 'string')
            .join(' ')
    }

    if (error?.code === 'ECONNABORTED') {
        return 'The request took too long. Please try again.'
    }

    if (!error?.response) {
        return 'Unable to connect to the store. Check your connection and try again.'
    }

    return fallback
}

const apiClient = axios.create({
    baseURL:
        import.meta.env.VITE_API_BASE_URL ||
        'http://127.0.0.1:8000/api/v1',

    headers: {
        'Content-Type': 'application/json',
    },

    timeout: 10000,
})

apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('shopsphere_token')

    if (token) {
        config.headers = {
            ...config.headers,
            Authorization: `Bearer ${token}`,
        }
    }

    return config
})

export default apiClient