from contextlib import asynccontextmanager
from decimal import Decimal
import unittest

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token
from app.database.session import Base, get_db
from app.main import app
from app.models.category import Category
from app.models.product import Product
from app.models.user import User


@asynccontextmanager
async def empty_lifespan(_app):
    yield


class OrderApiTests(unittest.TestCase):
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
                    User(
                        name="Administrator",
                        email="admin@example.com",
                        password_hash="not-used",
                        role="admin",
                        is_active=True,
                    ),
                    Category(name="Test category", slug="test-category"),
                ]
            )
            db.commit()
            self.user_ids = {user.email: user.id for user in db.query(User).all()}
            self.category_id = db.query(Category).one().id
            db.add_all(
                [
                    Product(
                        name="First product",
                        slug="first-product",
                        sku="FIRST",
                        price=Decimal("12.50"),
                        stock_quantity=10,
                        category_id=self.category_id,
                        is_active=True,
                    ),
                    Product(
                        name="Second product",
                        slug="second-product",
                        sku="SECOND",
                        price=Decimal("3.25"),
                        stock_quantity=1,
                        category_id=self.category_id,
                        is_active=True,
                    ),
                    Product(
                        name="Inactive product",
                        slug="inactive-product",
                        sku="INACTIVE",
                        price=Decimal("5.00"),
                        stock_quantity=10,
                        category_id=self.category_id,
                        is_active=False,
                    ),
                ]
            )
            db.commit()
            self.product_ids = {
                product.sku: product.id for product in db.query(Product).all()
            }

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
    def delivery_details():
        return {
            "full_name": "Customer One",
            "phone": "+91 98765 43210",
            "address_line": "42 Example Street",
            "city": "Mumbai",
            "state": "Maharashtra",
            "postal_code": "400001",
            "payment_method": "cash_on_delivery",
        }

    def test_order_prices_from_catalog_and_decrements_stock(self):
        payload = self.delivery_details()
        payload["items"] = [
            {
                "product_id": self.product_ids["FIRST"],
                "quantity": 2,
                "unit_price": 0.01,
            }
        ]
        response = self.client.post(
            "/api/v1/orders",
            headers=self.token("one@example.com"),
            json=payload,
        )

        self.assertEqual(response.status_code, 201, response.text)
        body = response.json()
        self.assertEqual(Decimal(body["shipping_amount"]), Decimal("99.00"))
        self.assertEqual(Decimal(body["total_amount"]), Decimal("124.00"))
        self.assertEqual(Decimal(body["items"][0]["unit_price"]), Decimal("12.50"))
        self.assertEqual(body["items"][0]["quantity"], 2)
        for field, value in self.delivery_details().items():
            self.assertEqual(body[field], value)
        with self.Session() as db:
            product = db.get(Product, self.product_ids["FIRST"])
            self.assertEqual(product.stock_quantity, 8)

    def test_shipping_is_free_at_the_subtotal_threshold(self):
        with self.Session() as db:
            product = db.get(Product, self.product_ids["FIRST"])
            product.price = Decimal("1999.00")
            db.commit()
        payload = self.delivery_details()
        payload["items"] = [{"product_id": self.product_ids["FIRST"], "quantity": 1}]

        response = self.client.post(
            "/api/v1/orders",
            headers=self.token("one@example.com"),
            json=payload,
        )

        self.assertEqual(response.status_code, 201, response.text)
        self.assertEqual(Decimal(response.json()["shipping_amount"]), Decimal("0.00"))
        self.assertEqual(Decimal(response.json()["total_amount"]), Decimal("1999.00"))

    def test_order_history_is_scoped_and_detail_is_owner_or_admin_only(self):
        first = self.client.post(
            "/api/v1/orders",
            headers=self.token("one@example.com"),
            json={
                **self.delivery_details(),
                "items": [{"product_id": self.product_ids["FIRST"], "quantity": 1}],
            },
        ).json()
        second = self.client.post(
            "/api/v1/orders",
            headers=self.token("two@example.com"),
            json={
                **self.delivery_details(),
                "items": [{"product_id": self.product_ids["FIRST"], "quantity": 1}],
            },
        ).json()

        history = self.client.get(
            "/api/v1/orders", headers=self.token("one@example.com")
        )
        self.assertEqual(history.status_code, 200)
        self.assertEqual([item["id"] for item in history.json()], [first["id"]])
        self.assertEqual(
            self.client.get(
                f"/api/v1/orders/{second['id']}",
                headers=self.token("one@example.com"),
            ).status_code,
            403,
        )
        self.assertEqual(
            self.client.get(
                f"/api/v1/orders/{second['id']}",
                headers=self.token("admin@example.com"),
            ).status_code,
            200,
        )

    def test_requires_auth_and_rejects_unavailable_items_without_stock_change(self):
        self.assertEqual(
            self.client.get("/api/v1/orders").status_code,
            401,
        )
        self.assertEqual(
            self.client.post(
                "/api/v1/orders",
                headers=self.token("admin@example.com"),
                json={
                    **self.delivery_details(),
                    "items": [{"product_id": self.product_ids["FIRST"], "quantity": 1}],
                },
            ).status_code,
            403,
        )
        response = self.client.post(
            "/api/v1/orders",
            headers=self.token("one@example.com"),
            json={
                **self.delivery_details(),
                "items": [
                    {"product_id": self.product_ids["FIRST"], "quantity": 1},
                    {"product_id": self.product_ids["INACTIVE"], "quantity": 1},
                ],
            },
        )
        self.assertEqual(response.status_code, 404)
        with self.Session() as db:
            self.assertEqual(
                db.get(Product, self.product_ids["FIRST"]).stock_quantity, 10
            )

    def test_rejects_insufficient_stock_and_duplicate_products(self):
        insufficient = self.client.post(
            "/api/v1/orders",
            headers=self.token("one@example.com"),
            json={
                **self.delivery_details(),
                "items": [{"product_id": self.product_ids["SECOND"], "quantity": 2}],
            },
        )
        self.assertEqual(insufficient.status_code, 409)
        duplicate = self.client.post(
            "/api/v1/orders",
            headers=self.token("one@example.com"),
            json={
                **self.delivery_details(),
                "items": [
                    {"product_id": self.product_ids["FIRST"], "quantity": 1},
                    {"product_id": self.product_ids["FIRST"], "quantity": 1},
                ],
            },
        )
        self.assertEqual(duplicate.status_code, 422)

    def test_delivery_details_are_required_and_validated(self):
        payload = self.delivery_details()
        payload["items"] = [{"product_id": self.product_ids["FIRST"], "quantity": 1}]
        missing_field = dict(payload)
        del missing_field["address_line"]
        invalid_phone = {**payload, "phone": "not-a-phone"}
        invalid_postal_code = {**payload, "postal_code": "!"}

        for invalid_payload in (
            missing_field,
            invalid_phone,
            invalid_postal_code,
        ):
            response = self.client.post(
                "/api/v1/orders",
                headers=self.token("one@example.com"),
                json=invalid_payload,
            )
            self.assertEqual(response.status_code, 422)

    def test_payment_method_defaults_to_cod_and_rejects_unsupported_methods(self):
        payload = self.delivery_details()
        del payload["payment_method"]
        payload["items"] = [{"product_id": self.product_ids["FIRST"], "quantity": 1}]

        response = self.client.post(
            "/api/v1/orders",
            headers=self.token("one@example.com"),
            json=payload,
        )

        self.assertEqual(response.status_code, 201, response.text)
        self.assertEqual(response.json()["payment_method"], "cash_on_delivery")

        unsupported = {
            **payload,
            "payment_method": "card",
        }
        rejected = self.client.post(
            "/api/v1/orders",
            headers=self.token("one@example.com"),
            json=unsupported,
        )
        self.assertEqual(rejected.status_code, 422)

    def create_order(self, email="one@example.com"):
        response = self.client.post(
            "/api/v1/orders",
            headers=self.token(email),
            json={
                **self.delivery_details(),
                "items": [{"product_id": self.product_ids["FIRST"], "quantity": 1}],
            },
        )
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()

    def test_admin_order_list_requires_admin_and_is_newest_first(self):
        older = self.create_order()
        newer = self.create_order("two@example.com")

        self.assertEqual(self.client.get("/api/v1/orders/admin").status_code, 401)
        self.assertEqual(
            self.client.get(
                "/api/v1/orders/admin",
                headers=self.token("one@example.com"),
            ).status_code,
            403,
        )
        response = self.client.get(
            "/api/v1/orders/admin",
            headers=self.token("admin@example.com"),
        )

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(
            [order["id"] for order in response.json()],
            [newer["id"], older["id"]],
        )

    def test_admin_can_update_allowed_status_and_missing_order_is_404(self):
        order = self.create_order()
        headers = self.token("admin@example.com")

        for order_status in ("placed", "processing", "shipped", "delivered"):
            response = self.client.patch(
                f"/api/v1/orders/{order['id']}/status",
                headers=headers,
                json={"status": order_status},
            )
            self.assertEqual(response.status_code, 200, response.text)
            self.assertEqual(response.json()["status"], order_status)

        missing = self.client.patch(
            "/api/v1/orders/99999/status",
            headers=headers,
            json={"status": "processing"},
        )
        self.assertEqual(missing.status_code, 404)

    def test_order_status_update_is_admin_only_and_rejects_invalid_status(self):
        order = self.create_order()
        path = f"/api/v1/orders/{order['id']}/status"

        self.assertEqual(
            self.client.patch(path, json={"status": "processing"}).status_code,
            401,
        )
        self.assertEqual(
            self.client.patch(
                path,
                headers=self.token("one@example.com"),
                json={"status": "processing"},
            ).status_code,
            403,
        )
        invalid = self.client.patch(
            path,
            headers=self.token("admin@example.com"),
            json={"status": "cancelled"},
        )
        self.assertEqual(invalid.status_code, 422)


if __name__ == "__main__":
    unittest.main()
