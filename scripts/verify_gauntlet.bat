@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0verify_gauntlet.ps1" %*
exit /b %ERRORLEVEL%
