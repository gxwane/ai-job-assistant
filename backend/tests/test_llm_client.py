import unittest
from unittest.mock import patch

from app.services import llm_client as llm_module


class _FakeResponse:
    def raise_for_status(self):
        return None

    def json(self):
        return {"choices": [{"message": {"content": "ok"}}]}


class _FakeClient:
    def __init__(self, *args, **kwargs):
        self.payload = None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def post(self, url, json, headers):
        self.payload = {"url": url, "json": json, "headers": headers}
        return _FakeResponse()


class LLMClientTests(unittest.TestCase):
    def test_client_uses_configured_model(self):
        with patch.object(llm_module, "DEEPSEEK_MODEL", "deepseek-reasoner", create=True):
            client = llm_module.LLMClient()

        self.assertEqual(client.model, "deepseek-reasoner")

    def test_call_api_sends_configured_model(self):
        fake_client = _FakeClient()

        with patch.object(llm_module, "DEEPSEEK_API_KEY", "test-key"), \
             patch.object(llm_module, "DEEPSEEK_BASE_URL", "https://api.deepseek.com"), \
             patch.object(llm_module, "DEEPSEEK_MODEL", "deepseek-reasoner", create=True), \
             patch.object(llm_module, "MOCK_MODE", False), \
             patch.object(llm_module.httpx, "Client", return_value=fake_client):
            client = llm_module.LLMClient()
            result = client._call_api("system", "user", 0.3, 1024, 60.0)

        self.assertEqual(result, "ok")
        self.assertEqual(fake_client.payload["json"]["model"], "deepseek-reasoner")


if __name__ == "__main__":
    unittest.main()
