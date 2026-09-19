@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: ============================================================================
::  AI求职助手 · Windows 一体化便携包构建脚本
::  运行环境：开发者机器 / GitHub Actions Windows Runner
::  参数支持：%1 = 版本号 (例如 v1.0.0，默认 v1.0.0)
::  产出物  ：dist\AI求职助手_Win64\ + dist\AI求职助手_Win64_<版本号>.zip
:: ============================================================================

set "APP_VERSION=%~1"
if "%APP_VERSION%"=="" set "APP_VERSION=v1.0.0"

set "REPO_ROOT=%~dp0.."
set "DIST_DIR=%REPO_ROOT%\dist\AI求职助手_Win64"
set "ZIP_OUT=%REPO_ROOT%\dist\AI求职助手_Win64_%APP_VERSION%.zip"
set "PY_VERSION=3.11.9"
set "PY_EMBED_URL=https://www.python.org/ftp/python/%PY_VERSION%/python-%PY_VERSION%-embed-amd64.zip"
set "PY_EMBED_ZIP=%REPO_ROOT%\dist\_python_embed.zip"

:: CI 非交互环境防挂起
if defined CI (set "PAUSE_CMD=rem") else (set "PAUSE_CMD=pause")

echo.
echo ============================================================
echo   AI求职助手 · 一体化便携包构建工具 [%APP_VERSION%]
echo   构建目录: dist\AI求职助手_Win64\
echo   目标压缩包: dist\AI求职助手_Win64_%APP_VERSION%.zip
echo ============================================================
echo.

:: ─── 0. 前置环境检查 ────────────────────────────────────────────────────────
echo [1/8] 检查前置环境...

python --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 Python，请先安装 Python 3.11+
    %PAUSE_CMD% & exit /b 1
)
for /f "tokens=2" %%v in ('python --version 2^>^&1') do set "SYS_PY_VER=%%v"
echo        系统 Python: %SYS_PY_VER%

node --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 Node.js，请先安装 Node.js 18+
    %PAUSE_CMD% & exit /b 1
)
echo        Node.js: 已就绪
echo [OK] 前置环境检查通过

:: ─── 1. 构建前端生产资源 ─────────────────────────────────────────────────────
echo.
echo [2/8] 构建前端页面 (npm run build)...
cd /d "%REPO_ROOT%\frontend"
if not exist "node_modules" (
    echo        正在安装前端依赖（首次较慢）...
    call npm install --silent
)
call npm run build
if errorlevel 1 (
    echo [错误] 前端构建失败，请检查 frontend/ 代码
    %PAUSE_CMD% & exit /b 1
)
echo [OK] 前端构建完成 → frontend\dist\

:: ─── 2. 编译浏览器扩展 ───────────────────────────────────────────────────────
echo.
echo [3/8] 编译浏览器扩展 (npm run build:extension)...
call npm run build:extension
if errorlevel 1 (
    echo [错误] 浏览器插件构建失败，请检查 extension/ 代码
    %PAUSE_CMD% & exit /b 1
)
echo [OK] 浏览器扩展编译完成 → extension\content.js

:: ─── 3. 清理并创建输出目录 ───────────────────────────────────────────────────
echo.
echo [4/8] 准备输出目录...
cd /d "%REPO_ROOT%"
if not exist "%REPO_ROOT%\dist" mkdir "%REPO_ROOT%\dist"
if exist "%DIST_DIR%" (
    echo        清理旧版本临时目录...
    rmdir /s /q "%DIST_DIR%"
)
mkdir "%DIST_DIR%\backend\app"
mkdir "%DIST_DIR%\frontend\dist"
mkdir "%DIST_DIR%\浏览器插件"
mkdir "%DIST_DIR%\uploads"
mkdir "%DIST_DIR%\data"
echo [OK] 目录结构已创建

:: ─── 4. 组装程序文件与纯净插件 ───────────────────────────────────────────────
echo.
echo [5/8] 复制程序文件与内置插件...
xcopy /e /q /y "%REPO_ROOT%\backend\app\*" "%DIST_DIR%\backend\app\" >nul
xcopy /e /q /y "%REPO_ROOT%\frontend\dist\*" "%DIST_DIR%\frontend\dist\" >nul
copy /y "%REPO_ROOT%\backend\.env.example" "%DIST_DIR%\backend\.env" >nul
copy /y "%REPO_ROOT%\backend\requirements-portable.txt" "%DIST_DIR%\backend\requirements-portable.txt" >nul

:: 纯净插件运行时复制 (排除 src/ 源码与开发文档)
copy /y "%REPO_ROOT%\extension\manifest.json" "%DIST_DIR%\浏览器插件\" >nul
copy /y "%REPO_ROOT%\extension\content.js" "%DIST_DIR%\浏览器插件\" >nul
copy /y "%REPO_ROOT%\extension\background.js" "%DIST_DIR%\浏览器插件\" >nul
copy /y "%REPO_ROOT%\extension\popup.html" "%DIST_DIR%\浏览器插件\" >nul
copy /y "%REPO_ROOT%\extension\popup.js" "%DIST_DIR%\浏览器插件\" >nul

:: 生成插件安装指引
(
echo AI求职助手 - 浏览器插件安装指南
echo ===============================
echo.
echo 1. 打开 Chrome 或 Edge 浏览器，访问扩展管理页面：
echo    - Chrome 浏览器：在地址栏输入 chrome://extensions 并回车
echo    - Edge 浏览器  ：在地址栏输入 edge://extensions 并回车
echo.
echo 2. 开启页面右上角的「开发者模式」开关
echo.
echo 3. 点击左上角的「加载已解压的扩展程序」按钮
echo.
echo 4. 在弹出的文件夹选择框中，直接选中当前这个「浏览器插件」文件夹即可完成安装！
echo.
echo 提示：安装后打开 Boss 直聘页面，即可自动唤起智能匹配悬浮面板。
) > "%DIST_DIR%\浏览器插件\插件安装说明.txt"
echo [OK] 程序文件与插件组装完成

:: ─── 5. 准备 Python Embedded ─────────────────────────────────────────────────
echo.
echo [6/8] 准备 Python 运行时 (Python %PY_VERSION% Embedded)...
mkdir "%DIST_DIR%\python" >nul 2>&1

if not exist "%PY_EMBED_ZIP%" (
    echo        正在下载 Python Embedded (~25 MB)...
    echo        下载地址: %PY_EMBED_URL%
    where curl.exe >nul 2>&1
    if not errorlevel 1 (
        curl.exe -fSL --retry 3 --retry-delay 3 -o "%PY_EMBED_ZIP%" "%PY_EMBED_URL%"
    ) else (
        powershell -NoProfile -Command ^
            "$ProgressPreference='SilentlyContinue'; try { Invoke-WebRequest -Uri '%PY_EMBED_URL%' -OutFile '%PY_EMBED_ZIP%' -UseBasicParsing } catch { Write-Error $_.Exception.Message; exit 1 }"
    )
    if errorlevel 1 (
        echo [错误] Python Embedded 下载失败，请检查网络连接。
        %PAUSE_CMD% & exit /b 1
    )
    echo [OK] 下载完成
) else (
    echo [跳过] 已存在缓存 %PY_EMBED_ZIP%，跳过下载
)

echo        正在解压 Python Embedded...
powershell -NoProfile -Command ^
    "$ProgressPreference='SilentlyContinue'; Expand-Archive -Path '%PY_EMBED_ZIP%' -DestinationPath '%DIST_DIR%\python' -Force"
echo [OK] Python Embedded 解压完成

:: ─── 6. 引导 pip 并安装受控依赖 ──────────────────────────────────────────────
echo.
echo [7/8] 安装后端依赖（首次约需 2-3 分钟）...

:: 激活 site-packages 支持
set "PTH_FILE=%DIST_DIR%\python\python311._pth"
if not exist "%PTH_FILE%" (
    for %%f in ("%DIST_DIR%\python\python3*._pth") do set "PTH_FILE=%%f"
)
powershell -NoProfile -Command ^
    "$content = Get-Content '%PTH_FILE%'; $content = $content -replace '#import site','import site'; Set-Content '%PTH_FILE%' $content"

:: 引导安装 pip
echo        正在引导 pip...
"%DIST_DIR%\python\python.exe" -m ensurepip --upgrade >nul 2>&1
if errorlevel 1 (
    echo        使用 get-pip.py 引导安装 pip...
    where curl.exe >nul 2>&1
    if not errorlevel 1 (
        curl.exe -fSL --retry 3 --retry-delay 3 -o "%DIST_DIR%\python\get-pip.py" "https://bootstrap.pypa.io/get-pip.py"
    ) else (
        powershell -NoProfile -Command ^
            "$ProgressPreference='SilentlyContinue'; Invoke-WebRequest -Uri 'https://bootstrap.pypa.io/get-pip.py' -OutFile '%DIST_DIR%\python\get-pip.py' -UseBasicParsing"
    )
    "%DIST_DIR%\python\python.exe" "%DIST_DIR%\python\get-pip.py" --quiet
)

:: 安装受控依赖
echo        安装核心依赖 (受控版本范围，排除 EasyOCR/PyTorch)...
"%DIST_DIR%\python\python.exe" -m pip install ^
    --target="%DIST_DIR%\python\Lib\site-packages" ^
    --no-cache-dir ^
    --quiet ^
    -r "%DIST_DIR%\backend\requirements-portable.txt"
if errorlevel 1 (
    echo [错误] 依赖安装失败，请检查网络连接
    %PAUSE_CMD% & exit /b 1
)
echo [OK] 依赖安装完成

:: ─── 7. 生成用户启动器与说明文档 ─────────────────────────────────────────────
(
echo @echo off
echo chcp 65001 ^>nul
echo setlocal
echo.
echo set "APP_ROOT=%%~dp0"
echo cd /d "%%APP_ROOT%%backend"
echo.
echo ============================================================
echo   AI求职助手 - 正在启动，请稍等...
echo   启动完成后浏览器将自动打开
echo   关闭此窗口即可停止程序
echo ============================================================
echo echo.
echo.
echo start "" /B "%%APP_ROOT%%python\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000
echo ping -n 4 127.0.0.1 ^>nul
echo start "" "http://127.0.0.1:8000"
echo.
echo echo 服务已启动！浏览器将自动打开 http://127.0.0.1:8000
echo echo.
echo echo 请保持此窗口开启（关闭窗口 = 停止程序）
echo echo 如需手动停止，请运行"停止.bat"
echo echo.
echo pause
) > "%DIST_DIR%\启动.bat"

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

(
echo AI求职助手 %APP_VERSION% Windows 便携版
echo =====================================
echo.
echo 【使用方法】
echo 1. 双击"启动.bat"，等待浏览器自动弹出界面（http://127.0.0.1:8000）
echo 2. 首次使用无需配置 API Key，可直接体验所有功能（Mock 演示模式）
echo 3. 需要接入真实 AI 时，在网页右上角点击「模型设置」填写 API Key
echo.
echo 【浏览器插件安装】
echo 本压缩包已直接内置「浏览器插件」文件夹！
echo 1. 打开 Chrome 或 Edge 浏览器，访问 chrome://extensions 或 edge://extensions
echo 2. 开启页面右上角的「开发者模式」
echo 3. 点击「加载已解压的扩展程序」，选择当前文件夹内的「浏览器插件」目录即可！
echo.
echo 【停止程序】
echo 直接关闭启动时弹出的黑色窗口，或双击"停止.bat"
echo.
echo 【数据说明】
echo - 您上传的简历保存在 uploads\ 文件夹
echo - 程序数据保存在 data\ 文件夹
echo - 这两个文件夹请勿删除，否则数据将丢失
echo.
echo 【常见问题】
echo Q：双击启动.bat 后浏览器没有自动打开？
echo A：请手动打开浏览器，访问 http://127.0.0.1:8000
echo.
echo Q：提示端口被占用？
echo A：先运行"停止.bat"，再重新启动
echo.
) > "%DIST_DIR%\README.txt"

:: ─── 8. 高性能打包为 ZIP ─────────────────────────────────────────────────────
echo.
echo [8/8] 正在打包便携包 (%ZIP_OUT%)...
if exist "%ZIP_OUT%" del /f /q "%ZIP_OUT%"

where 7z >nul 2>&1
if not errorlevel 1 (
    echo        检测到 7-Zip，正在使用多线程极速压缩...
    7z a -tzip "%ZIP_OUT%" "%DIST_DIR%\*" -mx=7 >nul
) else (
    echo        使用 PowerShell 进行标准压缩（文件较多，请耐心等待）...
    powershell -NoProfile -Command ^
        "$ProgressPreference='SilentlyContinue'; Compress-Archive -Path '%DIST_DIR%\*' -DestinationPath '%ZIP_OUT%' -CompressionLevel Optimal -Force"
)

echo.
echo ============================================================
echo   构建完成！
echo.
echo   便携文件夹: dist\AI求职助手_Win64\
echo   压缩包文件: %ZIP_OUT%
echo.
echo   已内置纯净「浏览器插件」文件夹与《插件安装说明.txt》
echo   分发给用户时，提供该 .zip 文件即可。解压即用，零环境依赖！
echo ============================================================
echo.
%PAUSE_CMD%
