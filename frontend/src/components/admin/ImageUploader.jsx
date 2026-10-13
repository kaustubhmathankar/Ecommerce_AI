import {
    ImagePlus,
    LoaderCircle,
    RefreshCw,
    Trash2,
    UploadCloud,
} from 'lucide-react'

import {
    useEffect,
    useRef,
    useState,
} from 'react'

import {
    uploadAdminImage,
} from '../../api/uploads'

import {
    getApiErrorMessage,
} from '../../api/client'

import {
    handleImageError,
} from '../../utils/images'


const MAX_IMAGE_BYTES =
    5 * 1024 * 1024


const ACCEPTED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
])


const ACCEPTED_EXTENSIONS = new Set([
    'jpg',
    'jpeg',
    'png',
    'webp',
])


function ImageUploader({
    label = 'Image',
    purpose,
    value = '',
    onChange,
    onUploadingChange,
    alt = 'Image preview',
    disabled = false,
}) {
    const inputRef = useRef(null)

    const [
        localPreview,
        setLocalPreview,
    ] = useState('')

    const [
        fileName,
        setFileName,
    ] = useState('')

    const [
        uploading,
        setUploading,
    ] = useState(false)

    const [
        progress,
        setProgress,
    ] = useState(0)

    const [
        error,
        setError,
    ] = useState('')


    // Revoke temporary browser preview URLs when they change/unmount.
    useEffect(
        () => () => {
            if (
                localPreview.startsWith('blob:')
            ) {
                URL.revokeObjectURL(
                    localPreview,
                )
            }
        },
        [
            localPreview,
        ],
    )


    async function handleFileChange(
        event,
    ) {
        const file =
            event.target.files?.[0]

        // Let the admin select the same file again after an upload failure.
        event.target.value = ''

        if (
            !file ||
            disabled
        ) {
            return
        }


        const extension =
            file.name
                .split('.')
                .pop()
                ?.toLowerCase() || ''


        if (
            (
                file.type &&
                !ACCEPTED_MIME_TYPES.has(
                    file.type,
                )
            ) ||
            (
                !ACCEPTED_MIME_TYPES.has(
                    file.type,
                ) &&
                !ACCEPTED_EXTENSIONS.has(
                    extension,
                )
            )
        ) {
            setError(
                'Choose a JPG, PNG, or WebP image.',
            )

            return
        }


        if (
            file.size > MAX_IMAGE_BYTES
        ) {
            setError(
                'Image size must be 5 MB or less.',
            )

            return
        }


        if (
            file.size === 0
        ) {
            setError(
                'The selected image file is empty.',
            )

            return
        }


        // Local preview while the upload is processing.
        const preview =
            URL.createObjectURL(
                file,
            )

        setLocalPreview(
            preview,
        )

        setFileName(
            file.name,
        )

        setError('')
        setProgress(0)
        setUploading(true)

        onUploadingChange?.(true)


        try {
            const uploaded =
                await uploadAdminImage(
                    file,
                    purpose,
                    setProgress,
                )


            if (
                !uploaded?.image_url
            ) {
                throw new Error(
                    'The upload response did not contain an image URL.',
                )
            }


            // The secure cloud URL becomes the form value.
            onChange(
                uploaded.image_url,
            )

            setLocalPreview('')
            setProgress(100)

        } catch (uploadError) {

            // Keep the existing saved URL if replacement fails.
            setLocalPreview('')
            setFileName('')

            setError(
                getApiErrorMessage(
                    uploadError,
                    'Could not upload the image. Please try again.',
                ),
            )

        } finally {

            setUploading(false)

            onUploadingChange?.(
                false,
            )
        }
    }


    function clearImage() {
        if (uploading) {
            return
        }

        onChange('')

        setLocalPreview('')
        setFileName('')
        setProgress(0)
        setError('')
    }


    const previewSource =
        localPreview ||
        value ||
        ''


    return (
        <div className="space-y-3">

            {/* LABEL / ACTION */}

            <div className="flex items-center justify-between gap-3">

                <div>

                    <p className="text-xs font-semibold text-neutral-700">
                        {label}
                    </p>

                    <p className="mt-1 text-[11px] text-neutral-500">
                        JPG, PNG or WebP · Maximum 5 MB
                    </p>

                </div>


                {value && !uploading && (

                    <button
                        type="button"
                        onClick={
                            clearImage
                        }
                        disabled={
                            disabled
                        }
                        className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-2 text-[10px] font-semibold text-neutral-500 transition hover:border-red-200 hover:text-red-600 disabled:opacity-50"
                    >

                        <Trash2
                            size={12}
                        />

                        Remove image

                    </button>

                )}

            </div>


            {/* IMAGE PREVIEW */}

            <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-[#f3f2ee]">

                <div className="flex min-h-44 items-center justify-center p-3">

                    {previewSource ? (

                        <img
                            src={
                                previewSource
                            }
                            alt={
                                alt
                            }
                            onError={
                                handleImageError
                            }
                            className="h-44 w-full object-contain"
                        />

                    ) : (

                        <div className="flex flex-col items-center py-7 text-center">

                            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#18705c] shadow-sm">

                                <ImagePlus
                                    size={22}
                                />

                            </span>


                            <p className="mt-3 text-xs font-semibold text-neutral-700">
                                No image selected
                            </p>


                            <p className="mt-1 text-[10px] text-neutral-400">
                                Choose an image from your device
                            </p>

                        </div>

                    )}

                </div>


                {/* UPLOAD PROGRESS */}

                {uploading && (

                    <div className="border-t border-neutral-200 bg-white px-4 py-3">

                        <div className="flex items-center justify-between gap-3 text-[10px] font-medium text-neutral-600">

                            <span className="inline-flex min-w-0 items-center gap-2">

                                <LoaderCircle
                                    size={13}
                                    className="shrink-0 animate-spin text-[#18705c]"
                                />

                                <span className="truncate">
                                    Uploading {fileName || 'image'}...
                                </span>

                            </span>


                            <span>
                                {progress}%
                            </span>

                        </div>


                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100">

                            <div
                                className="h-full rounded-full bg-[#18705c] transition-all"
                                style={{
                                    width: `${progress}%`,
                                }}
                            />

                        </div>

                    </div>

                )}

            </div>


            {/* FILE INPUT */}

            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                onChange={
                    handleFileChange
                }
                disabled={
                    uploading ||
                    disabled
                }
                className="hidden"
            />


            {/* SELECT / REPLACE BUTTON */}

            <button
                type="button"
                onClick={() =>
                    inputRef.current?.click()
                }
                disabled={
                    uploading ||
                    disabled
                }
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-xs font-semibold text-neutral-700 transition hover:border-[#18705c] hover:text-[#18705c] disabled:cursor-wait disabled:opacity-50"
            >

                {uploading ? (

                    <LoaderCircle
                        size={15}
                        className="animate-spin"
                    />

                ) : value ? (

                    <RefreshCw
                        size={15}
                    />

                ) : (

                    <UploadCloud
                        size={15}
                    />

                )}


                {uploading
                    ? 'Uploading to cloud...'
                    : value
                        ? 'Replace image'
                        : 'Choose image'}

            </button>


            {/* SUCCESS / ERROR */}

            {fileName &&
                !uploading &&
                value && (

                    <p className="text-[10px] text-emerald-700">
                        Image uploaded. Save the form to apply it to this {purpose}.
                    </p>

                )}


            {error && (

                <p
                    role="alert"
                    className="rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-600"
                >
                    {error}
                </p>

            )}

        </div>
    )
}


export default ImageUploader