"""
全局配置文件
从 .env 文件读取配置，如果没有则使用默认值
"""
from decouple import config, Csv
import os

# 项目根目录
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# DeepSeek API 配置
DEEPSEEK_API_KEY = config("DEEPSEEK_API_KEY", default="")
DEEPSEEK_BASE_URL = config("DEEPSEEK_BASE_URL", default="https://api.deepseek.com")
DEEPSEEK_MODEL = config("DEEPSEEK_MODEL", default="deepseek-v4-flash")

# 如果没有配置 API Key，自动启用 mock 模式
MOCK_MODE = DEEPSEEK_API_KEY == "" or DEEPSEEK_API_KEY == "your_deepseek_api_key_here"

# 数据库配置
DATABASE_URL = config("DATABASE_URL", default="sqlite:///./ai_job_assistant.db")

# 上传文件目录
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")

# 允许的文件类型（MIME 类型映射）
ALLOWED_EXTENSIONS = {"pdf", "docx", "txt"}
