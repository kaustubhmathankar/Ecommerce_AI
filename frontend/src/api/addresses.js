import apiClient from './client'

export async function getAddresses() {
    const response = await apiClient.get('/addresses')
    return response.data
}

export async function createAddress(payload) {
    const response = await apiClient.post('/addresses', payload)
    return response.data
}

export async function updateAddress(addressId, payload) {
    const response = await apiClient.patch(`/addresses/${addressId}`, payload)
    return response.data
}

export async function setDefaultAddress(addressId) {
    const response = await apiClient.post(`/addresses/${addressId}/default`)
    return response.data
}

export async function deleteAddress(addressId) {
    await apiClient.delete(`/addresses/${addressId}`)
}
