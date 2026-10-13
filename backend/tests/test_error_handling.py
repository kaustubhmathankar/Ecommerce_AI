from contextlib import asynccontextmanager
import unittest

from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from app.database.session import get_db
from app.main import app


@asynccontextmanager
async def empty_lifespan(_app):
    yield


def raise_test_error():
    raise RuntimeError("database password must not be exposed")


class ApiErrorHandlingTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.original_lifespan = app.router.lifespan_context
        app.router.lifespan_context = empty_lifespan
        app.add_api_route(
            "/__test__/unhandled-error",
            raise_test_error,
            methods=["GET"],
            include_in_schema=False,
        )

    @classmethod
    def tearDownClass(cls):
        app.router.lifespan_context = cls.original_lifespan
        app.router.routes[:] = [
            route
            for route in app.router.routes
            if getattr(route, "path", None) != "/__test__/unhandled-error"
        ]

    def setUp(self):
        self.client = TestClient(app, raise_server_exceptions=False)

    def tearDown(self):
        self.client.close()

    def test_responses_include_request_id(self):
        response = self.client.get(
            "/api/v1/health",
            headers={"Origin": "http://localhost:5173"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.headers.get("x-request-id"))
        self.assertIn(
            "x-request-id",
            response.headers.get("access-control-expose-headers", "").lower(),
        )

    def test_unhandled_errors_are_logged_and_return_safe_response(self):
        with self.assertLogs("shopsphere.api", level="ERROR") as captured:
            response = self.client.get("/__test__/unhandled-error")

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json()["detail"], "An unexpected server error occurred.")
        self.assertNotIn("database password", response.text)
        self.assertTrue(response.json()["request_id"])
        self.assertEqual(
            response.headers.get("x-request-id"),
            response.json()["request_id"],
        )
        self.assertIn("Unhandled request exception", captured.output[0])
        self.assertIn(response.json()["request_id"], captured.output[0])

    def test_database_health_failure_is_logged_without_exposing_database_details(self):
        class FailingSession:
            def execute(self, _statement):
                raise OperationalError("SELECT 1", {}, RuntimeError("private driver detail"))

            def close(self):
                return None

        def override_get_db():
            yield FailingSession()

        app.dependency_overrides[get_db] = override_get_db
        try:
            with self.assertLogs("shopsphere.api", level="ERROR") as captured:
                response = self.client.get("/api/v1/health/database")
        finally:
            app.dependency_overrides.pop(get_db, None)

        self.assertEqual(response.status_code, 503)
        self.assertEqual(
            response.json()["detail"],
            "Database connection is unavailable.",
        )
        self.assertNotIn("private driver detail", response.text)
        self.assertIn("Database health check failed", captured.output[0])
