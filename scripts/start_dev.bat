@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

set "REPO_ROOT=%~dp0.."
cd /d "%REPO_ROOT%"

echo ========================================================
echo  [AI-Job-Assistant] 极速开发环境一键启动 (Windows)
echo ========================================================
echo.

:: 1. 端口占用前置检查
netstat -ano | findstr /R /C:":8000 " >nul 2>&1
if not errorlevel 1 (
    echo [WARNING] 端口 8000 已被占用，可能导致后端启动失败！
    echo 请先关闭占用 8000 端口的进程后再试。
    echo.
)

netstat -ano | findstr /R /C:":5173 " >nul 2>&1
if not errorlevel 1 (
    echo [WARNING] 端口 5173 已被占用！
    echo Vite 可能会自动切换端口，导致 CORS 鉴权失败。
    echo 建议释放 5173 端口后再启动。
    echo.
)

:: 2. 后端配置初始化
if not exist "%REPO_ROOT%\backend\.env" (
    if exist "%REPO_ROOT%\backend\.env.example" (
        echo [INFO] 未检测到 backend\.env，正在根据 .env.example 自动创建...
        copy "%REPO_ROOT%\backend\.env.example" "%REPO_ROOT%\backend\.env" >nul
        echo [INFO] backend\.env 初始化完成（默认启用 Mock 模式，填写 API Key 可开启真实 AI）
    )
)

:: 3. 前端依赖检查
if not exist "%REPO_ROOT%\frontend\node_modules" (
    echo [INFO] 未检测到前端 node_modules，正在执行 npm install...
    cd /d "%REPO_ROOT%\frontend"
    call npm install
    cd /d "%REPO_ROOT%"
)

:: 4. 启动后端 (优先 uv，降级 venv/python)
where uv >nul 2>&1
if not errorlevel 1 (
    echo [START] 使用 Astral uv 启动后端服务 (Port 8000)...
    start "AI-Job-Assistant Backend (Port 8000)" cmd /k "cd /d "%REPO_ROOT%\backend" && uv run uvicorn app.main:app --reload --port 8000"
) else if exist "%REPO_ROOT%\backend\.venv\Scripts\activate.bat" (
    echo [START] 使用本地虚拟环境启动后端服务 (Port 8000)...
    start "AI-Job-Assistant Backend (Port 8000)" cmd /k "cd /d "%REPO_ROOT%\backend" && call .venv\Scripts\activate.bat && uvicorn app.main:app --reload --port 8000"
) else (
    echo [START] 使用系统 Python 启动后端服务 (Port 8000)...
    start "AI-Job-Assistant Backend (Port 8000)" cmd /k "cd /d "%REPO_ROOT%\backend" && python -m uvicorn app.main:app --reload --port 8000"
)

:: 5. 启动前端 Vite 服务
echo [START] 启动前端开发服务器 (Port 5173)...
start "AI-Job-Assistant Frontend (Port 5173)" cmd /k "cd /d "%REPO_ROOT%\frontend" && call npm run dev"

echo.
echo ========================================================
echo  开发环境启动就绪！
echo  - 前端界面: http://localhost:5173
echo  - 后端接口: http://127.0.0.1:8000/docs
echo ========================================================
echo.
pause
