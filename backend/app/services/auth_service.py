import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.user import PasswordResetConfirm, TokenResponse, UserLogin, UserPublic, UserRegister


class AuthService:
    def __init__(self, db: Session):
        self.repository = UserRepository(db)

    def register(self, data: UserRegister) -> User:
        normalized_email = data.email.lower().strip()
        existing = self.repository.get_by_email(normalized_email)

        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists.",
            )

        user = User(
            name=data.name.strip(),
            email=normalized_email,
            password_hash=hash_password(data.password),
            role="customer",
        )

        return self.repository.create(user)

    def authenticate(self, data: UserLogin) -> TokenResponse:
        normalized_email = data.email.lower().strip()
        user = self.repository.get_by_email(normalized_email)

        if not user or not verify_password(data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
            )

        return TokenResponse(
            access_token=create_access_token(str(user.id)),
            user=UserPublic.model_validate(user),
        )

    def request_password_reset(self, email: str) -> dict:
        normalized_email = email.lower().strip()
        user = self.repository.get_by_email(normalized_email)

        if not user:
            return {
                "message": "If an account exists with that email, a reset link has been sent.",
            }

        reset_token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(
            minutes=settings.password_reset_token_expire_minutes,
        )
        user.reset_token = reset_token
        user.reset_token_expires_at = expires_at
        self.repository.update(user)

        response = {
            "message": "If an account exists with that email, a reset link has been sent.",
        }

        if settings.environment.lower() == "development":
            response["reset_token"] = reset_token

        return response

    def reset_password(self, data: PasswordResetConfirm) -> dict:
        user = self.repository.get_by_reset_token(data.token)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token.",
            )

        if user.reset_token_expires_at is None or user.reset_token_expires_at < datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token.",
            )

        user.password_hash = hash_password(data.password)
        user.reset_token = None
        user.reset_token_expires_at = None
        self.repository.update(user)

        return {"message": "Password reset successful."}
