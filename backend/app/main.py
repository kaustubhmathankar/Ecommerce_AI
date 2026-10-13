from contextlib import asynccontextmanager
import logging
from time import perf_counter
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.database.session import Base, SessionLocal, engine

# Import models so SQLAlchemy knows about all tables.
from app.models.address import Address  # noqa: F401
from app.models.cart import CartItem  # noqa: F401
from app.models.notification import Notification  # noqa: F401
from app.models.review import Review  # noqa: F401
from app.models.user import User
from app.models.wishlist import WishlistItem  # noqa: F401
from app.models.payment import PaymentAttempt  # noqa: F401
from app.models.refund import Refund  # noqa: F401

# Routers
from app.routers.addresses import router as addresses_router
from app.routers.admin import router as admin_router
from app.routers.admin_ai_chat import router as admin_ai_chat_router
from app.routers.auth import router as auth_router
from app.routers.cart import router as cart_router
from app.routers.categories import router as categories_router
from app.routers.health import router as health_router
from app.routers.newsletter import router as newsletter_router
from app.routers.notifications import router as notifications_router
from app.routers.orders import router as orders_router
from app.routers.products import router as products_router
from app.routers.uploads import router as uploads_router
from app.routers.wishlist import router as wishlist_router
from app.routers.payments import router as payments_router
from app.routers.reviews import (
    router as reviews_router,
    admin_router as admin_reviews_router,
)
from app.routers.refunds import router as refunds_router

logger = logging.getLogger(
    "shopsphere.api",
)

logger.setLevel(
    logging.INFO,
)


def seed_default_admin() -> None:
    db: Session = SessionLocal()

    try:
        admin = (
            db.query(User)
            .filter(User.email == settings.default_admin_email.lower())
            .first()
        )

        if admin is None:
            db.add(
                User(
                    name="ShopSphere Admin",
                    email=settings.default_admin_email.lower(),
                    password_hash=hash_password(
                        settings.default_admin_password,
                    ),
                    role="admin",
                    is_active=True,
                )
            )

            db.commit()

        else:
            admin.role = "admin"
            admin.is_active = True

            if admin.password_hash == "":
                admin.password_hash = hash_password(
                    settings.default_admin_password,
                )

            db.commit()

    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(
        bind=engine,
    )

    seed_default_admin()

    yield

    engine.dispose()


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="ShopSphere e-commerce backend API",
    debug=False,
    lifespan=lifespan,
)


@app.middleware("http")
async def add_request_context(
    request: Request,
    call_next,
):
    request_id = uuid4().hex

    request.state.request_id = request_id

    started_at = perf_counter()

    response = await call_next(
        request,
    )

    response.headers["X-Request-ID"] = request_id

    duration_ms = (perf_counter() - started_at) * 1000

    logger.info(
        "Request completed request_id=%s method=%s path=%s "
        "status_code=%s duration_ms=%.2f",
        request_id,
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
        extra={
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": round(
                duration_ms,
                2,
            ),
        },
    )

    return response


@app.exception_handler(Exception)
async def unhandled_exception_handler(
    request: Request,
    exc: Exception,
):
    request_id = getattr(
        request.state,
        "request_id",
        "unavailable",
    )

    logger.exception(
        "Unhandled request exception request_id=%s method=%s path=%s",
        request_id,
        request.method,
        request.url.path,
        extra={
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
        },
    )

    return JSONResponse(
        status_code=500,
        content={
            "detail": "An unexpected server error occurred.",
            "request_id": request_id,
        },
        headers={
            "X-Request-ID": request_id,
        },
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=[
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS",
    ],
    allow_headers=[
        "Authorization",
        "Content-Type",
    ],
    expose_headers=[
        "X-Request-ID",
    ],
)


# -------------------------------------------------------------------
# API ROUTES
# -------------------------------------------------------------------

app.include_router(
    refunds_router,
    prefix=settings.api_v1_prefix,
)

app.include_router(
    health_router,
    prefix=settings.api_v1_prefix,
)

app.include_router(
    auth_router,
    prefix=settings.api_v1_prefix,
)

app.include_router(
    products_router,
    prefix=settings.api_v1_prefix,
)

# New protected image upload endpoint.
app.include_router(
    uploads_router,
    prefix=settings.api_v1_prefix,
)

app.include_router(
    categories_router,
    prefix=settings.api_v1_prefix,
)

app.include_router(
    orders_router,
    prefix=settings.api_v1_prefix,
)

app.include_router(
    payments_router,
    prefix=settings.api_v1_prefix,
)

# Address management
app.include_router(
    addresses_router,
    prefix=settings.api_v1_prefix,
)

# Persistent cart
app.include_router(
    cart_router,
    prefix=settings.api_v1_prefix,
)

# Persistent wishlist
app.include_router(
    wishlist_router,
    prefix=settings.api_v1_prefix,
)

app.include_router(
    newsletter_router,
    prefix=settings.api_v1_prefix,
)

app.include_router(
    reviews_router,
    prefix=settings.api_v1_prefix,
)

app.include_router(
    admin_reviews_router,
    prefix=settings.api_v1_prefix,
)

# Notifications
app.include_router(
    notifications_router,
    prefix=settings.api_v1_prefix,
)

# Admin APIs
app.include_router(
    admin_router,
    prefix=settings.api_v1_prefix,
)

# Admin-only AI analytics assistant. Existing endpoints remain unchanged.
app.include_router(
    admin_ai_chat_router,
    prefix=settings.api_v1_prefix,
)


@app.get(
    "/",
    tags=["Root"],
)
def root():
    return {
        "message": "Welcome to ShopSphere API",
        "version": settings.app_version,
        "docs": "/docs",
    }
