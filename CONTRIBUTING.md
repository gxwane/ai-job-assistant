# AI Job Assistant 贡献指南 (Contributing Guide)

感谢您关注 **AI Job Assistant（智能求职助手）**！我们非常欢迎社区开发者参与贡献，无论是修复缺陷、改进算法、优化交互还是完善文档，您的每一份贡献都将帮助更多的求职者提升面试与匹配效率。

---

## 目录
1. [行为准则](#1-行为准则)
2. [环境准备与依赖要求](#2-环境准备与依赖要求)
3. [本地开发环境搭建](#3-本地开发环境搭建)
4. [开发与调试工作流](#4-开发与调试工作流)
5. [质量门禁与本地验证 (Gauntlet)](#5-质量门禁与本地验证-gauntlet)
6. [提交规范 (Conventional Commits)](#6-提交规范-conventional-commits)
7. [提交 Pull Request](#7-提交-pull-request)

---

## 1. 行为准则

本项目遵循 [Contributor Covenant v2.1](CODE_OF_CONDUCT.md) 行为准则。参与本项目的所有交流与贡献者均须维护友好、包容与互相尊重的开源社区氛围。如有违规行为，可向维护团队举报（邮箱：`gxwane@outlook.com`）。

---

## 2. 环境准备与依赖要求

为了保证开发体验与构建一致性，请确认您的本地环境满足以下要求：
- **Python**：>= 3.11（强烈推荐安装 [Astral uv](https://github.com/astral-sh/uv)）
- **Node.js**：>= 18.0.0（推荐 Node 20 LTS，附带 npm）
- **Git**：最新版本
- **浏览器**：Google Chrome 或 Microsoft Edge（需开启“开发者模式”以加载 MV3 扩展）

---

## 3. 本地开发环境搭建

### 3.1 仓库 Fork 与克隆
```bash
git clone https://github.com/<your-username>/ai-job-assistant.git
cd ai-job-assistant
```

### 3.2 后端服务搭建 (FastAPI + uv)
推荐使用 Astral uv 极速管理虚拟环境与依赖：
```bash
cd backend

# 拷贝环境变量示例
cp .env.example .env

# 同步安装核心依赖与开发依赖 (自动排除 1.5GB 的 PyTorch/EasyOCR)
uv sync --extra dev

# 启动后端开发服务器 (热重载: 8000 端口)
uv run uvicorn app.main:app --reload --port 8000
```
> 后端 API 文档入口：访问 [http://localhost:8000/docs](http://localhost:8000/docs) 查看交互式 Swagger UI。

### 3.3 前端应用搭建 (Vue 3 + Vite)
```bash
cd ../frontend

# 安装依赖
npm install

# 启动前端开发服务器 (热重载: 5173 端口)
npm run dev
```
> 前端 Web 访问入口：[http://localhost:5173](http://localhost:5173)。

### 3.4 浏览器扩展开发与加载 (MV3)
项目采用分层模块化开发，源码位于 `extension/src/`，打包产物输出至 `extension/content.js`：
```bash
# 在 frontend 目录下编译插件
npm run build:extension
```
- 打开 Chrome/Edge 浏览器，进入扩展管理页面（`chrome://extensions/`）；
- 开启右上角 **“开发者模式” (Developer mode)**；
- 点击 **“加载已解压的扩展程序” (Load unpacked)**，选择项目根目录下的 `extension/` 文件夹。

---

## 4. 极速一键启动脚本

项目中内置了跨平台的快速启动批处理脚本：
- **Windows**：双击或终端运行 `scripts/start_dev.bat`
- **macOS / Linux**：终端运行 `bash scripts/start_dev.sh`

脚本将自动检查环境、初始化 `.env` 并并行启动前后端开发服务。

---

## 5. 质量门禁与本地验证 (Gauntlet)

在提交任何代码或发起 Pull Request 之前，**必须** 在本地通过全栈质量门禁套件。该套件与 GitHub Actions CI 100% 严格对齐：

- **Windows (PowerShell)**:
  ```powershell
  powershell -ExecutionPolicy Bypass -File scripts/verify_gauntlet.ps1
  ```
- **macOS / Linux (Bash)**:
  ```bash
  bash scripts/verify_gauntlet.sh
  ```

### 门禁核验项目：
1. **Ruff 静态检查**：`uv run ruff check`（无语法告警与无用导入）；
2. **后端单元测试**：`uv run pytest tests`（94 个单元测试全绿通过）；
3. **前端单元测试**：`npm test`（39 个 Vitest 测试通过）；
4. **前端生产打包**：`npm run build`（Vite 生产包正常产出）；
5. **插件模块打包**：`npm run build:extension`（编译产出 `extension/content.js`）。

---

## 6. 提交规范 (Conventional Commits)

本项目强制遵循 [Conventional Commits 1.0.0](https://www.conventionalcommits.org/) 规范，提交信息格式如下：
```
<type>(<scope>): <subject>
```

### 常用类型 (`type`):
- `feat`: 新增特性（例如：`feat(backend): add async analysis task queue`）
- `fix`: 修复缺陷（例如：`fix(extension): resolve boss slider risk detection`）
- `docs`: 文档变更（例如：`docs: update quick start instructions`）
- `style`: 代码格式微调（不影响逻辑的空格、分号等）
- `refactor`: 代码重构（非 bug 修复也非功能新增的代码变动）
- `perf`: 性能优化（例如：`perf(frontend): debounce echarts resize event`）
- `test`: 测试用例补充或重构（例如：`test(backend): add pytest for schema migration`）
- `ci`: CI 流水线或构建脚本变更（例如：`ci: optimize uv cache in github actions`）
- `chore`: 日常维护、辅助工具变动

> **注意**：每个 Commit 应当保持原子性（Atomic Commit），严禁将多个无关改动合并为一个巨大的提交。

---

## 7. 提交 Pull Request

1. 基于 `main` 分支创建您自己的特性/修复分支：
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. 保持代码整洁，确保本地质量门禁通过：
   ```bash
   scripts/verify_gauntlet.ps1
   ```
3. 推送分支至您的 GitHub 仓库并创建 Pull Request；
4. PR 标题使用 Conventional Commits 格式，并在描述中详尽填写 PR 模板中的各项检查单；
5. CI 流水线将自动触发运行，全部通过后维护者将进行 Code Review 并合并代码。
