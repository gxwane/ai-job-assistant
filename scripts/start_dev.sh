#!/usr/bin/env bash
# ========================================================
#  AI求职助手 一键启动 (Linux / macOS / WSL)
# ========================================================
set -m  # 启用作业控制

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

echo -e "\033[1;36m========================================================\033[0m"
echo -e "\033[1;36m  [AI求职助手] 一键启动 (Linux / macOS / WSL)         \033[0m"
echo -e "\033[1;36m========================================================\033[0m\n"

# ─── 1. 进程安全回收（Ctrl+C 时清理孤儿进程） ────────────────────────
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
    echo -e "\n\033[1;33m[停止]\033[0m 正在停止所有服务..."
    trap - SIGINT SIGTERM EXIT
    [ -n "$BACKEND_PID" ]  && kill -TERM "$BACKEND_PID"  2>/dev/null || true
    [ -n "$FRONTEND_PID" ] && kill -TERM "$FRONTEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID"  2>/dev/null || true
    wait "$FRONTEND_PID" 2>/dev/null || true
    echo -e "\033[1;32m[完成]\033[0m 所有服务已退出，端口已释放。"
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# ─── 2. 端口占用检查 ──────────────────────────────────────────────────
check_port() {
    python3 -c "import socket; s=socket.socket(); s.settimeout(0.3); exit(0 if s.connect_ex(('127.0.0.1',$1))==0 else 1)" 2>/dev/null
}
if check_port 8000; then
    echo -e "\033[1;31m[提示]\033[0m 8000 端口已被占用，可能是之前启动的服务未退出。"
    echo -e "       请先在另一个终端执行：lsof -ti:8000 | xargs kill -9"
fi
if check_port 5173; then
    echo -e "\033[1;31m[提示]\033[0m 5173 端口已被占用。"
    echo -e "       请先执行：lsof -ti:5173 | xargs kill -9"
fi

# ─── 3. 配置文件初始化 ────────────────────────────────────────────────
if [ ! -f "$REPO_ROOT/backend/.env" ] && [ -f "$REPO_ROOT/backend/.env.example" ]; then
    echo -e "\033[1;34m[初始化]\033[0m 正在创建配置文件 backend/.env ..."
    cp "$REPO_ROOT/backend/.env.example" "$REPO_ROOT/backend/.env"
    echo -e "\033[1;34m[初始化]\033[0m 默认使用 Mock 离线模式，启动后可在网页右上角「模型设置」配置 API Key。\n"
fi

# ─── 4. 后端运行环境准备（三级降级 + 依赖自愈） ─────────────────────
echo -e "\033[1;34m[检测]\033[0m 正在检测后端运行环境..."
cd "$REPO_ROOT/backend"

if command -v uv >/dev/null 2>&1; then
    echo -e "\033[1;32m[OK]\033[0m 检测到 Astral uv，使用 uv 管理依赖。"
    uv run uvicorn app.main:app --reload --port 8000 &
    BACKEND_PID=$!
elif [ -f "$REPO_ROOT/backend/.venv/bin/activate" ]; then
    echo -e "\033[1;32m[OK]\033[0m 检测到本地虚拟环境 .venv。"
    # shellcheck disable=SC1091
    source "$REPO_ROOT/backend/.venv/bin/activate"
    uvicorn app.main:app --reload --port 8000 &
    BACKEND_PID=$!
else
    # 无 uv / 无 .venv —— 自动创建虚拟环境并安装依赖
    echo -e "\033[1;33m[安装]\033[0m 未检测到 uv 或虚拟环境，正在创建 .venv 并安装依赖（首次约需 2-3 分钟）..."
    if ! command -v python3 >/dev/null 2>&1; then
        echo -e "\033[1;31m[错误]\033[0m 未检测到 Python3，请先安装 Python 3.11+："
        echo -e "       macOS: brew install python@3.11"
        echo -e "       Ubuntu/Debian: sudo apt install python3.11 python3.11-venv"
        exit 1
    fi
    python3 -m venv "$REPO_ROOT/backend/.venv"
    # shellcheck disable=SC1091
    source "$REPO_ROOT/backend/.venv/bin/activate"
    pip install -r "$REPO_ROOT/backend/requirements.txt" --quiet
    echo -e "\033[1;32m[完成]\033[0m 依赖安装完成，正在启动后端..."
    uvicorn app.main:app --reload --port 8000 &
    BACKEND_PID=$!
fi
cd "$REPO_ROOT"

# ─── 5. 前端依赖检查与启动 ───────────────────────────────────────────
echo -e "\033[1;34m[检测]\033[0m 正在检测前端依赖..."
if [ ! -d "$REPO_ROOT/frontend/node_modules" ]; then
    echo -e "\033[1;33m[安装]\033[0m 正在安装前端依赖（首次约需 1-2 分钟）..."
    (cd "$REPO_ROOT/frontend" && npm install --silent)
    echo -e "\033[1;32m[完成]\033[0m 前端依赖安装完成。"
fi
echo -e "\033[1;32m[启动]\033[0m 正在启动前端服务（端口 5173）..."
(cd "$REPO_ROOT/frontend" && npm run dev) &
FRONTEND_PID=$!

# ─── 6. 等待就绪后自动打开浏览器 ────────────────────────────────────
sleep 5
echo -e "\n\033[1;36m========================================================\033[0m"
echo -e "  服务已就绪！正在自动打开浏览器..."
echo -e "  - 前端界面: \033[1;32mhttp://localhost:5173\033[0m"
echo -e "  - 后端接口: \033[1;32mhttp://127.0.0.1:8000/docs\033[0m"
echo -e "  按 Ctrl+C 可同时停止所有服务"
echo -e "\033[1;36m========================================================\033[0m\n"

# 跨平台打开浏览器
if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "http://localhost:5173" >/dev/null 2>&1 &
elif command -v open >/dev/null 2>&1; then
    open "http://localhost:5173" &
fi

wait
