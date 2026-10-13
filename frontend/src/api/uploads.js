import apiClient from './client'


/**
 * Upload one image as an authenticated admin.
 *
 * @param {File} file
 * @param {'product' | 'category'} purpose
 * @param {(percent: number) => void} onProgress
 * @returns {Promise<object>}
 */
export async function uploadAdminImage(
    file,
    purpose,
    onProgress,
) {
    const formData = new FormData()

    formData.append(
        'file',
        file,
    )

    formData.append(
        'purpose',
        purpose,
    )

    const response = await apiClient.post(
        '/uploads/images',
        formData,
        {
            // Axios/browser adds the multipart boundary.
            headers: {
                'Content-Type': 'multipart/form-data',
            },

            timeout: 60000,

            onUploadProgress: (event) => {
                if (
                    event.total &&
                    typeof onProgress === 'function'
                ) {
                    onProgress(
                        Math.min(
                            100,
                            Math.round(
                                (
                                    event.loaded /
                                    event.total
                                ) * 100,
                            ),
                        ),
                    )
                }
            },
        },
    )

    return response.data
}