"""
AI求职助手 - 后端入口
FastAPI 应用主文件
"""
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

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

    # 全栈单端口融合 —— 若前端已构建，将 dist 目录挂载到根路径
    # 这使得用户只需启动后端（python/uv），即可通过 http://127.0.0.1:8000 访问完整 Web 界面。
    # html=True：未匹配的路径回落到 index.html，保证 Vue Router history 模式正常工作。
    # 挂载必须在所有 API 路由注册完成后执行（路由按注册顺序匹配，API 优先）。
    _dist = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
    _dist = os.path.normpath(_dist)
    if os.path.isdir(_dist):
        app.mount("/", StaticFiles(directory=_dist, html=True), name="frontend")
        print("[OK] 前端静态文件已就绪 → http://127.0.0.1:8000")
    else:
        print("[INFO] 未检测到前端构建产物（frontend/dist），纯 API 模式运行。")
        print("       如需 Web 界面，请在 frontend/ 目录执行：npm run build")


@app.get("/health")
def health():
    """健康检查（兼容原 / 路径，供 Docker healthcheck 使用）"""
    return {
        "message": "AI求职助手 API 运行中",
        "version": "1.0.0",
        "mock_mode": MOCK_MODE,
    }

