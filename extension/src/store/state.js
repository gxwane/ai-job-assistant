/**
 * AI求职助手 - 状态中心
 * 集中管理 panelState、scanState、currentResume 等全局响应式状态
 */

import { SAFETY_BOUNDS, PRESET_PROFILES, HR_REQUIREMENT_MAP } from '../config.js';

export const panelState = {
  mode: 'expanded',       // expanded | compact
  left: null, top: null,
  dragging: false, dragStartX: 0, dragStartY: 0, startLeft: 0, startTop: 0,
};

export const scanState = {
  status: 'idle',          // idle | running | paused | stopped | finished
  currentIndex: 0,
  totalCards: 0,
  analyzedCount: 0,
  recommendedCount: 0,
  communicatedCount: 0,
  failedCount: 0,
  presetMode: 'standard',  // safe | standard | fast | custom
  threshold: 80,
  maxScanCount: 30,
  maxAutoCommunicateCount: 5,
  dailyLimit: 25,          // 用户可配单日沟通硬上限
  autoCommunicate: false,
  hrRequirement: 'week',
  hrStatusAllowed: ["在线", "刚刚活跃", "今日活跃", "3日内活跃", "本周活跃"],
  minDelay: 12,
  maxDelay: 30,
  results: [],
  stopRequested: false,
  pauseRequested: false,
  sessionId: null,
  seenKeys: new Set(),
  pageKey: '',
  resumeFromLast: true,
  pageDone: false,
  scrollCount: 0,
  controlVersion: 0,
  activeAbortController: null,
  pausedAtStep: null,
};

export function clampScanConfig(cfg = {}) {
  let minDelay = Math.max(SAFETY_BOUNDS.minDelayFloor, Number(cfg.minDelay) || 12);
  let maxDelay = Math.max(SAFETY_BOUNDS.maxDelayFloor, Number(cfg.maxDelay) || 30);
  if (maxDelay < minDelay) {
    maxDelay = minDelay + 3;
  }
  const threshold = Math.max(0, Math.min(100, Number(cfg.threshold) || 80));
  const maxScanCount = Math.max(1, Math.min(SAFETY_BOUNDS.maxScanCeiling, Number(cfg.maxScanCount) || 30));
  const maxAutoCommunicateCount = Math.max(0, Math.min(SAFETY_BOUNDS.maxCommCeiling, Number(cfg.maxAutoCommunicateCount) ?? 5));
  const dailyLimit = Math.max(0, Math.min(SAFETY_BOUNDS.dailyLimitCeiling, Number(cfg.dailyLimit) ?? 25));
  const autoCommunicate = Boolean(cfg.autoCommunicate);
  const hrRequirement = cfg.hrRequirement in HR_REQUIREMENT_MAP ? cfg.hrRequirement : 'week';
  const hrStatusAllowed = HR_REQUIREMENT_MAP[hrRequirement];
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
    hrStatusAllowed,
  };
}

export async function saveScanConfigToStorage() {
  const payload = {
    scanConfig: {
      presetMode: scanState.presetMode,
      minDelay: scanState.minDelay,
      maxDelay: scanState.maxDelay,
      threshold: scanState.threshold,
      maxScanCount: scanState.maxScanCount,
      maxAutoCommunicateCount: scanState.maxAutoCommunicateCount,
      dailyLimit: scanState.dailyLimit,
      autoCommunicate: scanState.autoCommunicate,
      hrRequirement: scanState.hrRequirement,
    }
  };
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set(payload);
    } else {
      localStorage.setItem('ai_job_scan_config', JSON.stringify(payload.scanConfig));
    }
  } catch (e) {}
}

export async function loadScanConfigFromStorage() {
  let saved = null;
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const res = await chrome.storage.local.get(['scanConfig']);
      saved = res.scanConfig;
    } else {
      const item = localStorage.getItem('ai_job_scan_config');
      if (item) saved = JSON.parse(item);
    }
  } catch (e) {}

  if (saved) {
    const clamped = clampScanConfig(saved);
    Object.assign(scanState, clamped);
  }
  return scanState;
}


export const loadState = {
  status: 'idle',          // idle | loading | stopped | finished
  stopRequested: false,
  loadedCardCount: 0,
  maxAllowedCount: 0,
  noGrowthTimes: 0,
  scrollCount: 0,
};

export const runtimeState = {
  currentJobRecordId: null,
  currentResume: null,     // { id, filename }
  fieldSources: {},
  ocrDebug: {},
};

export function setCurrentResume(resume) {
  runtimeState.currentResume = resume;
}

export function setCurrentJobRecordId(id) {
  runtimeState.currentJobRecordId = id;
}

export function resetScanState() {
  scanState.status = 'idle';
  scanState.currentIndex = 0;
  scanState.totalCards = 0;
  scanState.analyzedCount = 0;
  scanState.recommendedCount = 0;
  scanState.communicatedCount = 0;
  scanState.failedCount = 0;
  scanState.results = [];
  scanState.stopRequested = false;
  scanState.pauseRequested = false;
  scanState.sessionId = null;
  scanState.seenKeys = new Set();
  scanState.pageKey = '';
  scanState.scrollCount = 0;
  scanState.activeAbortController = null;
  scanState.pausedAtStep = null;
}
