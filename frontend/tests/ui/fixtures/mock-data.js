/**
 * 高保真脱机测试数据集 (Mock Data Fixtures)
 * 供 Playwright 自动化 UI 截屏评测与脱机组件自测使用
 */

export const mockResumeList = [
  {
    id: 1,
    filename: "张三_资深全栈架构师_8年经验.pdf",
    content: "张三，8年全栈架构与开发经验。熟练掌握 Vue 3, TypeScript, Python, FastAPI, Docker, 微服务架构与大型分布式系统。曾主导日活千万级 SaaS 平台前端架构升级与工程治理。",
    created_at: "2026-09-28T10:30:00"
  },
  {
    id: 2,
    filename: "张三_AI应用研发专家.pdf",
    content: "具备 LLM 应用落地与 Agent 协同系统实战经验，深度参与 LangChain、RAG 与向量数据库知识库构建。",
    created_at: "2026-09-20T14:15:00"
  }
];

export const mockAnalysisDetail = {
  id: 101,
  job_title: "资深全栈开发专家 (Vue3 / Python / AI)",
  job_company: "未来智能科技有限公司",
  job_description: "岗位职责：\n1. 负责核心求职与分析 SaaS 平台的全栈架构设计与核心研发；\n2. 深度结合大模型提升前端交互体验，主导工程化门禁与性能调优；\n3. 参与高可用微服务与后台引擎开发。",
  match_score: 92,
  created_at: "2026-09-29T10:15:00",
  resume_filename: "张三_资深全栈架构师_8年经验.pdf",
  result_json: {
    match_score: 92,
    score_level: "强烈推荐",
    recommendation: "候选人全栈技术栈高度契合，具备大型 SaaS 实战与大模型工程化经验，建议优先发起沟通并安排深度面试。",
    salary_range: "35k-50k·15薪",
    risk_warnings: [],
    radar: {
      technical_skills: 95,
      experience_match: 90,
      education_match: 88,
      salary_match: 92,
      stability: 95
    },
    dimension_scores: {
      "核心技能契合度": 95,
      "行业实战经验": 90,
      "工程架构与规范": 94,
      "沟通与领导力": 89
    },
    matched_core_skills: ["Vue 3", "Python", "FastAPI", "TypeScript", "Docker", "微服务架构", "高并发治理"],
    missing_core_skills: ["Rust 原生开发"],
    matched_points: [
      "精通 Vue 3 组合式 API 与工程化组件抽象，具备千万人级交互平台经验",
      "精通 Python FastAPI 高性能异步后端架构与 SQLite/PostgreSQL 优化",
      "具备出色的开源技术规范治理意识与自动化 CI/CD 质量门禁落地经验"
    ],
    missing_skills: ["Rust 系统级服务封装", "ClickHouse 大数据引擎调优"],
    summary: "候选人展现出了极高水平的全栈研发与架构掌控能力。技术栈与本岗位（Vue3 + FastAPI + AI落地）完美对齐，综合评分 92 分，达到强烈推荐标准。",
    resume_suggestions: [
      "可在简历第一段更加突出在 AI Agent 结合业务场景下的性能提升量化数据（如提升分析效率 300%）",
      "附上 GitHub 优质开源作品或高质量架构设计白皮书链接"
    ],
    interview_tips: [
      "准备分享一个在大规模列表渲染中处理性能瓶颈与内存泄漏的真实案例",
      "重点阐述在面临大模型高延迟流式响应时的前端 UI 交互设计与容错处理"
    ]
  }
};

export const mockHistoryList = [
  {
    id: 101,
    job_title: "资深全栈开发专家 (Vue3 / Python / AI)",
    company_name: "未来智能科技有限公司",
    match_score: 92,
    created_at: "2026-09-29T10:15:00"
  },
  {
    id: 102,
    job_title: "Python 后端微服务架构师",
    company_name: "云数智行互联集团",
    match_score: 84,
    created_at: "2026-09-29T09:30:00"
  },
  {
    id: 103,
    job_title: "前端高级工程师 (Vue3 方向)",
    company_name: "元界智能引擎实验室",
    match_score: 78,
    created_at: "2026-09-28T16:20:00"
  },
  {
    id: 104,
    job_title: "Java 架构师 (大数据与风控)",
    company_name: "华云金科网络科技",
    match_score: 42,
    created_at: "2026-09-28T14:10:00"
  }
];

export const mockJobRecords = [
  {
    id: 201,
    title: "资深全栈开发专家",
    company: "未来智能科技有限公司",
    salary: "35k-50k",
    city: "北京·海淀",
    hr_name: "李总监",
    hr_title: "技术负责人",
    hr_status: "刚刚活跃",
    match_score: 92,
    status: "communicated",
    analysis_status: "completed",
    created_at: "2026-09-29T10:15:00"
  },
  {
    id: 202,
    title: "Python 后端架构师",
    company: "云数智行互联集团",
    salary: "30k-45k",
    city: "上海·浦东",
    hr_name: "王经理",
    hr_title: "招聘负责人",
    hr_status: "在线",
    match_score: 84,
    status: "interview",
    analysis_status: "completed",
    created_at: "2026-09-29T09:30:00"
  },
  {
    id: 203,
    title: "AI Agent 应用工程师",
    company: "元界智能实验室",
    salary: "28k-40k",
    city: "杭州·余杭",
    hr_name: "张HR",
    hr_title: "HRBP",
    hr_status: "今日活跃",
    match_score: 78,
    status: "recommended",
    analysis_status: "completed",
    created_at: "2026-09-28T16:20:00"
  },
  {
    id: 204,
    title: "Java 高并发开发",
    company: "华云金融科技",
    salary: "25k-35k",
    city: "深圳·南山",
    hr_name: "赵顾问",
    hr_title: "资深猎头",
    hr_status: "3日前活跃",
    match_score: 42,
    status: "ignored",
    analysis_status: "completed",
    created_at: "2026-09-28T14:10:00"
  }
];

export const mockStatisticsOverview = {
  resume_count: 2,
  total_jobs: 186,
  recommended_jobs: 52,
  communicated_jobs: 28,
  average_score: 81.6,
  max_score: 96
};

export const mockScoreDistribution = {
  ranges: [
    { label: "90-100分", count: 28 },
    { label: "80-89分", count: 46 },
    { label: "70-79分", count: 68 },
    { label: "60-69分", count: 32 },
    { label: "60分以下", count: 12 }
  ]
};

export const mockJobFunnel = {
  total_jobs: 186,
  recommended_jobs: 52,
  communicated_jobs: 28,
  interview_jobs: 14,
  offer_jobs: 5
};

export const mockHrStatusDistribution = {
  distribution: {
    "在线": 15,
    "刚刚活跃": 42,
    "今日活跃": 58,
    "3日内活跃": 36,
    "本周活跃": 22,
    "本月活跃": 8,
    "两周内活跃": 3,
    "两月内活跃": 1,
    "3月内活跃": 1,
    "半年前活跃": 0,
    "未知": 0
  }
};

export const mockSettings = {
  provider: "deepseek",
  base_url: "https://api.deepseek.com",
  model: "deepseek-chat",
  is_mock: false,
  active_mock_mode: false,
  api_key_masked: "sk-••••••••980",
  source: "database",
  updated_at: "2026-09-29T12:00:00"
};

export const mockInterviewQuestions = {
  exists: true,
  cached: true,
  data: {
    job_title: "资深全栈研发专家",
    company: "未来智能科技有限公司",
    total: 3,
    questions: [
      {
        index: 1,
        probability: "极高",
        category: "系统架构与工程化设计",
        question: "请结合实际业务，谈谈如何基于 Vue 3 + FastAPI 设计一套高吞吐、低延迟的求职简历匹配与大模型异步分析流水线？",
        answer: "【回答要点】1. 前后端分工：前端负责即时交互与本地持久化校验，后端采用 FastAPI BackgroundTasks 异步解耦大模型耗时调用；2. 容错治理：大模型返回 JSON 实施自动截断闭合修复；3. 数据库调优：SQLite 启用 WAL 模式应对多连接并发读写。",
        tips: ["结合大模型耗时特点强调异步解耦", "举例说明前端状态流转与轮询机制"]
      },
      {
        index: 2,
        probability: "很高",
        category: "Vue 3 核心与前端渲染调优",
        question: "深入阐述 Vue 3 Proxy 响应式系统相比 Vue 2 Object.defineProperty 的底层机制差异，以及在大数据量场景下的渲染调优？",
        answer: "【回答要点】1. Proxy 支持惰性深度拦截与属性动态增删，无需递归遍历所有嵌套属性；2. 在大数据量长列表下，通过 virtual-scroll 虚拟滚动、shallowRef 浅层响应式与 manualChunks 分包提升吞吐。",
        tips: ["重点阐明 Proxy 的内存占用优势", "提及组件按需销毁防内存泄露"]
      },
      {
        index: 3,
        probability: "很高",
        category: "大模型工程落地与风控对抗",
        question: "在招聘平台自动化辅助插件中，如何基于高斯抖动算法与拟人化延迟对抗平台风控规则，保障用户账号安全？",
        answer: "【回答要点】1. 拒绝固定时间间隔，采用 Box-Muller 变换生成高斯正态分布的拟人随机时延；2. 设定单日沟通硬上限熔断；3. 遇到滑块弹窗立即中断自动化流程并向用户发出警示。",
        tips: ["突出安全防御底线设计", "说明反风控机制的核心目标是辅助而非暴力爬虫"]
      }
    ]
  }
};
