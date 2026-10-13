import apiClient from './client'

export async function subscribeToNewsletter(email) {
    const response = await apiClient.post('/newsletter/subscribe', { email })
    return response.data
}
