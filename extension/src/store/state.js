/**
 * AI求职助手 - 状态中心
 * 集中管理 panelState、scanState、currentResume 等全局响应式状态
 */

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
  threshold: 85,
  maxScanCount: 20,
  maxAutoCommunicateCount: 3,
  autoCommunicate: false,
  hrRequirement: '3days',
  hrStatusAllowed: ["在线", "刚刚活跃", "今日活跃", "3日内活跃"],
  minDelay: 15,
  maxDelay: 45,
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
