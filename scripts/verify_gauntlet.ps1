<#
.SYNOPSIS
  全栈质量门禁自动化验证套件 (Windows PowerShell)
  包含：后端 77 个单元测试、前端依赖检查、前端 39 个单元测试、前端生产构建打包
#>

$ErrorActionPreference = "Continue" # 确保能显式捕获外部命令 $LASTEXITCODE

$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " [AI-Job-Assistant] 全栈自动化质量门禁验证 (Gauntlet) " -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

function Run-Step {
    param(
        [string]$Title,
        [scriptblock]$Script
    )
    Write-Host ">>> [步骤] $Title ..." -ForegroundColor Yellow
    & $Script
    $code = $LASTEXITCODE
    if ($code -ne 0) {
        Write-Host "`n[FAIL] $Title 失败，退出码: $code" -ForegroundColor Red
        Write-Host "门禁拦截：请修复上述错误后重新提交！`n" -ForegroundColor Red
        Set-Location $RepoRoot
        exit $code
    }
    Write-Host "[PASS] $Title 顺利通过。`n" -ForegroundColor Green
}

# 1. 环境与依赖工具自检
if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] 未检测到 uv 命令，请先安装 Astral uv: https://docs.astral.sh/uv/" -ForegroundColor Red
    exit 1
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] 未检测到 npm 命令，请安装 Node.js 18+。" -ForegroundColor Red
    exit 1
}

# 2. 后端质量门禁 (77 项单元测试)
Run-Step "后端自动化测试 (pytest 77 项用例)" {
    Set-Location "$RepoRoot\backend"
    uv run pytest tests
}

# 3. 前端依赖前置检查
if (-not (Test-Path "$RepoRoot\frontend\node_modules")) {
    Run-Step "前端依赖安装 (npm install)" {
        Set-Location "$RepoRoot\frontend"
        cmd /c "npm install"
    }
}

# 4. 前端单元测试门禁 (39 项用例)
Run-Step "前端单元测试 (vitest 39 项用例)" {
    Set-Location "$RepoRoot\frontend"
    cmd /c "npm test"
}

# 5. 前端生产打包构建门禁 (Vite Build)
Run-Step "前端生产打包构建 (Vite build)" {
    Set-Location "$RepoRoot\frontend"
    cmd /c "npm run build"
}

Set-Location $RepoRoot
Write-Host "========================================================" -ForegroundColor Green
Write-Host " [SUCCESS] 全栈门禁全部通过！项目达到最高开源交付标准！" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
exit 0
