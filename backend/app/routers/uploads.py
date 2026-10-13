import logging
from io import BytesIO
from typing import Literal

import cloudinary
import cloudinary.uploader
from cloudinary.exceptions import Error as CloudinaryError
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from fastapi.concurrency import run_in_threadpool
from PIL import Image, UnidentifiedImageError

from app.core.config import settings
from app.core.security import require_admin
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/uploads",
    tags=["Image Uploads"],
)

MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
MAX_IMAGE_PIXELS = 40_000_000

ALLOWED_IMAGE_FORMATS = {"JPEG", "PNG", "WEBP"}

ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}


@router.post("/images")
async def upload_image(
    file: UploadFile = File(...),
    purpose: Literal["product", "category"] = Form(...),
    current_admin: User = Depends(require_admin),
):
    """Upload a product or category image to Cloudinary."""

    # Authorization is enforced by require_admin.
    del current_admin

    # Check Cloudinary configuration.
    if not (
        settings.cloudinary_cloud_name.strip()
        and settings.cloudinary_api_key.strip()
        and settings.cloudinary_api_secret.get_secret_value().strip()
    ):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Image uploads are not configured. "
                "Check Cloudinary environment variables in backend/.env."
            ),
        )

    # Check the declared MIME type.
    declared_type = (file.content_type or "").lower().strip()

    if declared_type and declared_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only JPEG, PNG, and WebP images are supported.",
        )

    # Read at most 5 MB plus one byte.
    content = await file.read(MAX_IMAGE_SIZE_BYTES + 1)

    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Choose an image file to upload.",
        )

    if len(content) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image size must be 5 MB or less.",
        )

    # Validate the actual image contents.
    try:
        with Image.open(BytesIO(content)) as image:
            if image.format not in ALLOWED_IMAGE_FORMATS:
                raise HTTPException(
                    status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                    detail="Only JPEG, PNG, and WebP images are supported.",
                )

            if image.width * image.height > MAX_IMAGE_PIXELS:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail="Image dimensions are too large.",
                )

            detected_format = image.format.lower()
            image.verify()

    except HTTPException:
        raise

    except (
        UnidentifiedImageError,
        OSError,
        Image.DecompressionBombError,
    ) as exc:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="The selected file is not a valid supported image.",
        ) from exc

    # Configure Cloudinary from server-side settings.
    cloudinary.config(
        cloud_name=settings.cloudinary_cloud_name.strip(),
        api_key=settings.cloudinary_api_key.strip(),
        api_secret=settings.cloudinary_api_secret.get_secret_value(),
        secure=True,
    )

    folder = {
        "product": "shopsphere/products",
        "category": "shopsphere/categories",
    }[purpose]

    try:
        result = await run_in_threadpool(
            cloudinary.uploader.upload,
            BytesIO(content),
            resource_type="image",
            folder=folder,
            allowed_formats=["jpg", "jpeg", "png", "webp"],
            unique_filename=True,
            overwrite=False,
            use_filename=False,
            tags=["shopsphere", purpose],
        )

    except CloudinaryError:
        # The detailed exception stays in server logs, not the API response.
        logger.exception(
            "Cloudinary rejected the image upload. Purpose=%s, folder=%s",
            purpose,
            folder,
        )

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "Cloud image storage could not complete the upload. "
                "Check the backend logs for details."
            ),
        )

    except Exception:
        logger.exception(
            "Unexpected error during image upload. Purpose=%s",
            purpose,
        )

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Image upload failed. Check the backend logs for details.",
        )

    secure_url = result.get("secure_url")

    if not isinstance(secure_url, str) or not secure_url.startswith("https://"):
        logger.error(
            "Cloudinary returned no valid secure URL. Purpose=%s",
            purpose,
        )

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Cloud image storage did not return a secure image URL.",
        )

    return {
        "image_url": secure_url,
        "public_id": result.get("public_id"),
        "asset_id": result.get("asset_id"),
        "format": result.get("format", detected_format),
        "width": result.get("width"),
        "height": result.get("height"),
        "bytes": result.get("bytes", len(content)),
    }
