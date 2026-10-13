import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import SecretStr
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.core.security import require_admin
from app.database.session import Base, get_db
from app.models.user import User
from app.routers.admin_ai_chat import router
import app.routers.admin_ai_chat as ai_chat_module

# Register all model tables for the isolated test database.
from app.models.address import Address  # noqa: F401
from app.models.cart import CartItem  # noqa: F401
from app.models.category import Category  # noqa: F401
from app.models.newsletter import NewsletterSubscription  # noqa: F401
from app.models.notification import Notification  # noqa: F401
from app.models.order import Order, OrderItem  # noqa: F401
from app.models.payment import PaymentAttempt  # noqa: F401
from app.models.product import Product  # noqa: F401
from app.models.refund import Refund  # noqa: F401
from app.models.review import Review  # noqa: F401
from app.models.wishlist import WishlistItem  # noqa: F401


@pytest.fixture()
def chat_client():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    db = session_factory()
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")

    def override_db():
        yield db

    app.dependency_overrides[get_db] = override_db
    with TestClient(app) as client:
        yield client, app, db
    db.close()
    Base.metadata.drop_all(engine)
    engine.dispose()


def admin_user():
    return User(id=1, name="Test Admin", email="admin@example.test", password_hash="not-used", role="admin", is_active=True)


def test_chat_endpoint_requires_authentication(chat_client):
    client, _app, _db = chat_client
    response = client.post("/api/v1/admin/ai-chat", json={"message": "sales this month"})
    assert response.status_code == 401


def test_admin_can_use_database_fallback_without_llm_key(chat_client, monkeypatch):
    client, app, _db = chat_client
    app.dependency_overrides[require_admin] = admin_user
    monkeypatch.setattr(settings, "ai_api_key", SecretStr(""))

    response = client.post("/api/v1/admin/ai-chat", json={"message": "How did sales perform this month?"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["mode"] == "analytics_only"
    assert any(item["tool"] == "sales_summary" for item in payload["analytics"])


def test_fallback_comparison_queries_both_periods(chat_client, monkeypatch):
    client, app, _db = chat_client
    app.dependency_overrides[require_admin] = admin_user
    monkeypatch.setattr(settings, "ai_api_key", SecretStr(""))

    response = client.post("/api/v1/admin/ai-chat", json={"message": "Compare sales this month with last month."})
    assert response.status_code == 200
    summaries = [item for item in response.json()["analytics"] if item["tool"] == "sales_summary"]
    assert len(summaries) == 2
    assert summaries[0]["data"]["period"] != summaries[1]["data"]["period"]
    assert "Period comparison" in response.json()["answer"]


def test_ai_provider_tool_call_is_executed_by_allow_list(chat_client, monkeypatch):
    client, app, _db = chat_client
    app.dependency_overrides[require_admin] = admin_user
    monkeypatch.setattr(settings, "ai_api_key", SecretStr("test-only-key"))

    class FakeResponse:
        def __init__(self, body):
            self.body = body

        def raise_for_status(self):
            return None

        def json(self):
            return self.body

    class FakeClient:
        def __init__(self, timeout):
            self.call_count = 0

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

        def post(self, _url, headers, json):
            assert headers["Authorization"] == "Bearer test-only-key"
            self.call_count += 1
            if self.call_count == 1:
                return FakeResponse({"choices": [{"message": {
                    "role": "assistant",
                    "content": "",
                    "tool_calls": [{
                        "id": "call-1",
                        "type": "function",
                        "function": {"name": "sales_summary", "arguments": "{}"},
                    }],
                }}]})
            return FakeResponse({"choices": [{"message": {
                "role": "assistant", "content": "I checked the ShopSphere sales summary.", "tool_calls": [],
            }}]})

    monkeypatch.setattr(ai_chat_module.httpx, "Client", FakeClient)
    response = client.post("/api/v1/admin/ai-chat", json={"message": "Summarize sales this month."})
    assert response.status_code == 200
    payload = response.json()
    assert payload["mode"] == "ai"
    assert payload["answer"] == "I checked the ShopSphere sales summary."
    assert payload["analytics"][0]["tool"] == "sales_summary"
