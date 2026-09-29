<#
.SYNOPSIS
    AI求职助手 · 本地 UI 自动化无头测试与视觉快照评测脚本
.DESCRIPTION
    使用 Playwright 自动拉起前端、拦截 API 注入高保真 Mock 数据，
    生成 11 张全栈核心界面与扩展悬浮窗的高清快照至 docs/ui-snapshots/baseline/
#>

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$FrontendDir = Join-Path $ProjectRoot "frontend"
$SnapshotDir = Join-Path $ProjectRoot "docs\ui-snapshots\baseline"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  AI求职助手 · 本地 UI 视觉快照全自动评测流水线" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $SnapshotDir)) {
    New-Item -ItemType Directory -Path $SnapshotDir -Force | Out-Null
}

Push-Location $FrontendDir
try {
    Write-Host "[1/2] 正在运行 Playwright 无头评测套件..." -ForegroundColor Yellow
    npm run test:ui
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Playwright UI 评测运行失败，请检查报错日志。"
    }
    Write-Host "[OK] 无头评测完成！" -ForegroundColor Green
}
finally {
    Pop-Location
}

Write-Host ""
Write-Host "[2/2] 评测快照输出清单 (docs/ui-snapshots/baseline/):" -ForegroundColor Yellow
Get-ChildItem -Path $SnapshotDir -Filter "*.png" | ForEach-Object {
    $sizeKb = [math]::Round($_.Length / 1024, 1)
    Write-Host "  -> $($_.Name) ($sizeKb KB)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  评测完成！AI Agent 可通过 view_file 检查上述快照图片。" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
