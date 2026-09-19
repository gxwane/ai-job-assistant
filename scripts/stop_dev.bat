@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

set "REPO_ROOT=%~dp0.."

echo ========================================================
echo  [AI求职助手] 停止所有服务
echo ========================================================
echo.

:: 按端口查找并终止进程
echo [停止] 正在停止后端服务（端口 8000）...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R /C:":8000 " 2^>nul') do (
    if not "%%a"=="0" (
        taskkill /PID %%a /F >nul 2>&1
        echo [OK] 已终止 PID %%a
    )
)

echo [停止] 正在停止前端服务（端口 5173）...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R /C:":5173 " 2^>nul') do (
    if not "%%a"=="0" (
        taskkill /PID %%a /F >nul 2>&1
        echo [OK] 已终止 PID %%a
    )
)

:: 同时关闭由 start_dev.bat 打开的命名窗口
taskkill /FI "WINDOWTITLE eq AI求职助手 - 后端服务" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq AI求职助手 - 前端服务" /F >nul 2>&1

echo.
echo [完成] 所有服务已停止，端口 8000 和 5173 已释放。
echo        现在可以重新运行 start_dev.bat 启动服务。
echo.
pause
