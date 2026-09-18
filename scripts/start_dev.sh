#!/usr/bin/env bash
# ========================================================
# 极速开发环境一键启动 (Linux / macOS / WSL)
# ========================================================
set -m # 启用作业控制

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

echo -e "\033[1;36m========================================================\033[0m"
echo -e "\033[1;36m  [AI-Job-Assistant] 极速开发环境一键启动 (Unix/macOS)  \033[0m"
echo -e "\033[1;36m========================================================\033[0m\n"

# 1. 进程安全回收陷阱 (防止孤儿端口占用)
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
    echo -e "\n\033[1;33m[SHUTDOWN]\033[0m 正在优雅停止前后端服务..."
    trap - SIGINT SIGTERM EXIT
    [ -n "$BACKEND_PID" ] && kill -TERM "$BACKEND_PID" 2>/dev/null || true
    [ -n "$FRONTEND_PID" ] && kill -TERM "$FRONTEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
    wait "$FRONTEND_PID" 2>/dev/null || true
    echo -e "\033[1;32m[DONE]\033[0m 所有服务已安全退出。"
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# 2. 端口占用前置探测
check_port() {
    local port="$1"
    python3 -c "import socket; s = socket.socket(); s.settimeout(0.3); exit(0 if s.connect_ex(('127.0.0.1', $port)) == 0 else 1)" 2>/dev/null
}

if check_port 8000; then
    echo -e "\033[1;31m[WARNING] 端口 8000 已被占用，后端服务可能启动失败！\033[0m"
fi

if check_port 5173; then
    echo -e "\033[1;31m[WARNING] 端口 5173 已被占用！Vite 自动切端口将导致 CORS 失败！\033[0m"
fi

# 3. 配置文件初始化
if [ ! -f "$REPO_ROOT/backend/.env" ] && [ -f "$REPO_ROOT/backend/.env.example" ]; then
    echo -e "\033[1;34m[INFO]\033[0m 自动创建 backend/.env 模板..."
    cp "$REPO_ROOT/backend/.env.example" "$REPO_ROOT/backend/.env"
fi

# 4. 启动后端 (优先 uv)
echo -e "\033[1;32m[START]\033[0m 正在启动后端服务 (Port 8000)..."
if command -v uv >/dev/null 2>&1; then
    (cd "$REPO_ROOT/backend" && uv run uvicorn app.main:app --reload --port 8000) &
    BACKEND_PID=$!
elif [ -f "$REPO_ROOT/backend/.venv/bin/activate" ]; then
    (cd "$REPO_ROOT/backend" && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000) &
    BACKEND_PID=$!
else
    (cd "$REPO_ROOT/backend" && python3 -m uvicorn app.main:app --reload --port 8000) &
    BACKEND_PID=$!
fi

# 5. 前端依赖检查与启动
if [ ! -d "$REPO_ROOT/frontend/node_modules" ]; then
    echo -e "\033[1;34m[INFO]\033[0m 正在安装前端依赖 (npm install)..."
    (cd "$REPO_ROOT/frontend" && npm install)
fi

echo -e "\033[1;32m[START]\033[0m 正在启动前端服务 (Port 5173)..."
(cd "$REPO_ROOT/frontend" && npm run dev) &
FRONTEND_PID=$!

echo -e "\n\033[1;36m========================================================\033[0m"
echo -e "\033[1;36m  开发环境就绪！按 Ctrl+C 可同时停止前后端服务  \033[0m"
echo -e "  - 前端界面: \033[1;32mhttp://localhost:5173\033[0m"
echo -e "  - 后端接口: \033[1;32mhttp://127.0.0.1:8000/docs\033[0m"
echo -e "\033[1;36m========================================================\033[0m\n"

wait
