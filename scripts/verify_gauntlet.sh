#!/usr/bin/env bash
# ========================================================
# 全栈质量门禁自动化验证套件 (Linux / macOS / CI)
# ========================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

echo -e "\033[1;36m========================================================\033[0m"
echo -e "\033[1;36m [AI-Job-Assistant] 全栈自动化质量门禁验证 (Gauntlet) \033[0m"
echo -e "\033[1;36m========================================================\033[0m\n"

run_step() {
    local title="$1"
    shift
    echo -e "\033[1;33m>>> [步骤] ${title} ...\033[0m"
    if "$@"; then
        echo -e "\033[1;32m[PASS] ${title} 顺利通过。\033[0m\n"
    else
        local code=$?
        echo -e "\n\033[1;31m[FAIL] ${title} 失败，退出码: ${code}\033[0m"
        echo -e "\033[1;31m门禁拦截：请修复上述错误后重新提交！\033[0m\n"
        exit $code
    fi
}

# 1. 环境前置自检
command -v uv >/dev/null 2>&1 || { echo -e "\033[1;31m[ERROR] 未检测到 uv，请先安装 Astral uv。\033[0m"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo -e "\033[1;31m[ERROR] 未检测到 npm，请先安装 Node.js 18+。\033[0m"; exit 1; }

# 2. 后端测试门禁 (77 项用例)
run_step "后端自动化测试 (pytest 77 项用例)" bash -c "cd '$REPO_ROOT/backend' && uv run pytest tests"

# 3. 前端依赖前置检查
if [ ! -d "$REPO_ROOT/frontend/node_modules" ]; then
    run_step "前端依赖安装 (npm install)" bash -c "cd '$REPO_ROOT/frontend' && npm install"
fi

# 4. 前端单测门禁 (39 项用例)
run_step "前端单元测试 (vitest 39 项用例)" bash -c "cd '$REPO_ROOT/frontend' && npm test"

# 5. 前端生产构建门禁 (Vite Build)
run_step "前端生产打包构建 (Vite build)" bash -c "cd '$REPO_ROOT/frontend' && npm run build"

# 6. 浏览器扩展模块化构建门禁 (Vite Extension Build)
run_step "浏览器扩展模块化构建 (Vite extension build)" bash -c "cd '$REPO_ROOT/frontend' && npm run build:extension"

echo -e "\033[1;32m========================================================\033[0m"
echo -e "\033[1;32m [SUCCESS] 全栈门禁全部通过！项目达到最高开源交付标准！\033[0m"
echo -e "\033[1;32m========================================================\033[0m"
exit 0
