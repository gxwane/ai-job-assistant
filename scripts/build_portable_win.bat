@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: ============================================================================
::  AI求职助手 · Windows 便携包构建脚本
::  运行环境：开发者机器（需要 Python 3.11+、Node.js 18+）
::  产出物  ：dist\AI求职助手_Win64\ + dist\AI求职助手_Win64.zip
:: ============================================================================

set "REPO_ROOT=%~dp0.."
set "DIST_DIR=%REPO_ROOT%\dist\AI求职助手_Win64"
set "PY_VERSION=3.11.9"
set "PY_EMBED_URL=https://www.python.org/ftp/python/%PY_VERSION%/python-%PY_VERSION%-embed-amd64.zip"
set "PY_EMBED_ZIP=%REPO_ROOT%\dist\_python_embed.zip"

echo.
echo ============================================================
echo   AI求职助手 · 便携包构建工具
echo   构建产物: dist\AI求职助手_Win64\
echo ============================================================
echo.

:: ─── 0. 前置环境检查 ────────────────────────────────────────────────────────
echo [1/7] 检查前置环境...

python --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 Python，请先安装 Python 3.11+
    pause & exit /b 1
)
for /f "tokens=2" %%v in ('python --version 2^>^&1') do set "SYS_PY_VER=%%v"
echo        系统 Python: %SYS_PY_VER%

node --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 Node.js，请先安装 Node.js 18+
    pause & exit /b 1
)
echo        Node.js: 已就绪
echo [OK] 前置环境检查通过

:: ─── 1. 构建前端 ─────────────────────────────────────────────────────────────
echo.
echo [2/7] 构建前端 (npm run build)...
cd /d "%REPO_ROOT%\frontend"
if not exist "node_modules" (
    echo        正在安装前端依赖（首次较慢）...
    call npm install --silent
)
call npm run build
if errorlevel 1 (
    echo [错误] 前端构建失败，请检查 frontend/ 代码
    pause & exit /b 1
)
echo [OK] 前端构建完成 → frontend\dist\

:: ─── 2. 清理并创建输出目录 ───────────────────────────────────────────────────
echo.
echo [3/7] 准备输出目录...
cd /d "%REPO_ROOT%"
if exist "%DIST_DIR%" (
    echo        删除旧版本...
    rmdir /s /q "%DIST_DIR%"
)
mkdir "%DIST_DIR%\backend\app"
mkdir "%DIST_DIR%\frontend\dist"
mkdir "%DIST_DIR%\uploads"
mkdir "%DIST_DIR%\data"
echo [OK] 目录结构已创建

:: ─── 3. 复制后端源码与前端产物 ───────────────────────────────────────────────
echo.
echo [4/7] 复制程序文件...
xcopy /e /q /y "%REPO_ROOT%\backend\app\*" "%DIST_DIR%\backend\app\" >nul
xcopy /e /q /y "%REPO_ROOT%\frontend\dist\*" "%DIST_DIR%\frontend\dist\" >nul
copy /y "%REPO_ROOT%\backend\.env.example" "%DIST_DIR%\backend\.env" >nul
copy /y "%REPO_ROOT%\backend\requirements-portable.txt" "%DIST_DIR%\backend\requirements-portable.txt" >nul
echo [OK] 程序文件复制完成

:: ─── 4. 下载 Python Embedded ─────────────────────────────────────────────────
echo.
echo [5/7] 准备 Python 运行时 (Python %PY_VERSION% Embedded)...
mkdir "%DIST_DIR%\python" >nul 2>&1

if not exist "%PY_EMBED_ZIP%" (
    echo        正在下载 Python Embedded (~25 MB)...
    echo        下载地址: %PY_EMBED_URL%
    powershell -NoProfile -Command ^
        "try { Invoke-WebRequest -Uri '%PY_EMBED_URL%' -OutFile '%PY_EMBED_ZIP%' -UseBasicParsing } catch { Write-Error $_.Exception.Message; exit 1 }"
    if errorlevel 1 (
        echo [错误] Python Embedded 下载失败，请检查网络连接。
        echo        可手动从以下地址下载并解压到 dist\_python_embed.zip:
        echo        %PY_EMBED_URL%
        pause & exit /b 1
    )
    echo [OK] 下载完成
) else (
    echo [跳过] 已存在缓存 %PY_EMBED_ZIP%，跳过下载
)

echo        正在解压 Python Embedded...
powershell -NoProfile -Command ^
    "Expand-Archive -Path '%PY_EMBED_ZIP%' -DestinationPath '%DIST_DIR%\python' -Force"
echo [OK] Python Embedded 解压完成

:: ─── 5. 启用 pip 并安装依赖 ──────────────────────────────────────────────────
echo.
echo [6/7] 安装后端依赖（首次约需 3-5 分钟）...

:: Python Embedded 默认禁用 site-packages，需修改 ._pth 文件
set "PTH_FILE=%DIST_DIR%\python\python311._pth"
if not exist "%PTH_FILE%" (
    :: 有时文件名版本号不同，尝试查找
    for %%f in ("%DIST_DIR%\python\python3*._pth") do set "PTH_FILE=%%f"
)
:: 追加 site-packages 支持（取消注释 import site）
powershell -NoProfile -Command ^
    "$content = Get-Content '%PTH_FILE%'; $content = $content -replace '#import site','import site'; Set-Content '%PTH_FILE%' $content"

:: 引导安装 pip（使用 ensurepip）
echo        正在引导 pip...
"%DIST_DIR%\python\python.exe" -m ensurepip --upgrade >nul 2>&1
if errorlevel 1 (
    :: ensurepip 不在 embedded 中，改用 get-pip.py
    echo        使用 get-pip.py 安装 pip...
    powershell -NoProfile -Command ^
        "Invoke-WebRequest -Uri 'https://bootstrap.pypa.io/get-pip.py' -OutFile '%DIST_DIR%\python\get-pip.py' -UseBasicParsing"
    "%DIST_DIR%\python\python.exe" "%DIST_DIR%\python\get-pip.py" --quiet
)

:: 安装后端依赖到 embedded Python 的 site-packages
echo        安装核心依赖（排除 EasyOCR，避免下载 PyTorch 1.5GB）...
"%DIST_DIR%\python\python.exe" -m pip install ^
    --target="%DIST_DIR%\python\Lib\site-packages" ^
    --no-cache-dir ^
    --quiet ^
    -r "%DIST_DIR%\backend\requirements-portable.txt"
if errorlevel 1 (
    echo [错误] 依赖安装失败，请检查网络或 requirements-portable.txt
    pause & exit /b 1
)
echo [OK] 依赖安装完成

:: ─── 6. 生成用户启动文件 ─────────────────────────────────────────────────────
echo.
echo [7/7] 生成启动文件...

:: ── 启动.bat ──
(
echo @echo off
echo chcp 65001 ^>nul
echo setlocal
echo.
echo set "APP_ROOT=%%~dp0"
echo cd /d "%%APP_ROOT%%backend"
echo.
echo echo ============================================================
echo echo   AI求职助手 - 正在启动，请稍等...
echo echo   启动完成后浏览器将自动打开
echo echo   关闭此窗口即可停止程序
echo echo ============================================================
echo echo.
echo.
echo :: 启动后端（内置 Python 运行时，无需安装）
echo start "" /B "%%APP_ROOT%%python\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000
echo.
echo :: 等待服务就绪
echo ping -n 4 127.0.0.1 ^>nul
echo.
echo :: 自动打开浏览器
echo start "" "http://127.0.0.1:8000"
echo.
echo echo 服务已启动！浏览器将自动打开 http://127.0.0.1:8000
echo echo.
echo echo 请保持此窗口开启（关闭窗口 = 停止程序）
echo echo 如需手动停止，请运行"停止.bat"
echo echo.
echo pause
) > "%DIST_DIR%\启动.bat"

:: ── 停止.bat ──
(
echo @echo off
echo chcp 65001 ^>nul
echo echo 正在停止 AI求职助手...
echo for /f "tokens=5" %%%%a in ^('netstat -ano ^| findstr /R /C:":8000 " 2^>nul'^) do ^(
echo     if not "%%%%a"=="0" taskkill /PID %%%%a /F ^>nul 2^>^&1
echo ^)
echo echo 已停止。
echo timeout /t 2 ^>nul
) > "%DIST_DIR%\停止.bat"

:: ── README.txt（纯文本，兼容记事本）──
(
echo AI求职助手 v1.0 Windows 便携版
echo ==============================
echo.
echo 【使用方法】
echo 1. 双击"启动.bat"，等待浏览器自动弹出
echo 2. 首次使用无需配置 API Key，可直接体验所有功能（Mock 演示模式）
echo 3. 需要接入真实 AI 时，在网页右上角点击「模型设置」填写 API Key
echo.
echo 【停止程序】
echo 直接关闭启动时弹出的黑色窗口，或双击"停止.bat"
echo.
echo 【数据说明】
echo - 您上传的简历保存在 uploads\ 文件夹
echo - 程序数据保存在 data\ 文件夹
echo - 两个文件夹请勿删除，否则数据将丢失
echo.
echo 【浏览器插件】
echo 如需在Boss直聘页面使用自动筛选功能，请参考项目主页安装浏览器插件：
echo https://github.com/GXWane/ai-job-assistant
echo.
echo 【常见问题】
echo Q：双击启动.bat 后浏览器没有自动打开？
echo A：请手动打开浏览器，访问 http://127.0.0.1:8000
echo.
echo Q：提示端口被占用？
echo A：先运行"停止.bat"，再重新启动
echo.
) > "%DIST_DIR%\README.txt"

echo [OK] 启动文件生成完成

:: ─── 7. 打包为 zip ───────────────────────────────────────────────────────────
echo.
echo [完成] 正在打包为 ZIP 文件...
set "ZIP_OUT=%REPO_ROOT%\dist\AI求职助手_Win64.zip"
if exist "%ZIP_OUT%" del /f /q "%ZIP_OUT%"
powershell -NoProfile -Command ^
    "Compress-Archive -Path '%DIST_DIR%\*' -DestinationPath '%ZIP_OUT%' -CompressionLevel Optimal"

echo.
echo ============================================================
echo   构建完成！
echo.
echo   便携文件夹: dist\AI求职助手_Win64\
echo   压缩包:     dist\AI求职助手_Win64.zip
echo.
echo   分发给用户时，提供 .zip 文件即可。
echo   用户解压后双击"启动.bat"即可使用，无需安装任何软件。
echo ============================================================
echo.
pause
