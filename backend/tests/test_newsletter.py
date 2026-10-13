from contextlib import asynccontextmanager
import unittest

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.session import Base, get_db
from app.main import app
from app.models.newsletter import NewsletterSubscription


@asynccontextmanager
async def empty_lifespan(_app):
    yield


class NewsletterApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.original_lifespan = app.router.lifespan_context
        app.router.lifespan_context = empty_lifespan

    @classmethod
    def tearDownClass(cls):
        app.router.lifespan_context = cls.original_lifespan

    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        self.Session = sessionmaker(bind=self.engine, expire_on_commit=False)
        Base.metadata.create_all(self.engine)

        def override_get_db():
            db = self.Session()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()
        app.dependency_overrides.clear()
        Base.metadata.drop_all(self.engine)
        self.engine.dispose()

    def test_subscription_is_validated_normalized_and_idempotent(self):
        first = self.client.post(
            "/api/v1/newsletter/subscribe",
            json={"email": "SHOPPER@example.com"},
        )
        second = self.client.post(
            "/api/v1/newsletter/subscribe",
            json={"email": "shopper@example.com"},
        )

        self.assertEqual(first.status_code, 200, first.text)
        self.assertEqual(second.status_code, 200, second.text)
        with self.Session() as db:
            subscriptions = db.scalars(select(NewsletterSubscription)).all()
            self.assertEqual(len(subscriptions), 1)
            self.assertEqual(subscriptions[0].email, "shopper@example.com")

    def test_subscription_rejects_invalid_email(self):
        response = self.client.post(
            "/api/v1/newsletter/subscribe",
            json={"email": "not-an-email"},
        )
        self.assertEqual(response.status_code, 422)
