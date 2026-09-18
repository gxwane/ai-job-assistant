## 变更说明 (Description)
<!-- 请简要描述本次 PR 的主要变更内容、解决的问题或引入的新特性 -->

## 关联 Issue (Related Issues)
<!-- 例如: Fixes #123, Closes #456 -->
- Closes #

## 变更类型 (Type of Change)
- [ ] 🐛 Bug 修复 (Bug fix: non-breaking change which fixes an issue)
- [ ] ✨ 新功能 (New feature: non-breaking change which adds functionality)
- [ ] ♻️ 代码重构 (Refactoring: no functional changes, code structure improvement)
- [ ] 📝 文档更新 (Documentation update)
- [ ] 🧪 测试用例 (Test addition or test improvement)
- [ ] 🚀 性能优化 (Performance improvement)
- [ ] 👷 CI/CD 或工程配置 (Build/CI tooling change)

## 涉及模块 (Affected Components)
- [ ] 后端服务 (`backend/`)
- [ ] 前端应用 (`frontend/`)
- [ ] 浏览器插件 (`extension/`)
- [ ] 构建与部署脚本 (`scripts/`, `Dockerfile`, `docker-compose.yml`)
- [ ] 文档与社区规范 (`docs/`, `.github/`, `README.md`)

## 验证与自检清单 (Verification Checklist)
- [ ] 本地已通过门禁验证脚本 (`powershell scripts/verify_gauntlet.ps1` 或 `bash scripts/verify_gauntlet.sh`)
- [ ] 后端静态检查已通过 (`uv run ruff check`)
- [ ] 后端单元测试全部通过 (`uv run pytest tests`)
- [ ] 前端单元测试全部通过 (`npm test` in `frontend/`)
- [ ] 前端及插件生产打包正常通过 (`npm run build` & `npm run build:extension`)
- [ ] 代码中未引入硬编码的 API Key、私密凭据或个人敏感信息
- [ ] Commit 信息符合 [Conventional Commits](https://www.conventionalcommits.org/) 规范
