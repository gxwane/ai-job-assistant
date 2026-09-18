import unittest

from fastapi.testclient import TestClient

from app.main import app


class ResumeDefaultRouteTests(unittest.TestCase):
    def test_default_resume_route_returns_success(self):
        client = TestClient(app)

        response = client.get("/api/resume/default")

        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertIn("has_resume", body)
        self.assertIn("resume_id", body)
        self.assertIn("filename", body)


if __name__ == "__main__":
    unittest.main()
