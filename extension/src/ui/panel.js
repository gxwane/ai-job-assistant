/**
 * AI求职助手 - 面板创建、拖拽与折叠
 */
import { PANEL_ID, PRESET_PROFILES } from '../config.js';
import {
  panelState,
  runtimeState,
  scanState,
  clampScanConfig,
  saveScanConfigToStorage,
  loadScanConfigFromStorage,
} from '../store/state.js';
import { getPanelCSS } from './styles.js';
import { uploadResumeFile } from '../api/client.js';

export function createPanel(callbacks = {}) {
  if (document.getElementById(PANEL_ID)) return;

  const panel = document.createElement('div');
  panel.id = PANEL_ID;
  panel.innerHTML = `
    <div class="ai-panel-container">
      <div class="ai-panel-header" id="ai-panel-header">
        <span class="ai-panel-logo">AI</span>
        <span class="ai-panel-title">AI求职助手</span>
        <button class="ai-panel-toggle" id="ai-panel-toggle" title="缩小">−</button>
        <button class="ai-panel-close" id="ai-panel-close">&times;</button>
      </div>
      <div class="ai-panel-body ai-panel-expandable" id="ai-panel-body">
        <!-- 简历区域 -->
        <div class="ai-resume-section">
          <div class="ai-resume-header">用于岗位匹配的简历</div>
          <div class="ai-resume-row">
            <span class="ai-resume-name" id="ai-resume-name">加载中...</span>
          </div>
          <div class="ai-resume-status" id="ai-resume-status">加载中...</div>
          <div class="ai-resume-actions">
            <input type="file" id="ai-resume-file" accept=".pdf,.docx,.doc,.txt" style="display:none;">
            <button class="ai-panel-btn ai-btn-upload" id="ai-btn-upload">上传简历</button>
          </div>
        </div>

        <!-- 岗位加载区域 -->
        <div class="ai-load-section">
          <div class="ai-scan-title">岗位加载</div>
          <div class="ai-load-status">
            当前检测岗位数：<b id="ai-load-count">-</b> &nbsp;
            状态：<b id="ai-load-status-text">未开始</b>
          </div>
          <div class="ai-load-btns">
            <button class="ai-scan-btn ai-scan-btn-start" id="ai-btn-load-more">加载更多岗位</button>
            <button class="ai-scan-btn ai-scan-btn-stop" id="ai-btn-load-stop" disabled>停止加载</button>
          </div>
        </div>

        <!-- 自动筛选区域 -->
        <div class="ai-scan-section">
          <div class="ai-scan-divider"></div>
          <div class="ai-scan-title">本页自动筛选岗位</div>

          <!-- 预设选择器 -->
          <div class="ai-preset-tabs" id="ai-scan-presets">
            <button type="button" class="ai-preset-tab" data-preset="safe">🛡️稳健</button>
            <button type="button" class="ai-preset-tab active" data-preset="standard">⚖️标准</button>
            <button type="button" class="ai-preset-tab" data-preset="fast">⚡初筛</button>
            <button type="button" class="ai-preset-tab" data-preset="custom">⚙️自定义</button>
          </div>
          <div class="ai-preset-desc" id="ai-preset-desc">日常求职推荐，拟人化时延与适度沟通</div>

          <div class="ai-scan-config">
            <div class="ai-scan-row">
              <label class="ai-scan-label">匹配阈值</label>
              <input type="number" class="ai-scan-input" id="ai-scan-threshold" value="80" min="0" max="100">
              <span class="ai-scan-unit">分</span>
            </div>
            <div class="ai-scan-row">
              <label class="ai-scan-label">扫描上限</label>
              <input type="number" class="ai-scan-input" id="ai-scan-max-scan" value="30" min="1" max="100" placeholder="1-100">
              <span class="ai-scan-unit">个</span>
            </div>
            <div class="ai-scan-row">
              <label class="ai-scan-label">本次沟通</label>
              <input type="number" class="ai-scan-input" id="ai-scan-max-comm" value="5" min="0" max="30" placeholder="0-30">
              <span class="ai-scan-unit">个</span>
            </div>
            <div class="ai-scan-row">
              <label class="ai-scan-label">单日上限</label>
              <input type="number" class="ai-scan-input" id="ai-scan-daily-limit" value="25" min="1" max="50" placeholder="1-50" title="单日自动沟通硬上限，达到自动熔断">
              <span class="ai-scan-unit">次</span>
            </div>
            <div class="ai-scan-row">
              <label class="ai-scan-label">时延抖动</label>
              <input type="number" class="ai-scan-input ai-delay-input" id="ai-scan-min-delay" value="12" min="5" max="120" title="最小拟人延时(秒)">
              <span class="ai-scan-unit">-</span>
              <input type="number" class="ai-scan-input ai-delay-input" id="ai-scan-max-delay" value="30" min="10" max="300" title="最大拟人延时(秒)">
              <span class="ai-scan-unit">秒</span>
            </div>
            <div class="ai-scan-row ai-scan-switch-row">
              <label class="ai-scan-switch">
                <input type="checkbox" id="ai-scan-auto-comm">
                自动沟通
              </label>
            </div>
            <div class="ai-scan-row">
              <label class="ai-scan-label">HR要求</label>
              <select class="ai-scan-select" id="ai-scan-hr-req">
                <option value="online">仅在线</option>
                <option value="3days">3日内活跃</option>
                <option value="week" selected>本周内活跃</option>
                <option value="month">本月内活跃</option>
                <option value="unlimited">不限制</option>
              </select>
            </div>
          </div>

          <div class="ai-scan-btns">
            <button class="ai-scan-btn ai-scan-btn-start" id="ai-start-auto-scan">开始自动筛选</button>
            <button class="ai-scan-btn ai-scan-btn-diag" id="ai-btn-scan-diag">诊断卡片</button>
            <button class="ai-scan-btn ai-scan-btn-pause" id="ai-btn-scan-pause" disabled>暂停</button>
            <button class="ai-scan-btn ai-scan-btn-continue" id="ai-btn-scan-continue" disabled>继续</button>
            <button class="ai-scan-btn ai-scan-btn-stop" id="ai-btn-scan-stop" disabled>停止</button>
          </div>
          <div class="ai-scan-resume-row">
            <label class="ai-scan-switch">
              <input type="checkbox" id="ai-scan-resume-check" checked>
              继续上次进度
            </label>
            <button class="ai-scan-btn-reset" id="ai-btn-scan-reset">重置进度</button>
          </div>

          <div class="ai-scan-status" id="ai-scan-status" style="display:none;">
            <div class="ai-scan-stats">
              <span>进度: <b id="ai-scan-progress">0/0</b></span>
              <span>已分析: <b id="ai-scan-analyzed">0</b></span>
              <span>推荐: <b id="ai-scan-recommended">0</b></span>
              <span>已沟通: <b id="ai-scan-communicated">0</b></span>
              <span>失败: <b id="ai-scan-failed">0</b></span>
            </div>
            <div class="ai-scan-log" id="ai-scan-log"></div>
            <div class="ai-scan-recommended" id="ai-scan-recommended-list"></div>
          </div>
        </div>

        <p class="ai-panel-hint">点击下方按钮，将此岗位发送到AI求职助手进行匹配分析</p>
        <button class="ai-panel-btn ai-btn-primary" id="ai-btn-capture">
          发送到AI求职助手
        </button>
        <div id="ai-panel-result" style="display:none;"></div>
      </div>
      <div class="ai-panel-footer">
        <span class="ai-panel-version">v2.0 (模块化)</span>
      </div>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = getPanelCSS();
  document.head.appendChild(style);
  document.body.appendChild(panel);

  enablePanelDrag(panel);
  loadPanelState(panel);

  // 绑定内部基础事件
  document.getElementById('ai-panel-toggle')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleCompactMode(panel);
  });
  document.getElementById('ai-panel-close')?.addEventListener('click', () => {
    panel.style.display = 'none';
  });

  // 简历上传事件
  document.getElementById('ai-btn-upload')?.addEventListener('click', () => {
    document.getElementById('ai-resume-file')?.click();
  });
  document.getElementById('ai-resume-file')?.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const statusEl = document.getElementById('ai-resume-status');
    if (statusEl) {
      statusEl.textContent = '正在上传简历...';
      statusEl.className = 'ai-resume-status';
    }
    try {
      const res = await uploadResumeFile(file);
      runtimeState.currentResume = res;
      await chrome.storage.local.set({ resumeId: res.id, resumeFilename: res.filename });
      updateResumeDisplay();
    } catch (e) {
      if (statusEl) {
        statusEl.textContent = '上传失败: ' + e.message;
        statusEl.className = 'ai-resume-status error';
      }
    }
    event.target.value = '';
  });

  // 扫描配置回显与持久化监听
  loadScanConfigFromStorage().then((cfg) => {
    populateConfigInputs(cfg);
  });

  // 预设切换事件
  const presetContainer = document.getElementById('ai-scan-presets');
  presetContainer?.addEventListener('click', (e) => {
    const target = e.target.closest('.ai-preset-tab');
    if (!target) return;
    const presetKey = target.dataset.preset;
    if (!presetKey) return;
    if (presetKey in PRESET_PROFILES && presetKey !== 'custom') {
      const profile = PRESET_PROFILES[presetKey];
      const clamped = clampScanConfig({
        ...profile,
        presetMode: presetKey,
      });
      Object.assign(scanState, clamped);
      populateConfigInputs(scanState);
      saveScanConfigToStorage();
    } else if (presetKey === 'custom') {
      scanState.presetMode = 'custom';
      renderPresetUI('custom');
      saveScanConfigToStorage();
    }
  });

  // 配置修改监听（失焦或变更自动触发安全Clamp与持久化）
  const configInputIds = [
    'ai-scan-threshold',
    'ai-scan-max-scan',
    'ai-scan-max-comm',
    'ai-scan-daily-limit',
    'ai-scan-min-delay',
    'ai-scan-max-delay',
    'ai-scan-auto-comm',
    'ai-scan-hr-req',
  ];

  configInputIds.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', () => {
      syncStateFromInputs('custom');
    });
  });

  // 外部注入的回调绑定
  if (callbacks.onCapture) document.getElementById('ai-btn-capture')?.addEventListener('click', callbacks.onCapture);
  if (callbacks.onStartScan) document.getElementById('ai-start-auto-scan')?.addEventListener('click', callbacks.onStartScan);
  if (callbacks.onPauseScan) document.getElementById('ai-btn-scan-pause')?.addEventListener('click', callbacks.onPauseScan);
  if (callbacks.onContinueScan) document.getElementById('ai-btn-scan-continue')?.addEventListener('click', callbacks.onContinueScan);
  if (callbacks.onStopScan) document.getElementById('ai-btn-scan-stop')?.addEventListener('click', callbacks.onStopScan);
  if (callbacks.onLoadMore) document.getElementById('ai-btn-load-more')?.addEventListener('click', callbacks.onLoadMore);
  if (callbacks.onStopLoad) document.getElementById('ai-btn-load-stop')?.addEventListener('click', callbacks.onStopLoad);
  if (callbacks.onResetProgress) document.getElementById('ai-btn-scan-reset')?.addEventListener('click', callbacks.onResetProgress);
}

export function renderPresetUI(presetMode) {
  const tabs = document.querySelectorAll('#ai-scan-presets .ai-preset-tab');
  tabs.forEach(tab => {
    if (tab.dataset.preset === presetMode) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
  const descEl = document.getElementById('ai-preset-desc');
  if (descEl) {
    const profile = PRESET_PROFILES[presetMode] || PRESET_PROFILES.custom;
    descEl.textContent = profile ? profile.description : '';
  }
}

export function populateConfigInputs(state) {
  const thresholdEl = document.getElementById('ai-scan-threshold');
  const maxScanEl = document.getElementById('ai-scan-max-scan');
  const maxCommEl = document.getElementById('ai-scan-max-comm');
  const dailyLimitEl = document.getElementById('ai-scan-daily-limit');
  const minDelayEl = document.getElementById('ai-scan-min-delay');
  const maxDelayEl = document.getElementById('ai-scan-max-delay');
  const autoCommEl = document.getElementById('ai-scan-auto-comm');
  const hrReqEl = document.getElementById('ai-scan-hr-req');

  if (thresholdEl) thresholdEl.value = state.threshold;
  if (maxScanEl) maxScanEl.value = state.maxScanCount;
  if (maxCommEl) maxCommEl.value = state.maxAutoCommunicateCount;
  if (dailyLimitEl) dailyLimitEl.value = state.dailyLimit;
  if (minDelayEl) minDelayEl.value = state.minDelay;
  if (maxDelayEl) maxDelayEl.value = state.maxDelay;
  if (autoCommEl) autoCommEl.checked = Boolean(state.autoCommunicate);
  if (hrReqEl) hrReqEl.value = state.hrRequirement;

  renderPresetUI(state.presetMode || 'standard');
}

export function syncStateFromInputs(presetMode = 'custom') {
  const thresholdEl = document.getElementById('ai-scan-threshold');
  const maxScanEl = document.getElementById('ai-scan-max-scan');
  const maxCommEl = document.getElementById('ai-scan-max-comm');
  const dailyLimitEl = document.getElementById('ai-scan-daily-limit');
  const minDelayEl = document.getElementById('ai-scan-min-delay');
  const maxDelayEl = document.getElementById('ai-scan-max-delay');
  const autoCommEl = document.getElementById('ai-scan-auto-comm');
  const hrReqEl = document.getElementById('ai-scan-hr-req');

  const clamped = clampScanConfig({
    presetMode,
    threshold: thresholdEl ? Number(thresholdEl.value) : scanState.threshold,
    maxScanCount: maxScanEl ? Number(maxScanEl.value) : scanState.maxScanCount,
    maxAutoCommunicateCount: maxCommEl ? Number(maxCommEl.value) : scanState.maxAutoCommunicateCount,
    dailyLimit: dailyLimitEl ? Number(dailyLimitEl.value) : scanState.dailyLimit,
    minDelay: minDelayEl ? Number(minDelayEl.value) : scanState.minDelay,
    maxDelay: maxDelayEl ? Number(maxDelayEl.value) : scanState.maxDelay,
    autoCommunicate: autoCommEl ? autoCommEl.checked : scanState.autoCommunicate,
    hrRequirement: hrReqEl ? hrReqEl.value : scanState.hrRequirement,
  });

  Object.assign(scanState, clamped);
  populateConfigInputs(scanState);
  saveScanConfigToStorage();
}

export function updateResumeDisplay() {
  const nameEl = document.getElementById('ai-resume-name');
  const statusEl = document.getElementById('ai-resume-status');
  if (!nameEl || !statusEl) return;

  if (runtimeState.currentResume) {
    nameEl.textContent = runtimeState.currentResume.filename;
    nameEl.className = 'ai-resume-name ok';
    statusEl.textContent = '已作为默认匹配简历';
    statusEl.className = 'ai-resume-status ok';
  } else {
    nameEl.textContent = '未上传';
    nameEl.className = 'ai-resume-name empty';
    statusEl.textContent = '请先上传简历，上传后可自动进行岗位匹配分析';
    statusEl.className = 'ai-resume-status empty';
  }
}

function enablePanelDrag(panel) {
  const header = panel.querySelector('#ai-panel-header');
  if (!header) return;
  header.style.cursor = 'move';
  header.addEventListener('mousedown', (e) => {
    if (e.target.tagName === 'BUTTON') return;
    panelState.dragging = true;
    panelState.dragStartX = e.clientX;
    panelState.dragStartY = e.clientY;
    const rect = panel.getBoundingClientRect();
    panelState.startLeft = rect.left;
    panelState.startTop = rect.top;
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', (e) => {
    if (!panelState.dragging) return;
    const dx = e.clientX - panelState.dragStartX;
    const dy = e.clientY - panelState.dragStartY;
    let left = panelState.startLeft + dx;
    let top = panelState.startTop + dy;
    const pw = panel.offsetWidth, ph = panel.offsetHeight;
    left = Math.max(0, Math.min(left, window.innerWidth - pw));
    top = Math.max(0, Math.min(top, window.innerHeight - ph));
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
    panel.style.left = left + 'px';
    panel.style.top = top + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (!panelState.dragging) return;
    panelState.dragging = false;
    document.body.style.userSelect = '';
    panelState.left = parseInt(panel.style.left) || panel.getBoundingClientRect().left;
    panelState.top = parseInt(panel.style.top) || panel.getBoundingClientRect().top;
    savePanelState();
  });
}

function toggleCompactMode(panel) {
  const body = panel.querySelector('#ai-panel-body');
  const toggleBtn = panel.querySelector('#ai-panel-toggle');
  if (panelState.mode === 'compact') {
    panel.classList.remove('ai-compact');
    panel.classList.add('ai-expanded');
    if (body) body.style.display = '';
    if (toggleBtn) { toggleBtn.innerHTML = '&#8722;'; toggleBtn.title = '缩小'; }
    panelState.mode = 'expanded';
  } else {
    panel.classList.add('ai-compact');
    panel.classList.remove('ai-expanded');
    if (body) body.style.display = 'none';
    if (toggleBtn) { toggleBtn.innerHTML = '&#9744;'; toggleBtn.title = '放大'; }
    panelState.mode = 'compact';
  }
  savePanelState();
}

async function savePanelState() {
  try {
    await chrome.storage.local.set({
      panelState: { mode: panelState.mode, left: panelState.left, top: panelState.top }
    });
  } catch(e) {}
}

async function loadPanelState(panel) {
  try {
    const saved = await chrome.storage.local.get('panelState');
    if (saved && saved.panelState) {
      panelState.mode = saved.panelState.mode || 'expanded';
      panelState.left = saved.panelState.left;
      panelState.top = saved.panelState.top;
    }
  } catch(e) {}

  if (panelState.left != null && panelState.top != null) {
    const l = Math.max(0, Math.min(panelState.left, window.innerWidth - panel.offsetWidth));
    const t = Math.max(0, Math.min(panelState.top, window.innerHeight - panel.offsetHeight));
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
    panel.style.left = l + 'px';
    panel.style.top = t + 'px';
  }

  if (panelState.mode === 'compact') {
    panel.classList.add('ai-compact');
    const body = panel.querySelector('#ai-panel-body');
    if (body) body.style.display = 'none';
    const toggleBtn = panel.querySelector('#ai-panel-toggle');
    if (toggleBtn) { toggleBtn.innerHTML = '&#9744;'; toggleBtn.title = '放大'; }
  }
}
