<#
.SYNOPSIS
  全栈质量门禁自动化验证套件 (Windows PowerShell)
  包含：后端单元测试、前端依赖检查、前端单元测试、前端生产构建打包、浏览器扩展模块化打包
#>

$ErrorActionPreference = "Continue"

$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " [AI-Job-Assistant] Full Stack Gauntlet Verification   " -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

function Run-Step {
    param(
        [string]$Title,
        [scriptblock]$Script
    )
    Write-Host ">>> [STEP] $Title ..." -ForegroundColor Yellow
    & $Script
    $code = $LASTEXITCODE
    if ($code -ne 0) {
        Write-Host "`n[FAIL] $Title failed with exit code: $code" -ForegroundColor Red
        Write-Host "Gate check blocked: Please fix errors before commit!`n" -ForegroundColor Red
        Set-Location $RepoRoot
        exit $code
    }
    Write-Host "[PASS] $Title passed.`n" -ForegroundColor Green
}

# 1. Tool availability
if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] uv command not found, please install Astral uv." -ForegroundColor Red
    exit 1
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] npm command not found, please install Node.js 18+." -ForegroundColor Red
    exit 1
}

# 2. Backend Ruff lint check (Fail-Fast)
Run-Step "Backend code linting (Ruff)" {
    Set-Location "$RepoRoot\backend"
    uv run ruff check
}

# 3. Backend tests
Run-Step "Backend pytest suite (94 tests)" {
    Set-Location "$RepoRoot\backend"
    uv run pytest tests
}

# 4. Frontend node_modules check
if (-not (Test-Path "$RepoRoot\frontend\node_modules")) {
    Run-Step "Frontend npm install" {
        Set-Location "$RepoRoot\frontend"
        cmd /c "npm install"
    }
}

# 5. Frontend tests
Run-Step "Frontend vitest suite" {
    Set-Location "$RepoRoot\frontend"
    cmd /c "npm test"
}

# 6. Frontend Vite production build
Run-Step "Frontend Vite production build" {
    Set-Location "$RepoRoot\frontend"
    cmd /c "npm run build"
}

# 7. Extension modular Vite build
Run-Step "Extension modular Vite build" {
    Set-Location "$RepoRoot\frontend"
    cmd /c "npm run build:extension"
}

# 8. Extension bundle verification
Run-Step "Extension bundle integrity check" {
    $bundle = "$RepoRoot\extension\content.js"
    if (-not (Test-Path $bundle) -or ((Get-Item $bundle).Length -le 0)) {
        Write-Host "[ERROR] extension/content.js is missing or empty!" -ForegroundColor Red
        exit 1
    }
}

Set-Location $RepoRoot
Write-Host "========================================================" -ForegroundColor Green
Write-Host " [SUCCESS] Full stack gauntlet passed completely!       " -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
exit 0
