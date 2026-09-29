/**
 * AI求职助手 - Popup 扩展弹窗设置
 * 与页面浮窗控制面板共享同一套配置存储与安全底线
 */

const PRESETS = {
  safe: {
    minDelay: 20,
    maxDelay: 50,
    threshold: 85,
    maxScanCount: 15,
    maxAutoCommunicateCount: 2,
    dailyLimit: 15,
    autoCommunicate: false,
    hrRequirement: '3days',
    desc: '新号/敏感期推荐，高拟人长延时，严苛HR过滤',
  },
  standard: {
    minDelay: 12,
    maxDelay: 30,
    threshold: 80,
    maxScanCount: 30,
    maxAutoCommunicateCount: 5,
    dailyLimit: 25,
    autoCommunicate: false,
    hrRequirement: 'week',
    desc: '日常求职推荐，拟人化时延与适度沟通',
  },
  fast: {
    minDelay: 5,
    maxDelay: 12,
    threshold: 75,
    maxScanCount: 50,
    maxAutoCommunicateCount: 0,
    dailyLimit: 0,
    autoCommunicate: false,
    hrRequirement: 'unlimited',
    desc: '仅批量打分推荐，强制关闭沟通，快速遍历',
  },
  custom: {
    desc: '在安全底线内自由微调各项参数',
  },
};

const HR_REQUIREMENT_MAP = {
  online: ['在线', '刚刚活跃'],
  '3days': ['在线', '刚刚活跃', '今日活跃', '3日内活跃'],
  week: ['在线', '刚刚活跃', '今日活跃', '3日内活跃', '本周活跃'],
  month: ['在线', '刚刚活跃', '今日活跃', '3日内活跃', '本周活跃', '本月活跃'],
  unlimited: null,
};

// DOM 元素引用
const presetGroup = document.getElementById('presetGroup');
const presetDesc = document.getElementById('presetDesc');
const minDelayEl = document.getElementById('minDelay');
const maxDelayEl = document.getElementById('maxDelay');
const dailyLimitEl = document.getElementById('dailyLimit');
const thresholdEl = document.getElementById('threshold');
const maxScanEl = document.getElementById('maxScan');
const maxCommEl = document.getElementById('maxComm');
const hrReqEl = document.getElementById('hrReq');
const autoCommEl = document.getElementById('autoComm');
const saveBtn = document.getElementById('save');
const statusEl = document.getElementById('status');

let currentPresetMode = 'standard';

function clampConfig(cfg = {}) {
  let minDelay = Math.max(5, Number(cfg.minDelay) || 12);
  let maxDelay = Math.max(10, Number(cfg.maxDelay) || 30);
  if (maxDelay < minDelay) {
    maxDelay = minDelay + 3;
  }
  const threshold = Math.max(0, Math.min(100, Number(cfg.threshold) || 80));
  const maxScanCount = Math.max(1, Math.min(100, Number(cfg.maxScanCount) || 30));
  const maxAutoCommunicateCount = Math.max(0, Math.min(30, Number(cfg.maxAutoCommunicateCount) ?? 5));
  const dailyLimit = Math.max(0, Math.min(50, Number(cfg.dailyLimit) ?? 25));
  const autoCommunicate = Boolean(cfg.autoCommunicate);
  const hrRequirement = cfg.hrRequirement in HR_REQUIREMENT_MAP ? cfg.hrRequirement : 'week';
  const presetMode = cfg.presetMode || 'standard';

  return {
    presetMode,
    minDelay,
    maxDelay,
    threshold,
    maxScanCount,
    maxAutoCommunicateCount,
    dailyLimit,
    autoCommunicate,
    hrRequirement,
    hrStatusAllowed: HR_REQUIREMENT_MAP[hrRequirement] || null,
  };
}

function updatePresetUI(mode) {
  currentPresetMode = mode;
  const btns = presetGroup.querySelectorAll('.preset-btn');
  btns.forEach((btn) => {
    if (btn.dataset.preset === mode) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  if (presetDesc && PRESETS[mode]) {
    presetDesc.textContent = PRESETS[mode].desc;
  }
}

function populateInputs(cfg) {
  minDelayEl.value = cfg.minDelay;
  maxDelayEl.value = cfg.maxDelay;
  dailyLimitEl.value = cfg.dailyLimit;
  thresholdEl.value = cfg.threshold;
  maxScanEl.value = cfg.maxScanCount;
  maxCommEl.value = cfg.maxAutoCommunicateCount;
  hrReqEl.value = cfg.hrRequirement;
  autoCommEl.checked = Boolean(cfg.autoCommunicate);
  updatePresetUI(cfg.presetMode || 'standard');
}

// 1. 初始化加载
chrome.storage.local.get(['scanConfig', 'autoComm', 'hrRequirement'], (data) => {
  let initial = {};
  if (data.scanConfig) {
    initial = data.scanConfig;
  } else {
    // 兼容历史老版本 key
    initial = {
      autoCommunicate: data.autoComm !== false,
      hrRequirement: data.hrRequirement || 'week',
    };
  }
  const clamped = clampConfig(initial);
  populateInputs(clamped);
});

// 2. 预设切换
presetGroup.addEventListener('click', (e) => {
  const btn = e.target.closest('.preset-btn');
  if (!btn) return;
  const mode = btn.dataset.preset;
  if (!mode) return;

  if (mode in PRESETS && mode !== 'custom') {
    const profile = PRESETS[mode];
    const clamped = clampConfig({
      ...profile,
      presetMode: mode,
    });
    populateInputs(clamped);
  } else if (mode === 'custom') {
    updatePresetUI('custom');
  }
});

// 3. 用户微调输入框时自动变更为“自定义”模式
const inputElements = [
  minDelayEl,
  maxDelayEl,
  dailyLimitEl,
  thresholdEl,
  maxScanEl,
  maxCommEl,
  hrReqEl,
  autoCommEl,
];

inputElements.forEach((el) => {
  el.addEventListener('input', () => {
    updatePresetUI('custom');
  });
  el.addEventListener('change', () => {
    updatePresetUI('custom');
  });
});

// 4. 保存设置
saveBtn.addEventListener('click', () => {
  const raw = {
    presetMode: currentPresetMode,
    minDelay: Number(minDelayEl.value),
    maxDelay: Number(maxDelayEl.value),
    dailyLimit: Number(dailyLimitEl.value),
    threshold: Number(thresholdEl.value),
    maxScanCount: Number(maxScanEl.value),
    maxAutoCommunicateCount: Number(maxCommEl.value),
    autoCommunicate: autoCommEl.checked,
    hrRequirement: hrReqEl.value,
  };

  const clamped = clampConfig(raw);
  // 回显限幅后的数值（防用户输入极端值）
  populateInputs(clamped);

  const payload = {
    scanConfig: {
      presetMode: clamped.presetMode,
      minDelay: clamped.minDelay,
      maxDelay: clamped.maxDelay,
      threshold: clamped.threshold,
      maxScanCount: clamped.maxScanCount,
      maxAutoCommunicateCount: clamped.maxAutoCommunicateCount,
      dailyLimit: clamped.dailyLimit,
      autoCommunicate: clamped.autoCommunicate,
      hrRequirement: clamped.hrRequirement,
    },
    // 同步老版本字段兼容
    autoComm: clamped.autoCommunicate,
    hrRequirement: clamped.hrRequirement,
    hrStatusAllowed: clamped.hrStatusAllowed,
  };

  chrome.storage.local.set(payload, () => {
    statusEl.textContent = '✅ 设置已保存并同步至浮窗';
    setTimeout(() => {
      statusEl.textContent = '';
    }, 2000);
  });
});
