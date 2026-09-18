"""
AI求职助手 - 后端入口
FastAPI 应用主文件
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import MOCK_MODE
from .database import init_db
from .routers import analysis, history, job_records, ocr, plugin, resume, settings, statistics
from .services.llm_client import llm_client

# 创建 FastAPI 应用
app = FastAPI(
    title="AI求职助手 API",
    description="上传简历，粘贴岗位JD，快速判断岗位匹配度",
    version="1.0.0",
)

# 配置 CORS（允许前端与浏览器插件跨域访问）
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_origin_regex=r"^(chrome-extension://.*|moz-extension://.*|https://.*\.zhipin\.com)$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(resume.router)
app.include_router(analysis.router)
app.include_router(history.router)
app.include_router(plugin.router)
app.include_router(job_records.router)
app.include_router(ocr.router)
app.include_router(statistics.router)
app.include_router(settings.router)


@app.on_event("startup")
def startup_event():
    """应用启动时初始化数据库与大模型运行态配置"""
    init_db()
    llm_client.load_active_config()
    if llm_client.mock_mode:
        print("=" * 50)
        print("[!] 当前运行在 MOCK 模式（未配置 API Key 或开启离线模式）")
        print("    可在前端顶部「模型设置」或 .env 中配置 API Key")
        print("=" * 50)
    else:
        print(f"[OK] 已接入大模型 ({llm_client.model})，将使用真实 AI 分析")


@app.get("/")
def root():
    """根路径健康检查"""
    return {
        "message": "AI求职助手 API 运行中",
        "version": "1.0.0",
        "mock_mode": MOCK_MODE,
    }
