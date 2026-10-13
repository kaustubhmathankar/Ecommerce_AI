from contextlib import asynccontextmanager
import unittest

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token
from app.database.session import Base, get_db
from app.main import app
from app.models.user import User


@asynccontextmanager
async def empty_lifespan(_app):
    yield


class AddressApiTests(unittest.TestCase):
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

        with self.Session() as db:
            db.add_all(
                [
                    User(
                        name="Customer One",
                        email="one@example.com",
                        password_hash="not-used",
                        role="customer",
                        is_active=True,
                    ),
                    User(
                        name="Customer Two",
                        email="two@example.com",
                        password_hash="not-used",
                        role="customer",
                        is_active=True,
                    ),
                ]
            )
            db.commit()
            self.user_ids = {user.email: user.id for user in db.query(User).all()}

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

    def token(self, email):
        return {
            "Authorization": f"Bearer {create_access_token(str(self.user_ids[email]))}"
        }

    @staticmethod
    def address_payload(label="Home", postal_code="400001"):
        return {
            "label": label,
            "full_name": "Customer One",
            "phone": "+91 98765 43210",
            "address_line": "42 Example Street",
            "city": "Mumbai",
            "state": "Maharashtra",
            "postal_code": postal_code,
            "country": "India",
        }

    def test_first_address_is_default_and_new_default_replaces_previous(self):
        headers = self.token("one@example.com")
        first = self.client.post(
            "/api/v1/addresses",
            headers=headers,
            json=self.address_payload(),
        )
        self.assertEqual(first.status_code, 201, first.text)
        first = first.json()
        self.assertTrue(first["is_default"])

        second = self.client.post(
            "/api/v1/addresses",
            headers=headers,
            json={**self.address_payload("Work", "400002"), "is_default": True},
        )
        self.assertEqual(second.status_code, 201, second.text)
        second = second.json()
        self.assertTrue(second["is_default"])

        addresses = self.client.get("/api/v1/addresses", headers=headers)
        self.assertEqual(addresses.status_code, 200)
        self.assertEqual([item["id"] for item in addresses.json()], [second["id"], first["id"]])
        self.assertTrue(addresses.json()[0]["is_default"])
        self.assertFalse(addresses.json()[1]["is_default"])

    def test_update_set_default_and_delete_promotes_remaining_address(self):
        headers = self.token("one@example.com")
        first = self.client.post(
            "/api/v1/addresses", headers=headers, json=self.address_payload()
        ).json()
        second = self.client.post(
            "/api/v1/addresses",
            headers=headers,
            json=self.address_payload("Work", "400002"),
        ).json()

        response = self.client.post(
            f"/api/v1/addresses/{second['id']}/default",
            headers=headers,
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["is_default"])

        response = self.client.patch(
            f"/api/v1/addresses/{first['id']}",
            headers=headers,
            json={"city": "Navi Mumbai", "is_default": True},
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["city"], "Navi Mumbai")
        self.assertTrue(response.json()["is_default"])

        response = self.client.delete(
            f"/api/v1/addresses/{first['id']}",
            headers=headers,
        )
        self.assertEqual(response.status_code, 204)

        remaining = self.client.get("/api/v1/addresses", headers=headers).json()
        self.assertEqual(len(remaining), 1)
        self.assertEqual(remaining[0]["id"], second["id"])
        self.assertTrue(remaining[0]["is_default"])

    def test_user_cannot_read_or_modify_another_users_address(self):
        first = self.client.post(
            "/api/v1/addresses",
            headers=self.token("one@example.com"),
            json=self.address_payload(),
        ).json()

        headers = self.token("two@example.com")
        self.assertEqual(
            self.client.patch(
                f"/api/v1/addresses/{first['id']}",
                headers=headers,
                json={"city": "Pune"},
            ).status_code,
            404,
        )
        self.assertEqual(
            self.client.delete(
                f"/api/v1/addresses/{first['id']}",
                headers=headers,
            ).status_code,
            404,
        )

    def test_default_address_cannot_be_unset(self):
        headers = self.token("one@example.com")
        address = self.client.post(
            "/api/v1/addresses",
            headers=headers,
            json=self.address_payload(),
        ).json()

        response = self.client.patch(
            f"/api/v1/addresses/{address['id']}",
            headers=headers,
            json={"is_default": False},
        )
        self.assertEqual(response.status_code, 400)

    def test_address_validation_and_authentication(self):
        self.assertEqual(self.client.get("/api/v1/addresses").status_code, 401)
        response = self.client.post(
            "/api/v1/addresses",
            headers=self.token("one@example.com"),
            json={**self.address_payload(), "phone": "not-a-phone"},
        )
        self.assertEqual(response.status_code, 422)


if __name__ == "__main__":
    unittest.main()
