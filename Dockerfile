# ==============================================================================
# AI Job Assistant - 全栈单容器 Dockerfile（全栈单端口融合）
#
# 构建策略：多阶段构建
#   Stage 1 (frontend-builder): Node.js 环境中构建 Vue 3 前端产物
#   Stage 2 (runtime):          Python 环境运行 FastAPI，并托管前端静态文件
#
# 最终效果：用户只需访问 http://localhost:8000，前后端均由单一容器提供。
# ==============================================================================

# ─── Stage 1: 构建前端静态产物 ───────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /frontend

# 先复制 package 文件，利用 Docker 层缓存（依赖未变时跳过 npm install）
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --silent

# 复制前端源码并构建
COPY frontend/ ./
RUN npm run build

# ─── Stage 2: Python 运行时 + 中文字体 + 前端静态文件 ────────────────────────
FROM python:3.11-slim AS runtime

WORKDIR /app

# 安装开源中文字体（保证 ReportLab PDF 中文字符正常渲染）
RUN apt-get update && apt-get install -y --no-install-recommends \
    fonts-wqy-zenhei \
    fonts-wqy-microhei \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 复制 uv 二进制（Astral 官方镜像）
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

ENV UV_SYSTEM_PYTHON=1 \
    UV_LINK_MODE=copy \
    PYTHONUNBUFFERED=1

# 优先复制依赖文件与锁定清单，基于 uv.lock 实现确定性构建
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project


# 复制后端源码
COPY backend/app ./app

# 从 Stage 1 复制前端构建产物到 FastAPI 可托管路径
# main.py startup 事件会检测此目录并自动挂载 StaticFiles
COPY --from=frontend-builder /frontend/dist ./frontend/dist

# 创建持久化目录
RUN mkdir -p /app/uploads /app/data

EXPOSE 8000

# 以 uvicorn 运行，前端由 FastAPI StaticFiles 托管
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
