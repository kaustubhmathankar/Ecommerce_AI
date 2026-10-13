from functools import lru_cache
from urllib.parse import urlsplit, urlunsplit

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Application
    app_name: str = "ShopSphere API"
    app_version: str = "1.0.0"
    api_v1_prefix: str = "/api/v1"

    # Environment
    environment: str = "development"
    debug: bool = True

    # Database
    database_url: SecretStr = SecretStr("sqlite:///./shopsphere.db")

    # Frontend / CORS
    frontend_url: str = "http://localhost:5173"
    allowed_origins: str = "http://localhost:5173"

    # Authentication / Admin
    jwt_secret_key: SecretStr = SecretStr("dev-secret-change-me")
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    password_reset_token_expire_minutes: int = 30
    default_admin_email: str = "admin@shopsphere.io"
    default_admin_password: str = "Admin@1234"

    # Cashfree Payment Gateway
    cashfree_app_id: str = ""
    cashfree_secret_key: SecretStr = SecretStr("")
    cashfree_environment: str = "sandbox"
    cashfree_api_version: str = "2025-01-01"

    # Admin AI analytics chatbot (OpenAI-compatible chat completions API)
    ai_provider: str = "groq"
    ai_api_key: SecretStr = SecretStr("")
    ai_api_base_url: str = "https://api.groq.com/openai/v1"
    ai_model: str = "openai/gpt-oss-20b"
    ai_request_timeout_seconds: int = 45

    # Cloudinary image storage
    cloudinary_cloud_name: str = ""
    cloudinary_api_key: str = ""
    cloudinary_api_secret: SecretStr = SecretStr("")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins(self) -> list[str]:
        origins = [
            origin.strip()
            for origin in self.allowed_origins.split(",")
            if origin.strip()
        ]

        for origin in tuple(origins):
            parsed = urlsplit(origin)

            if parsed.hostname == "localhost":
                alias_host = "127.0.0.1"
            elif parsed.hostname == "127.0.0.1":
                alias_host = "localhost"
            else:
                continue

            alias_netloc = alias_host

            if parsed.port:
                alias_netloc = f"{alias_host}:{parsed.port}"

            alias = urlunsplit(
                (
                    parsed.scheme,
                    alias_netloc,
                    parsed.path,
                    parsed.query,
                    parsed.fragment,
                )
            )

            if alias not in origins:
                origins.append(alias)

        return origins


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
