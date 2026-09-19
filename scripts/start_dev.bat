@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

set "REPO_ROOT=%~dp0.."
cd /d "%REPO_ROOT%"

echo ========================================================
echo  [AI求职助手] 一键启动 (Windows)
echo ========================================================
echo.

:: ─── 1. 端口占用检查（给出人话提示） ───────────────────────────────
netstat -ano | findstr /R /C:":8000 " >nul 2>&1
if not errorlevel 1 (
    echo [提示] 8000 端口已被占用。
    echo        如果你之前已经启动过本工具，请先运行 stop_dev.bat 停止旧进程。
    echo        否则请关闭其他占用该端口的软件后再试。
    echo.
)
netstat -ano | findstr /R /C:":5173 " >nul 2>&1
if not errorlevel 1 (
    echo [提示] 5173 端口已被占用。
    echo        建议先运行 stop_dev.bat，释放端口后再重新启动。
    echo.
)

:: ─── 2. 配置文件初始化 ───────────────────────────────────────────────
if not exist "%REPO_ROOT%\backend\.env" (
    if exist "%REPO_ROOT%\backend\.env.example" (
        echo [初始化] 正在创建配置文件 backend\.env ...
        copy "%REPO_ROOT%\backend\.env.example" "%REPO_ROOT%\backend\.env" >nul
        echo [初始化] 默认使用 Mock 离线模式，无需 API Key 即可体验所有功能。
        echo          启动后可在网页右上角「模型设置」填写 API Key 接入真实 AI。
        echo.
    )
)

:: ─── 3. 后端运行环境准备（三级降级 + 依赖自愈） ─────────────────────
echo [检测] 正在检测后端运行环境...

where uv >nul 2>&1
if not errorlevel 1 (
    echo [OK] 检测到 Astral uv，使用 uv 管理依赖。
    set "BACKEND_START=uv run uvicorn app.main:app --reload --port 8000"
    goto :start_backend
)

if exist "%REPO_ROOT%\backend\.venv\Scripts\activate.bat" (
    echo [OK] 检测到本地虚拟环境 .venv。
    set "BACKEND_START=call .venv\Scripts\activate.bat && uvicorn app.main:app --reload --port 8000"
    goto :start_backend
)

:: 无 uv / 无 .venv —— 自动创建虚拟环境并安装依赖
echo [安装] 未检测到 uv 或虚拟环境，正在用系统 Python 创建虚拟环境...
python --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo [错误] 未检测到 Python！
    echo        请先安装 Python 3.11 或以上版本：https://www.python.org/downloads/
    echo        安装时请勾选 "Add python.exe to PATH"。
    pause
    exit /b 1
)
echo [安装] 正在创建虚拟环境（首次约需 1 分钟）...
python -m venv "%REPO_ROOT%\backend\.venv"
echo [安装] 正在安装后端依赖（首次约需 2-3 分钟，请耐心等待）...
call "%REPO_ROOT%\backend\.venv\Scripts\activate.bat"
pip install -r "%REPO_ROOT%\backend\requirements.txt" --quiet
echo [安装] 后端依赖安装完成。
set "BACKEND_START=call .venv\Scripts\activate.bat && uvicorn app.main:app --reload --port 8000"

:start_backend
echo [启动] 正在启动后端服务（端口 8000）...
start "AI求职助手 - 后端" cmd /k "title AI求职助手 - 后端服务 && cd /d "%REPO_ROOT%\backend" && %BACKEND_START%"

:: ─── 4. 前端依赖检查与启动 ───────────────────────────────────────────
echo [检测] 正在检测前端依赖...
if not exist "%REPO_ROOT%\frontend\node_modules" (
    echo [安装] 正在安装前端依赖（首次约需 1-2 分钟）...
    cd /d "%REPO_ROOT%\frontend"
    call npm install --quiet
    cd /d "%REPO_ROOT%"
    echo [安装] 前端依赖安装完成。
)

echo [启动] 正在启动前端服务（端口 5173）...
start "AI求职助手 - 前端" cmd /k "title AI求职助手 - 前端服务 && cd /d "%REPO_ROOT%\frontend" && npm run dev"

:: ─── 5. 等待服务就绪后自动打开浏览器 ────────────────────────────────
echo.
echo ========================================================
echo  两个黑色窗口正在后台启动服务，请稍等 5 秒...
echo  启动后浏览器将自动打开，请不要关闭这两个黑窗口。
echo  需要停止时，请运行 scripts\stop_dev.bat
echo ========================================================
echo.

:: 等待 5 秒，让后端和前端有时间启动
ping -n 6 127.0.0.1 >nul 2>&1
start "" "http://localhost:5173"

echo [完成] 浏览器已打开 http://localhost:5173
echo        如果页面报错，请等待几秒后刷新（服务可能还在启动中）。
echo.
pause
