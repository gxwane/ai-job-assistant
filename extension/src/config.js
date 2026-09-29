/**
 * AI求职助手 - 扩展配置与常量定义
 */

export const PANEL_ID = 'ai-job-assistant-panel';
export const API_BASE = 'http://127.0.0.1:8000/api';

export const SELECTORS = {
  // 岗位标题
  jobTitle: [
    '.job-name .name', '.name h1', '.job-title', '.post-title',
    '.detail-title h1', 'h1', '[class*="job-name"]', '[class*="title"]',
  ],
  // 公司名称（优先取a标签里的链接文本，避免混入HR名字）
  company: [
    '.company-info a', '.company-name a',
    'a[href*="/gongsi/"]', 'a[href*="company"]',
    '.biz-company a', '.detail-company a',
    '.company-info .name:not(.boss-name)',
    '.company-name', '.company-info .name',
    '[class*="company"] a', '.job-boss-info .name:last-child',
  ],
  // 薪资
  salary: [
    '.job-salary', '.salary', '.salary-text', '.job-banner-salary',
    '.detail-salary', '[class*="salary"]',
  ],
  // 地点（城市名通常较短，不含K/薪等字符）
  location: [
    '.job-location', '.detail-location',
    '.job-area', '.detail-address', '[class*="location"]',
    '.job-detail-header .text:not([class*="salary"]):not([class*="name"])',
  ],
  // JD文本：尝试多种策略提取
  jobDescription: [
    '.job-detail .text', '.job-sec-text', '.detail-content .text',
    '.job-desc', '.job-detail-text', '.job-main .detail-text',
    '.detail-desc', '.description', '[class*="job-detail"]',
    '.job-detail', '.detail-box',
  ],
  // 立即沟通按钮
  immediateChatBtn: [
    '.btn-startchat', '.btn-chat', '.chat-btn', '.op-btn.chat',
    '.btn-immediately', '.chat-me-btn',
  ],
};

export const HR_STATUS_COLOR_MAP = {
  '在线': '#67C23A', '刚刚活跃': '#67C23A', '今日活跃': '#67C23A',
  '3日内活跃': '#E6A23C', '本周活跃': '#E6A23C',
  '本月活跃': '#F56C6C', '两周内活跃': '#F56C6C', '两月内活跃': '#F56C6C',
  '3月内活跃': '#F56C6C', '半年前活跃': '#909399',
};

export const HR_REQUIREMENT_MAP = {
  "online": ["在线", "刚刚活跃"],
  "3days": ["在线", "刚刚活跃", "今日活跃", "3日内活跃"],
  "week": ["在线", "刚刚活跃", "今日活跃", "3日内活跃", "本周活跃"],
  "month": ["在线", "刚刚活跃", "今日活跃", "3日内活跃", "本周活跃", "本月活跃"],
  "unlimited": null,
};

export const HR_REQUIREMENT_LABEL = {
  "online": "仅在线", "3days": "3日内活跃", "week": "本周内活跃",
  "month": "本月内活跃", "unlimited": "不限制",
};

// ── 安全风控底线阈值（防止小白用户误配置激进参数导致瞬间封号）──
export const SAFETY_BOUNDS = {
  minDelayFloor: 5,        // 最小延时下限（秒），严禁低于5秒
  maxDelayFloor: 10,       // 最大延时下限（秒），严禁低于10秒
  dailyLimitCeiling: 50,   // 单日自动沟通绝对硬顶，严禁超过50次
  maxScanCeiling: 100,     // 单次任务扫描批次上限，严禁超过100个
  maxCommCeiling: 30,      // 单次任务自动沟通批次上限，严禁超过30个
};

// ── 4 档场景化防封策略预设矩阵 ──
export const PRESET_PROFILES = {
  safe: {
    id: 'safe',
    name: '稳健防封',
    icon: '🛡️',
    description: '新号/敏感期推荐，高拟人长延时，严苛HR过滤',
    minDelay: 20,
    maxDelay: 50,
    threshold: 85,
    maxScanCount: 15,
    maxAutoCommunicateCount: 2,
    dailyLimit: 15,
    autoCommunicate: false,
    hrRequirement: '3days',
  },
  standard: {
    id: 'standard',
    name: '标准平衡',
    icon: '⚖️',
    description: '日常求职推荐，拟人化时延与适度沟通',
    minDelay: 12,
    maxDelay: 30,
    threshold: 80,
    maxScanCount: 30,
    maxAutoCommunicateCount: 5,
    dailyLimit: 25,
    autoCommunicate: false,
    hrRequirement: 'week',
  },
  fast: {
    id: 'fast',
    name: '快速初筛',
    icon: '⚡',
    description: '仅批量打分推荐，强制关闭沟通，快速遍历',
    minDelay: 5,
    maxDelay: 12,
    threshold: 75,
    maxScanCount: 50,
    maxAutoCommunicateCount: 0,
    dailyLimit: 0,
    autoCommunicate: false,
    hrRequirement: 'unlimited',
  },
  custom: {
    id: 'custom',
    name: '自定义',
    icon: '⚙️',
    description: '在安全底线内自由微调各项参数',
  },
};

