import apiClient from './client'

export async function askAdminAiChat(message, history = []) {
    const response = await apiClient.post('/admin/ai-chat', {
        message,
        history: history.slice(-10),
    }, {
        timeout: 60000,
    })

    return response.data
}
