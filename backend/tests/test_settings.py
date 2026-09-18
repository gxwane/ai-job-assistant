"""
系统配置中心 API 单元测试套件
- 验证 GET /api/settings
- 验证 POST /api/settings 及其防误清空与即时热重载
- 验证 POST /api/settings/test 连通性测试及异常排障诊断
"""
import unittest
from unittest.mock import MagicMock, patch

import httpx
from fastapi.testclient import TestClient

from app.database import Base, SessionLocal, engine
from app.main import app
from app.models import SystemSetting
from app.services.llm_client import llm_client


class TestSettingsAPI(unittest.TestCase):
    def setUp(self):
        Base.metadata.create_all(bind=engine)
        self.client = TestClient(app)
        self.db = SessionLocal()
        # 清理旧设置
        self.db.query(SystemSetting).delete()
        self.db.commit()

    def tearDown(self):
        self.db.query(SystemSetting).delete()
        self.db.commit()
        self.db.close()
        # 恢复默认客户端状态
        llm_client.load_active_config()

    def test_get_settings_default(self):
        """测试首次获取系统设置，应自动创建默认单例并回显正确结构"""
        resp = self.client.get("/api/settings")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("provider", data)
        self.assertIn("base_url", data)
        self.assertIn("model", data)
        self.assertIn("masked_api_key", data)
        self.assertIn("has_api_key", data)
        self.assertIn("active_mock_mode", data)

    def test_update_settings_hot_reloads_client(self):
        """测试更新配置，并验证数据库存储与 llm_client 单例即时热生效"""
        payload = {
            "provider": "siliconflow",
            "base_url": "https://api.siliconflow.cn/v1",
            "model": "deepseek-ai/DeepSeek-V3",
            "api_key": "sk-12345678abcdef",
            "temperature": 0.5,
            "max_tokens": 2048,
            "is_mock_mode": False,
        }
        resp = self.client.post("/api/settings", json=payload)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["provider"], "siliconflow")
        self.assertEqual(data["base_url"], "https://api.siliconflow.cn/v1")
        self.assertEqual(data["model"], "deepseek-ai/DeepSeek-V3")
        self.assertTrue(data["has_api_key"])
        self.assertEqual(data["masked_api_key"], "sk-1****cdef")
        self.assertFalse(data["active_mock_mode"])

        # 校验 llm_client 单例内存热生效
        self.assertEqual(llm_client.model, "deepseek-ai/DeepSeek-V3")
        self.assertEqual(llm_client.base_url, "https://api.siliconflow.cn/v1")
        self.assertEqual(llm_client.api_key, "sk-12345678abcdef")
        self.assertFalse(llm_client.mock_mode)

    def test_update_settings_preserves_masked_key(self):
        """测试防误清空：传掩码或 None 时不覆盖已有有效密钥"""
        # 1. 先存入一个密钥
        self.client.post("/api/settings", json={
            "provider": "deepseek",
            "base_url": "https://api.deepseek.com",
            "model": "deepseek-chat",
            "api_key": "sk-my-secret-key-123",
        })

        # 2. 修改模型名称，但传星号掩码
        resp = self.client.post("/api/settings", json={
            "provider": "deepseek",
            "base_url": "https://api.deepseek.com",
            "model": "deepseek-reasoner",
            "api_key": "sk-my****-123",
        })
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["model"], "deepseek-reasoner")
        self.assertTrue(data["has_api_key"])

        # 验证底层数据库依然存有原完整密钥
        setting = self.db.query(SystemSetting).filter(SystemSetting.id == 1).first()
        self.assertEqual(setting.api_key, "sk-my-secret-key-123")
        self.assertEqual(llm_client.api_key, "sk-my-secret-key-123")

    @patch("app.routers.settings.httpx.Client")
    def test_test_connection_success(self, mock_client_cls):
        """测试连通性测试接口 - 200 成功响应"""
        mock_client = MagicMock()
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_client.post.return_value = mock_resp
        mock_client_cls.return_value.__enter__.return_value = mock_client

        payload = {
            "provider": "deepseek",
            "base_url": "https://api.deepseek.com",
            "model": "deepseek-chat",
            "api_key": "sk-valid-key",
        }
        resp = self.client.post("/api/settings/test", json=payload)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["status_code"], 200)
        self.assertIn("连接成功", data["message"])

    @patch("app.routers.settings.httpx.Client")
    def test_test_connection_401_diagnostic(self, mock_client_cls):
        """测试连通性测试接口 - 401 密钥失效排障诊断"""
        mock_client = MagicMock()
        mock_resp = MagicMock()
        mock_resp.status_code = 401
        mock_resp.text = '{"error": "Invalid API key"}'
        mock_client.post.return_value = mock_resp
        mock_client_cls.return_value.__enter__.return_value = mock_client

        payload = {
            "provider": "deepseek",
            "base_url": "https://api.deepseek.com",
            "model": "deepseek-chat",
            "api_key": "sk-invalid-key",
        }
        resp = self.client.post("/api/settings/test", json=payload)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertFalse(data["success"])
        self.assertEqual(data["status_code"], 401)
        self.assertIn("401", data["message"])
        self.assertIn("建议", data["message"])

    @patch("app.routers.settings.httpx.Client")
    def test_test_connection_timeout(self, mock_client_cls):
        """测试连通性测试接口 - 超时诊断"""
        mock_client = MagicMock()
        mock_client.post.side_effect = httpx.ConnectTimeout("Connection timed out")
        mock_client_cls.return_value.__enter__.return_value = mock_client

        payload = {
            "provider": "ollama",
            "base_url": "http://localhost:11434/v1",
            "model": "deepseek-r1:8b",
        }
        resp = self.client.post("/api/settings/test", json=payload)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertFalse(data["success"])
        self.assertEqual(data["status_code"], 504)
        self.assertIn("超时", data["message"])


if __name__ == "__main__":
    unittest.main()
