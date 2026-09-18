"""
AI求职助手 - 后端入口
FastAPI 应用主文件
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import MOCK_MODE
from .database import init_db
from .routers import analysis, history, job_records, ocr, plugin, resume, statistics

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


@app.on_event("startup")
def startup_event():
    """应用启动时初始化数据库"""
    init_db()
    if MOCK_MODE:
        print("=" * 50)
        print("[!] 当前运行在 MOCK 模式（未配置 DeepSeek API Key）")
        print("    如需使用真实 AI 分析，请在 .env 文件中配置 DEEPSEEK_API_KEY")
        print("=" * 50)
    else:
        print("[OK] 已配置 DeepSeek API，将使用真实 AI 分析")


@app.get("/")
def root():
    """根路径健康检查"""
    return {
        "message": "AI求职助手 API 运行中",
        "version": "1.0.0",
        "mock_mode": MOCK_MODE,
    }
