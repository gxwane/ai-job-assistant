# AI 求职助手

上传简历，AI 自动分析岗位匹配度，辅助判断是否值得投递。支持 **Web 端手动分析** + **浏览器插件自动筛选** + **数据统计中心** + **PDF 求职报告导出**。

---

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vue 3 + Vite + Element Plus + Pinia + ECharts + Axios + Vue Router |
| 后端 | FastAPI + Python 3.10+ + SQLAlchemy + SQLite |
| 简历解析 | pypdf (PDF) + python-docx (Word) + TXT |
| AI | DeepSeek API（也支持兼容 OpenAI 格式的其他大模型） |
| OCR | EasyOCR（插件截图识别公司名/薪资） |
| PDF 报告 | ReportLab + matplotlib（专业图表 + 中文字体） |
| 插件 | Chrome/Edge Extension Manifest V3 |

---

## 快速开始

### 环境要求

- Python 3.10+
- Node.js 18+
- Edge 或 Chrome 浏览器

### 1. 克隆项目

```bash
git clone <repo-url>
cd ai-job-assistant
```

### 2. 后端

```bash
cd backend

# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 配置 API Key
copy .env.example .env
```

> #### 更换大模型 API 和密钥
>
> 编辑 `backend/.env` 文件，替换以下配置：
>
> ```env
> # DeepSeek API（默认）
> DEEPSEEK_API_KEY=sk-your-api-key-here
> DEEPSEEK_BASE_URL=https://api.deepseek.com
> ```
>
> **切换到其他大模型？** 修改 `DEEPSEEK_BASE_URL` 为对应的 OpenAI 兼容 endpoint：
>
> | 模型提供商 | BASE_URL 示例 |
> |-----------|-------------|
> | DeepSeek（默认） | `https://api.deepseek.com` |
> | OpenAI | `https://api.openai.com/v1` |
> | 硅基流动 | `https://api.siliconflow.cn/v1` |
> | 阿里百炼 | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
> | 其他兼容接口 | 填入对应地址即可 |
>
> **没有 API Key？** 留空则自动使用 Mock 模式（返回模拟数据，可用于演示）。
>
> 注意：切换模型后，`backend/app/services/llm_client.py:46` 中的 `"model": "deepseek-chat"` 也需改为对应模型名。

```bash
# 启动后端
uvicorn app.main:app --reload --port 8000
```

启动成功标志：
```
✅ 已配置 DeepSeek API，将使用真实 AI 分析
INFO:  Application startup complete.
```

验证：浏览器打开 `http://127.0.0.1:8000/docs` 可看到 Swagger API 文档。

### 3. 前端

```bash
cd frontend

npm install
npm run dev
```

浏览器打开 `http://localhost:5173`

---

## 项目结构

```
ai-job-assistant/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI 入口，注册路由
│   │   ├── config.py                # 配置管理（读取 .env）
│   │   ├── database.py              # 数据库连接 + Schema 自动迁移
│   │   ├── models.py                # 数据模型（Resume / AnalysisRecord / JobRecord）
│   │   ├── schemas.py               # Pydantic 请求/响应模型
│   │   ├── routers/                 # API 路由
│   │   │   ├── resume.py            # 简历上传/列表/预览/删除/下载
│   │   │   ├── analysis.py          # 手动 JD 分析
│   │   │   ├── history.py           # 历史分析记录
│   │   │   ├── plugin.py            # 浏览器插件接口（岗位捕获/状态更新）
│   │   │   ├── job_records.py       # 岗位记录管理（含面试题生成）
│   │   │   ├── ocr.py               # OCR 截图识别
│   │   │   └── statistics.py        # 数据统计 + PDF 求职报告导出
│   │   ├── services/                # 业务服务
│   │   │   ├── analysis_service.py  # 匹配分析 + 评分引擎
│   │   │   ├── plugin_service.py    # 插件岗位捕获 + 自动匹配
│   │   │   ├── llm_client.py        # 大模型客户端（支持流式）
│   │   │   ├── resume_parser.py     # 简历解析（PDF / Word / TXT）
│   │   │   ├── ocr_service.py       # OCR 识别服务（EasyOCR + PaddleOCR）
│   │   │   └── job_parser.py        # 岗位文本结构化解析（Boss直聘） ★
│   │   └── prompts/                 # LLM Prompt 模板
│   │       └── job_match_prompt.py  # 岗位匹配 + 面试题生成 prompt
│   ├── uploads/                     # 简历文件存储
│   ├── .env                         # 环境配置（API Key 等）
│   ├── .env.example                 # 配置文件模板
│   └── requirements.txt             # Python 依赖
├── frontend/
│   ├── src/
│   │   ├── App.vue                  # 根组件 + 导航栏
│   │   ├── main.js                  # Vue 应用入口
│   │   ├── views/                   # 页面组件
│   │   │   ├── Home.vue            # 首页
│   │   │   ├── ResumeUpload.vue    # 简历上传
│   │   │   ├── ResumeManager.vue   # 简历管理（列表/预览/下载/删除）
│   │   │   ├── JobAnalyze.vue      # 手动 JD 分析
│   │   │   ├── Result.vue          # 分析结果详情
│   │   │   ├── History.vue         # 历史分析记录（分页）
│   │   │   ├── PluginJobs.vue      # 插件岗位记录（分页/状态管理）
│   │   │   ├── Dashboard.vue       # 数据统计中心（图表仪表板） ★
│   │   │   ├── JobDetail.vue       # 岗位分析详情页 ★
│   │   │   └── InterviewQuestions.vue # 面试高频问答题
│   │   ├── router/index.js         # 路由配置
│   │   ├── stores/analysis.js      # Pinia 状态管理
│   │   └── api/request.js          # API 请求封装（25+ 接口）
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── extension/                       # 浏览器插件
│   ├── manifest.json                # 插件清单（Manifest V3）
│   ├── content.js                   # 内容脚本（面板 / 自动筛选 / 岗位提取 / 沟通）
│   ├── background.js                # Service Worker（API 调用 / 截图 / OCR）
│   └── README.md                    # 插件使用文档
└── README.md                        # 本文件
```

---

## Web 端功能

### 页面导航

| 页面 | 路由 | 功能 |
|------|------|------|
| 首页 | `/` | 项目入口，链接到各功能 |
| 上传简历 | `/upload` | 上传 PDF/Word/TXT 简历 |
| 简历管理 | `/resumes` | 列表 / 预览 / 下载 / 删除 / 批量删除 |
| JD 分析 | `/analyze` | 选择简历 → 粘贴 JD → AI 评分 |
| 分析结果 | `/result/:id` | 详细分析结果（技能对比 / 优劣势 / 面试题） |
| 历史记录 | `/history` | 所有分析记录（分页 / 详情 / 删除） |
| 插件岗位 | `/plugin-jobs` | 插件捕获的岗位记录（分页 / 筛选 / 状态流转 / 面试题） |
| 面试题 | `/interview-questions/:id` | AI 生成的 30 道定制面试题 |
| 数据统计 | `/dashboard` | 数据统计中心（图表仪表板 / PDF 导出） ★ |
| 岗位详情 | `/job-detail/:id` | 单条岗位的 JD + AI 分析完整展示 ★ |

### 使用流程

1. **上传简历**：Web 端 `/upload` 上传 PDF/Word/TXT → 自动解析文本 → 保存到数据库（支持 MD5 去重）
2. **手动分析**：`/analyze` 选择简历 + 粘贴岗位 JD → 点击分析 → AI 评分 + 建议
3. **查看结果**：`/result/:id` 查看详细分析结果（分项评分 / 技能匹配 / 优劣势 / 风险提示 / 面试题）
4. **历史管理**：`/history` 查看/删除历史分析记录
5. **数据统计**：`/dashboard` 查看统计仪表板，支持导出 PDF 求职报告

---

## 浏览器插件

### 功能

| 功能 | 说明 |
|------|------|
| 单岗位分析 | 手动点击"发送到AI求职助手"分析当前岗位 |
| 一键沟通 | 点击 Boss 页面"立即沟通"按钮 |
| 岗位加载 | 模拟下滑加载更多岗位卡片 |
| 本页自动筛选 | 逐个自动分析当前搜索结果页岗位 |
| 推荐列表 | 高分岗位列表，支持"定位岗位"和自动沟通 |
| 紧凑/展开模式 | 面板可缩小 / 拖拽移动 |
| 扫描进度保存 | 暂停/停止后从上次位置继续 |
| 面试题生成 | 收到面试后 AI 生成 30 道高频题 |
| HR 活跃检测 | 自动识别 HR 活跃状态（在线 / 今日活跃等） |
| 综合评分 | 匹配度 × 0.8 + HR活跃度 × 0.2 = 综合推荐指数 |

### 安装

1. 打开浏览器扩展管理页面：
   - Edge: `edge://extensions/`
   - Chrome: `chrome://extensions/`
2. 开启 **"开发人员模式"**
3. 点击 **"加载解压缩的扩展"**
4. 选择 `extension/` 文件夹

### 使用

1. 确保后端已启动（`http://127.0.0.1:8000`）
2. 打开 Boss 直聘搜索结果页或岗位详情页
3. 页面右下角出现 **AI求职助手** 面板
4. 上传简历 → 自动同步到插件（也可在 Web 端上传）
5. 单岗位：点击"发送到AI求职助手"
6. 批量：设置参数 → 点击"开始自动筛选"
7. 面板可拖拽标题栏移动，点击 `-` 缩小

详见 `extension/README.md`。

---

## PDF 求职分析报告

访问 `/dashboard` 页面，点击"导出求职报告"按钮，生成一份专业的求职分析报告 PDF。

### 报告内容（6 页）

| 页码 | 内容 | 说明 |
|------|------|------|
| 封面 | AI求职助手 · 智能求职分析报告 | 生成时间、简历名称、扫描岗位数 |
| 求职总览 | 6 张卡片 | 扫描岗位 / 推荐 / 已沟通 / 平均匹配度 / 最高匹配度 / 简历数量 |
| 图表页 | 匹配度分布 + 求职漏斗 | matplotlib 生成的柱状图 + 横向漏斗图 |
| Top 10 | 高匹配且HR活跃岗位 | 按综合推荐指数排序，含 HR 活跃状态 |
| 分析页 | 推荐方向 TOP5 + 技能缺口 TOP10 + HR分布 | AI 自动统计和可视化 |
| AI 总结 | 总体评价 + 优劣势 + 建议 | 根据统计自动生成求职建议 |

### 技术特性

- **中文字体**：自动检测系统字体（SimHei / Microsoft YaHei / PingFang 等），保证中文正常显示
- **图表**：matplotlib 生成柱状图、漏斗图，嵌入 PDF
- **文件命名**：`AI求职报告_YYYYMMDD_HHMMSS.pdf`
- **页眉页脚**：统一页眉（AI求职助手）+ 页脚（生成时间 + 页码）
- **空数据兼容**：数据不足时显示"暂无足够数据"，不报错

---

## 评分机制

### 评分流程

```
用户提交 → LLM 结构化分析（输出分项评分）
         → 后端 calculate_final_score() 硬规则计算
         → 返回最终评分 + 等级 + 建议
```

### 分项评分（LLM 输出）

| 评分项 | 分值范围 | 说明 |
|--------|----------|------|
| 技能评分 | 0-40 | 技术栈匹配程度 |
| 项目经验 | 0-30 | 项目经验与岗位需求相关性 |
| 学历背景 | 0-15 | 学历 / 专业 / 工作经历匹配度 |
| 发展潜力 | 0-15 | 成长空间与岗位发展前景 |

### 硬性封顶规则

| 规则 | 触发条件 | 分数上限 |
|------|----------|----------|
| 方向不匹配 | `category_match = false` | 35 |
| 命中率极低 | `core_skill_hit_rate < 0.15` | 35 |
| 命中率偏低 | `core_skill_hit_rate < 0.30` | 50 |
| 无核心匹配 | `matched_core_skills` 为空 | 40 |
| JD 过短 | 岗位描述不足 80 字 | 45 |

### 评分等级

| 分数区间 | 等级 | 建议 |
|----------|------|------|
| 85-100 | 高度匹配 | 强烈推荐投递 |
| 70-84 | 良好匹配 | 建议投递 |
| 50-69 | 部分匹配 | 可尝试投递 |
| 30-49 | 勉强匹配 | 谨慎投递 |
| 0-29 | 不推荐 | 不建议投递 |

---

## 综合推荐指数

浏览器插件捕获的岗位会计算综合推荐指数：

```
composite_score = match_score × 0.8 + hr_active_score × 0.2
```

其中 `hr_active_score` 根据 HR 活跃状态映射为数值：

| HR 状态 | 活跃分 |
|---------|--------|
| 在线 | 100 |
| 刚刚活跃 / 今日活跃 | 90 |
| 3日内活跃 / 本周活跃 | 70 |
| 两周内活跃 / 本月活跃 | 50 |
| 3月内活跃 | 30 |
| 半年前活跃 | 10 |
| 未知 | 0 |

---

## Mock 模式

未配置 API Key 时，系统自动使用 Mock 模式返回模拟数据，方便演示。

启用真实 AI：编辑 `backend/.env`

```env
DEEPSEEK_API_KEY=sk-your-api-key
```

---

## API 文档

启动后端后访问 `http://127.0.0.1:8000/docs`

### 简历接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/resume/upload` | 上传简历文件（MD5 去重） |
| GET | `/api/resume/list` | 简历列表（分页） |
| GET | `/api/resume/{id}` | 简历详情 |
| GET | `/api/resume/{id}/file` | 下载简历原件 |
| GET | `/api/resume/default` | 获取最新简历（默认匹配用） |
| DELETE | `/api/resume/{id}` | 删除简历（级联删除关联记录） |
| POST | `/api/resume/batch-delete` | 批量删除 |

### 分析接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/analysis/analyze` | 分析岗位匹配度 |

### 历史记录

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/history/list` | 历史记录列表（分页） |
| GET | `/api/history/{id}` | 历史记录详情 |
| DELETE | `/api/history/{id}` | 删除单条 |
| POST | `/api/history/batch-delete` | 批量删除 |

### 插件接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/plugin/job-capture` | 插件发送岗位并触发分析 |
| POST | `/api/plugin/job-records/{id}/communicated` | 标记已沟通 |
| POST | `/api/plugin/job-records/{id}/ignored` | 标记已忽略 |
| POST | `/api/plugin/job-records/{id}/interview` | 标记收到面试 |

### 岗位记录

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/job-records` | 岗位记录列表（分页 / 筛选） |
| GET | `/api/job-records/{id}` | 岗位详情 |
| DELETE | `/api/job-records/{id}` | 删除单条 |
| POST | `/api/job-records/batch-delete` | 批量删除 |
| POST | `/api/job-records/batch-status` | 批量更新状态 |
| GET | `/api/job-records/{id}/interview-questions` | 获取面试题 |
| POST | `/api/job-records/{id}/generate-interview-questions` | AI 生成 30 道面试题 |

### OCR 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/ocr/extract-field` | 截图 OCR 识别公司名 / 薪资 |

### 统计接口 ★

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/statistics/overview` | 统计总览（简历数 / 岗位数 / 平均分等） |
| GET | `/api/statistics/score-distribution` | 匹配度分布（5 个区间） |
| GET | `/api/statistics/job-funnel` | 求职漏斗（扫描 → 推荐 → 沟通 → 面试 → Offer） |
| GET | `/api/statistics/hr-status-distribution` | HR 活跃状态分布 |
| GET | `/api/statistics/recent-recommended` | 最近推荐岗位 |
| GET | `/api/statistics/report/pdf` | 导出 PDF 求职分析报告 |

---

## 注意事项

1. Boss 直聘页面 DOM 可能变化，如信息提取失败需更新 `extension/content.js` 中的 SELECTORS
2. 插件默认不自动翻页，只扫描当前页
3. 自动沟通**默认关闭**，需用户主动开启
4. 所有数据仅存储在本地 SQLite 数据库和本地文件系统
5. API Key 存储在 `backend/.env`，不会被提交到 Git（已在 .gitignore）
6. 数据库文件：`backend/ai_job_assistant.db`
7. 上传文件：`backend/uploads/`
8. PDF 报告生成依赖 matplotlib 中文字体，Windows 系统默认支持 SimHei / Microsoft YaHei

---

## 免责声明 (Disclaimer)

本项目仅供个人求职辅助、学习研究与技术交流使用。使用者在利用本工具与招聘网站交互时，应严格遵守相关服务协议与法律法规。严禁使用本项目进行任何恶意攻击、批量骚扰、滥用接口或侵犯他人合法权益的行为。因使用本工具可能引发的第三方平台限制、账号受损或其它任何风险，均由使用者自行承担，与本项目开发者无关。

---

## 开源协议 (License)

本项目采用 [MIT License](LICENSE) 开源许可证。
