/**
 * AI求职助手 - Boss直聘内容脚本
 * 在Boss直聘页面注入AI匹配面板
 * 兼容 Edge (Chromium) 和 Chrome，API 完全通用
 */

(function () {
  'use strict';

  // ========== 配置（可根据Boss页面DOM变化修改） ==========
  const SELECTORS = {
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

  // 面板ID，防重复注入
  const PANEL_ID = 'ai-job-assistant-panel';
  const API_BASE = 'http://127.0.0.1:8000/api';

  const panelState = {
    mode: 'expanded',       // expanded | compact
    left: null, top: null,
    dragging: false, dragStartX: 0, dragStartY: 0, startLeft: 0, startTop: 0,
  };

  /** 当前捕获的岗位记录ID（用于标记已沟通） */
  let currentJobRecordId = null;
  /** 当前简历信息 */
  let currentResume = null; // { id, filename }

  // ========== 初始化 ==========
  function init() {
    if (document.getElementById(PANEL_ID)) return;

    setTimeout(() => {
      createPanel();
      loadResumeFromStorage();
      loadHrSettingsFromStorage();
    }, 1500);
  }

  // ========== 面板拖拽 & 切换 ==========

  function enablePanelDrag(panel) {
    const header = panel.querySelector('#ai-panel-header');
    if (!header) return;
    header.style.cursor = 'move';
    header.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON') return; // 按钮不触发拖拽
      panelState.dragging = true;
      panelState.dragStartX = e.clientX;
      panelState.dragStartY = e.clientY;
      const rect = panel.getBoundingClientRect();
      panelState.startLeft = rect.left;
      panelState.startTop = rect.top;
      document.body.style.userSelect = 'none';
    });
  }

  document.addEventListener('mousemove', (e) => {
    if (!panelState.dragging) return;
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;
    const dx = e.clientX - panelState.dragStartX;
    const dy = e.clientY - panelState.dragStartY;
    let left = panelState.startLeft + dx;
    let top = panelState.startTop + dy;
    const pw = panel.offsetWidth, ph = panel.offsetHeight;
    left = Math.max(0, Math.min(left, window.innerWidth - pw));
    top = Math.max(0, Math.min(top, window.innerHeight - ph));
    // 清除 right/bottom 避免和 left/top 冲突
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
    panel.style.left = left + 'px';
    panel.style.top = top + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (!panelState.dragging) return;
    panelState.dragging = false;
    document.body.style.userSelect = '';
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;
    panelState.left = parseInt(panel.style.left) || panel.getBoundingClientRect().left;
    panelState.top = parseInt(panel.style.top) || panel.getBoundingClientRect().top;
    savePanelState();
  });

  function toggleCompactMode(panel) {
    panel = panel || document.getElementById(PANEL_ID);
    if (!panel) return;
    const body = panel.querySelector('#ai-panel-body');
    const toggleBtn = panel.querySelector('#ai-panel-toggle');
    if (panelState.mode === 'compact') {
      panel.classList.remove('ai-compact');
      panel.classList.add('ai-expanded');
      if (body) body.style.display = '';
      if (toggleBtn) { toggleBtn.innerHTML = '&#8722;'; toggleBtn.title = '缩小'; }
      panelState.mode = 'expanded';
      addLog('已恢复展开模式');
    } else {
      panel.classList.add('ai-compact');
      panel.classList.remove('ai-expanded');
      if (body) body.style.display = 'none';
      if (toggleBtn) { toggleBtn.innerHTML = '&#9744;'; toggleBtn.title = '放大'; }
      panelState.mode = 'compact';
      addLog('已切换为紧凑模式');
    }
    savePanelState();
  }

  async function savePanelState() {
    try {
      await chrome.storage.local.set({ panelState: { mode: panelState.mode, left: panelState.left, top: panelState.top } });
    } catch(e) {
      try { localStorage.setItem('ai_panel_state', JSON.stringify({ mode: panelState.mode, left: panelState.left, top: panelState.top })); } catch(e2){}
    }
  }

  async function loadPanelState(panel) {
    let saved = null;
    try {
      saved = await chrome.storage.local.get('panelState');
      saved = saved.panelState;
    } catch(e) {
      try { saved = JSON.parse(localStorage.getItem('ai_panel_state')); } catch(e2){}
    }
    if (saved) {
      panelState.mode = saved.mode || 'expanded';
      panelState.left = saved.left;
      panelState.top = saved.top;
    }
    // 应用位置
    if (panelState.left != null && panelState.top != null) {
      const l = Math.max(0, Math.min(panelState.left, window.innerWidth - panel.offsetWidth));
      const t = Math.max(0, Math.min(panelState.top, window.innerHeight - panel.offsetHeight));
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
      panel.style.left = l + 'px';
      panel.style.top = t + 'px';
      panelState.left = l; panelState.top = t;
    }
    // 应用模式
    if (panelState.mode === 'compact') {
      panel.classList.add('ai-compact');
      const body = panel.querySelector('#ai-panel-body');
      if (body) body.style.display = 'none';
      const toggleBtn = panel.querySelector('#ai-panel-toggle');
      if (toggleBtn) { toggleBtn.innerHTML = '&#9744;'; toggleBtn.title = '放大'; }
    }
  }

  // ========== HR设置加载 ==========

  async function loadHrSettingsFromStorage() {
    try {
      const data = await chrome.storage.local.get(['autoComm', 'hrRequirement']);
      if (data.autoComm !== undefined) {
        const cb = document.getElementById('ai-scan-auto-comm');
        if (cb) cb.checked = data.autoComm;
      }
      if (data.hrRequirement) {
        const sel = document.getElementById('ai-scan-hr-req');
        if (sel) sel.value = data.hrRequirement;
      }
    } catch(e) { /* 忽略 */ }
  }

  // ========== 简历管理 ==========

  async function loadResumeFromStorage() {
    try {
      const storage = await chrome.storage.local.get(['resumeId', 'resumeFilename']);

      // 始终跟后端同步最新简历（防止Web前端上传了新简历而插件不知道）
      let backendResume = null;
      try {
        const resp = await fetch(`${API_BASE}/resume/default`);
        if (resp.ok) {
          const data = await resp.json();
          if (data.resume_id) {
            backendResume = { id: data.resume_id, filename: data.filename || '已上传简历' };
          }
        }
      } catch (e) { /* 后端不可用，使用storage缓存 */ }

      // 以后端为准（始终是最新的），后端不可用时以storage为准
      if (backendResume) {
        currentResume = backendResume;
        await chrome.storage.local.set({ resumeId: backendResume.id, resumeFilename: backendResume.filename });
      } else if (storage.resumeId) {
        currentResume = { id: storage.resumeId, filename: storage.resumeFilename || '已上传简历' };
      } else {
        currentResume = null;
      }
    } catch (e) {
      currentResume = null;
    }
    updateResumeDisplay();
  }

  function updateResumeDisplay() {
    const nameEl = document.getElementById('ai-resume-name');
    const statusEl = document.getElementById('ai-resume-status');
    if (!nameEl || !statusEl) return;

    if (currentResume) {
      nameEl.textContent = currentResume.filename;
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

  async function handleResumeUpload() {
    const fileInput = document.getElementById('ai-resume-file');
    if (!fileInput) return;
    fileInput.click();
  }

  async function onResumeFileSelected(event) {
    const file = event.target.files[0];
    if (!file) return;

    const statusEl = document.getElementById('ai-resume-status');
    if (statusEl) { statusEl.textContent = '正在上传简历...'; statusEl.className = 'ai-resume-status'; }

    try {
      const formData = new FormData();
      formData.append('file', file);

      const resp = await fetch(`${API_BASE}/resume/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || `上传失败 (${resp.status})`);
      }

      const data = await resp.json();
      currentResume = { id: data.resume_id, filename: data.filename };
      await chrome.storage.local.set({ resumeId: data.resume_id, resumeFilename: data.filename });
      updateResumeDisplay();
      console.log('[简历] 上传成功, resume_id:', data.resume_id);
    } catch (e) {
      if (statusEl) { statusEl.textContent = '上传失败: ' + e.message; statusEl.className = 'ai-resume-status error'; }
      console.error('[简历] 上传失败:', e);
    }

    // 清空file input以便重新选择同一文件
    event.target.value = '';
  }

  // ========== 创建面板 ==========
  function createPanel() {
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

            <div class="ai-scan-config">
              <div class="ai-scan-row">
                <label class="ai-scan-label">匹配阈值</label>
                <input type="number" class="ai-scan-input" id="ai-scan-threshold" value="85" min="0" max="100">
                <span class="ai-scan-unit">分</span>
              </div>
              <div class="ai-scan-row">
                <label class="ai-scan-label">扫描上限</label>
                <input type="number" class="ai-scan-input" id="ai-scan-max-scan" value="20" min="1" max="500" placeholder="1-500">
                <span class="ai-scan-unit">个</span>
              </div>
              <div class="ai-scan-row">
                <label class="ai-scan-label">沟通上限</label>
                <input type="number" class="ai-scan-input" id="ai-scan-max-comm" value="3" min="0" max="150" placeholder="0-150">
                <span class="ai-scan-unit">个</span>
              </div>
              <div class="ai-scan-row">
                <label class="ai-scan-label">间隔</label>
                <span class="ai-scan-delay">1-5秒</span>
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
                  <option value="3days" selected>3日内活跃</option>
                  <option value="week">本周内活跃</option>
                  <option value="month">本月内活跃</option>
                  <option value="unlimited">不限制</option>
                </select>
              </div>
            </div>

            <div class="ai-scan-btns">
              <button class="ai-scan-btn ai-scan-btn-start" id="ai-start-auto-scan">开始自动筛选</button>
              <button class="ai-scan-btn ai-scan-btn-diag" id="ai-btn-scan-diag">诊断卡片</button>
              <button class="ai-scan-btn ai-scan-btn-reset" id="ai-btn-popup-diag">诊断弹窗</button>
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
          <span class="ai-panel-version">v2.0</span>
        </div>
      </div>
    `;

    const style = document.createElement('style');
    style.textContent = getPanelCSS();
    document.head.appendChild(style);
    document.body.appendChild(panel);

    // 拖拽 & 切换
    enablePanelDrag(panel);
    loadPanelState(panel);

    // 绑定事件
    document.getElementById('ai-panel-toggle')?.addEventListener('click', (e) => { e.stopPropagation(); toggleCompactMode(panel); });
    document.getElementById('ai-panel-close').addEventListener('click', () => {
      panel.style.display = 'none';
    });
    document.getElementById('ai-btn-capture').addEventListener('click', handleCapture);
    document.getElementById('ai-btn-upload').addEventListener('click', handleResumeUpload);
    document.getElementById('ai-resume-file').addEventListener('change', onResumeFileSelected);

    // 自动筛选事件绑定
    const startBtn = document.getElementById('ai-start-auto-scan');
    if (startBtn) {
      startBtn.addEventListener('click', async () => {
        try {
          addLog('点击了开始自动筛选按钮');
          await autoScanStart();
        } catch (err) {
          console.error('autoScanStart 执行失败:', err);
          addLog('自动筛选启动失败：' + (err.message || err));
        }
      });
      console.log('[AI求职助手] 自动筛选按钮绑定成功');
    } else {
      console.error('[AI求职助手] 找不到 ai-start-auto-scan 按钮');
    }
    document.getElementById('ai-btn-scan-pause')?.addEventListener('click', requestPauseScan);
    document.getElementById('ai-btn-scan-continue')?.addEventListener('click', resumeScanFromProgress);
    document.getElementById('ai-btn-scan-stop')?.addEventListener('click', requestStopScan);
    document.getElementById('ai-btn-load-more')?.addEventListener('click', startLoadMoreJobs);
    document.getElementById('ai-btn-load-stop')?.addEventListener('click', stopLoadMoreJobs);
    document.getElementById('ai-btn-scan-diag')?.addEventListener('click', diagnoseJobCards);
    document.getElementById('ai-btn-popup-diag')?.addEventListener('click', diagnoseBossPopup);
    document.getElementById('ai-btn-scan-reset')?.addEventListener('click', async () => {
      if (confirm('确定要清除当前页面扫描进度并从第1个岗位重新开始吗？')) {
        await resetScanProgress(scanState.pageKey || normalizePageUrl(window.location.href));
        addLog('当前页面扫描进度已重置，下次将从第1个岗位开始');
      }
    });

    console.log('[AI求职助手] content.js 已加载，面板就绪');
  }

  // 字段来源追踪 + OCR调试信息
  let fieldSources = {};
  let ocrDebug = {};

  // HR要求下拉 → 允许的状态列表
  const HR_REQUIREMENT_MAP = {
    "online":  ["在线", "刚刚活跃"],
    "3days":   ["在线", "刚刚活跃", "今日活跃", "3日内活跃"],
    "week":    ["在线", "刚刚活跃", "今日活跃", "3日内活跃", "本周活跃"],
    "month":   ["在线", "刚刚活跃", "今日活跃", "3日内活跃", "本周活跃", "本月活跃"],
    "unlimited": null,
  };
  const HR_REQUIREMENT_LABEL = {
    "online": "仅在线", "3days": "3日内活跃", "week": "本周内活跃",
    "month": "本月内活跃", "unlimited": "不限制",
  };

  // ========== 自动筛选状态机 ==========
  const scanState = {
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
    hrRequirement: '3days',        // HR要求
    hrStatusAllowed: ["在线", "刚刚活跃", "今日活跃", "3日内活跃"], // 允许的HR状态列表
    minDelay: 1,
    maxDelay: 5,
    results: [],
    stopRequested: false,
    pauseRequested: false,
    sessionId: null,         // 本次扫描批次ID
    seenKeys: new Set(),     // 防重复发送
    pageKey: '',             // 当前页面唯一标识
    resumeFromLast: true,    // 是否继续上次进度
    pageDone: false,         // 本页是否已扫描完
    scrollCount: 0,          // 已执行滚动次数
    controlVersion: 0,       // 控制版本号（暂停/停止时自增用于中断sleep）
    activeAbortController: null, // 当前活跃的fetch AbortController
    pausedAtStep: null,      // 暂停时所在步骤
  };

  // ========== 岗位加载状态机 ==========
  const loadState = {
    status: 'idle',          // idle | loading | stopped | finished
    stopRequested: false,
    loadedCardCount: 0,
    maxAllowedCount: 0,
    noGrowthTimes: 0,
    scrollCount: 0,
  };

  // ========== 提取岗位信息（全部绑定到当前详情页/选中卡片） ==========
  async function extractJobInfo() {
    fieldSources = {};
    ocrDebug = {};

    const jobUrl = window.location.href;

    // ---- 找到详情面板（右侧）和选中卡片（左侧） ----
    const detailPanel = findDetailPanel();
    const selectedCard = findSelectedCard();

    console.log('[提取] detailPanel:', detailPanel ? detailPanel.className?.substring(0, 40) : '未找到');
    console.log('[提取] selectedCard:', selectedCard ? selectedCard.className?.substring(0, 40) : '未找到');

    // ---- 岗位名：从详情面板H1取，过滤掉"职位描述"等 ----
    let jobTitle = extractTitleFromDetail(detailPanel);
    if (!jobTitle && selectedCard) {
      // 兜底：从选中卡片提取标题
      const cardTitle = selectedCard.querySelector('.job-name, .name, [class*="title"], a');
      if (cardTitle) {
        const ct = cardTitle.textContent.trim();
        if (isValidJobTitle(ct)) jobTitle = cleanTitle(ct);
      }
    }
    if (!jobTitle) jobTitle = '-';
    fieldSources.jobTitle = jobTitle !== '-' ? 'DOM' : '失败';

    // 发送前二次校验：绝不能用HR姓名、按钮词等作为岗位名
    if (!isValidJobTitle(jobTitle) || jobTitle === '-') {
      console.error('[校验] 岗位名无效:"' + jobTitle + '"，强制修正');
      // 最后尝试从页面标题提取
      const pageTitle = document.title.replace(/[-|].*$/, '').trim();
      if (isValidJobTitle(pageTitle) && pageTitle.length > 3) {
        jobTitle = pageTitle;
        fieldSources.jobTitle = 'DOM(页面标题)';
        console.log('[标题] 从页面标题兜底:', jobTitle);
      } else {
        jobTitle = '-';
        fieldSources.jobTitle = '失败(无效标题)';
      }
    }

    // ---- 公司：从选中卡片或招聘者区域 ----
    let company = '';
    let compReason = '';

    // 先尝试从选中卡片提取
    if (selectedCard) {
      const compEl = selectedCard.querySelector('a[href*="/gongsi/"], a[href*="company"], [class*="company"] a, [class*="company"]');
      if (compEl) {
        const ct = compEl.textContent.trim();
        if (isValidCompany(ct)) {
          company = ct;
          fieldSources.company = 'DOM(卡片)';
        }
      }
    }

    // 卡片没有 → 详情面板招聘者区域提取
    if (!isValidCompany(company) && detailPanel) {
      let { value, source, reason } = extractCompanyFromPanel(detailPanel);
      company = value;
      compReason = reason;
      if (isValidCompany(company)) fieldSources.company = source;
    }

    // 仍然没有 → 全局搜索招聘者区域
    if (!isValidCompany(company)) {
      let { value, source, reason } = extractCompanyGlobal();
      company = value;
      compReason = compReason || reason;
      if (isValidCompany(company)) fieldSources.company = source;
    }

    // OCR兜底
    if (!isValidCompany(company)) {
      const ocrComp = await extractByOCR('company');
      if (ocrComp.value) { company = ocrComp.value; fieldSources.company = 'OCR'; }
      else { company = '-'; fieldSources.company = '失败'; }
    }

    // ---- 薪资：从详情面板H1同行/选中卡片提取，然后OCR ----
    let salary = '';
    ocrDebug.salary = ocrDebug.salary || {};
    let salaryDOM = '';

    // 详情面板内找薪资
    if (detailPanel) {
      const salaryEls = detailPanel.querySelectorAll('[class*="salary"], [class*="pay"], span, div');
      for (const el of salaryEls) {
        const text = el.textContent.trim();
        if (/元\/[天日]/.test(text) || /\d+[Kk]/.test(text) || /面议/.test(text) || /□/.test(text)) {
          salaryDOM = text;
          break;
        }
      }
    }
    ocrDebug.salary.domRaw = salaryDOM || '(未提取)';

    if (!isValidSalary(salaryDOM)) {
      ocrDebug.salary.domFailReason = !salaryDOM ? 'DOM为空' :
        /□/.test(salaryDOM) ? 'DOM含反爬字符□' : '薪资格式不匹配';
      const ocrSal = await extractByOCR('salary');
      if (ocrSal.value) { salary = ocrSal.value; fieldSources.salary = 'OCR'; }
      else { salary = '-'; fieldSources.salary = '失败'; }
    } else {
      salary = salaryDOM;
      fieldSources.salary = 'DOM';
    }

    // ---- 一致性检查 ----
    const cardText = selectedCard ? getVisibleText(selectedCard).substring(0, 30) : '';
    const detailTitleShort = jobTitle.substring(0, 8);
    if (selectedCard && detailTitleShort && !cardText.includes(detailTitleShort)) {
      console.warn('[一致性] 选中卡片与详情标题不匹配！卡片:', cardText, ' 详情:', detailTitleShort);
    }

    // ---- 地点：完整工作地址 > 顶部城市 > 选中卡片 ----
    let location = extractWorkAddress();
    if (location) {
      fieldSources.location = 'DOM(工作地址)';
    } else {
      // 兜底：详情面板顶部城市
      if (detailPanel) {
        const locEl = detailPanel.querySelector('[class*="location"], [class*="address"], [class*="area"]');
        if (locEl) {
          location = locEl.textContent.trim();
          location = cleanAddress(location);
          if (location.length > 15) location = location.substring(0, 15);
        }
      }
      if (location) {
        fieldSources.location = 'DOM(顶部)';
      } else if (selectedCard) {
        const locEl = selectedCard.querySelector('[class*="location"], [class*="address"], [class*="area"]');
        if (locEl) location = cleanAddress(locEl.textContent.trim()).substring(0, 15);
        fieldSources.location = location ? 'DOM(卡片)' : '失败';
      }
      if (!location) { location = findLocationFromPage(); fieldSources.location = location ? 'DOM兜底' : '失败'; }
    }

    // 发送前清洗
    location = cleanAddress(location || '');

    // ---- JD ----
    let jobDescription = extractJobDescription();
    fieldSources.jobDescription = jobDescription ? 'DOM' : '失败';

    // ---- 发送前最终兜底清洗 ----
    // 绝不允许"职位描述"作为标题
    if (!isValidJobTitle(jobTitle) || jobTitle === '职位描述') {
      jobTitle = '-';
    }
    // 绝不允许location包含"工作地址"原文
    if (location && /^工作地址/.test(location)) {
      location = cleanAddress(location);
    }
    if (!location || location === '-' || location.length < 2) {
      location = findLocationFromPage() || '-';
    }

    const info = { jobTitle, company, salary, location, jobDescription, jobUrl };
    console.log('[AI求职助手] 提取岗位信息:', info);
    console.log('[AI求职助手] 字段来源:', fieldSources);
    return info;
  }

  // ========== 详情面板 + 选中卡片定位 ==========

  // ========== 标题提取 ==========

  function isValidJobTitle(text) {
    if (!text) return false;
    const t = text.trim();

    // 绝对排除精准匹配
    const exactInvalid = [
      '职位描述', '岗位职责', '任职要求', '岗位要求', '工作地址', '公司介绍',
      '工作内容', '职位要求', '岗位描述', '技能要求',
    ];
    if (exactInvalid.includes(t)) return false;

    // 包含HR/招聘者关键词 → 直接排除
    const hrWords = [
      '刚刚活跃', '先生', '女士', 'HR', '人事', '招聘者',
      '主管', '经理', '在线', '活跃', '离线',
    ];
    if (hrWords.some(k => t.includes(k))) return false;

    // HR姓名模式: "姚先生 刚刚活跃" / "姚先生" / "刘女士在线"
    if (/^[\u4e00-\u9fa5]{1,4}(先生|女士)(.+(活跃|在线))?$/.test(t)) return false;
    if (/^(先生|女士|在线|活跃|HR|人事|招聘)/.test(t)) return false;

    // 包含"工作地址"/"收藏"/"立即沟通"/"举报"/"分享"等页面按钮词
    const buttonWords = ['收藏', '立即沟通', '举报', '分享', '微信扫码', '工作地址', '点击查看'];
    if (buttonWords.some(k => t.includes(k))) return false;

    if (t.length < 3 || t.length > 80) return false;
    return true;
  }

  function cleanTitle(text) {
    // 截断：遇到反爬混淆字符 → 舍弃后面所有内容
    // □ (U+25A1), Private Use Area (U+E000-U+F8FF), 零宽字符
    const cutIdx = text.search(/[□\uE000-\uF8FF\u200b\u200c\u200d\u200e\u200f\ufeff\u00A0]/);
    if (cutIdx > 0) {
      text = text.substring(0, cutIdx);
    }

    return text
      // 移除薪资残留
      .replace(/\d+[-~—–]\d+元\/[天日]/g, '')
      .replace(/\d+[-~—–]\d+[Kk]([·\u00b7]\d+薪)?/g, '')
      .replace(/职位描述|岗位职责|任职要求|工作地址|岗位要求|工作内容/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function extractTitleFromDetail(detailPanel) {
    const ctx = detailPanel || document;

    // 策略1: 在详情面板找H1（通常是岗位标题）
    const h1List = [...ctx.querySelectorAll('h1')];
    for (const h1 of h1List) {
      const text = getVisibleText(h1).trim();
      if (isValidJobTitle(text)) {
        const cleaned = cleanTitle(text);
        console.log('[标题] H1提取:', cleaned);
        return cleaned;
      }
    }

    // 策略2: 找详情面板中的 .job-title / .name 等元素（但要排除HR区域）
    if (detailPanel) {
      const bossArea = detailPanel.querySelector('[class*="boss"], [class*="recruiter"], [class*="contact"]');
      const candidates = detailPanel.querySelectorAll('.job-title, .name:not(.boss-name), [class*="title"]:not([class*="boss"])');
      for (const el of candidates) {
        if (bossArea && bossArea.contains(el)) continue; // 跳过HR区域
        const text = getVisibleText(el).trim();
        if (isValidJobTitle(text) && text.length > 5) {
          const cleaned = cleanTitle(text);
          console.log('[标题] 详情面板提取:', cleaned);
          return cleaned;
        }
      }
    }

    // 策略3: 全页H1，但排除detailPanel之外的元素（如左侧卡片列表）
    const allH1 = [...document.querySelectorAll('h1')];
    for (const h1 of allH1) {
      // 只取右侧区域的H1（详情面板在页面右侧）
      const rect = h1.getBoundingClientRect();
      if (rect.left < window.innerWidth * 0.3) continue; // 左侧列表跳过
      const text = getVisibleText(h1).trim();
      if (isValidJobTitle(text)) {
        const cleaned = cleanTitle(text);
        console.log('[标题] 全页H1提取:', cleaned);
        return cleaned;
      }
    }

    console.log('[标题] 所有策略失败');
    return '';
  }

  // ========== 工作地址提取 ==========

  function extractWorkAddress() {
    // 找到文本精确为"工作地址"的元素
    const allNodes = [...document.querySelectorAll('h2, h3, h4, div, span, p, strong, b')];
    const titleNode = allNodes.find(el => {
      const text = el.innerText ? el.innerText.trim() : el.textContent.trim();
      return text === '工作地址' && text.length === 4;
    });

    if (!titleNode) return '';

    // 从父容器提取完整地址
    let container = titleNode.parentElement;
    for (let i = 0; i < 5 && container; i++) {
      // 只看可见文本（用innerText避免反爬）
      const text = container.innerText ? container.innerText.trim() : getVisibleText(container);
      const cleaned = cleanAddress(text);
      if (cleaned && cleaned.length >= 4) {
        console.log('[地址] 从工作地址区域提取:', cleaned);
        return cleaned;
      }
      container = container.parentElement;
    }

    // 如果父容器取不到完整地址，取titleNode后面所有兄弟
    let sibling = titleNode.nextElementSibling;
    let addrParts = [];
    while (sibling) {
      const t = sibling.innerText ? sibling.innerText.trim() : getVisibleText(sibling);
      if (t && !/点击查看地图|查看地图|职位描述|岗位职责/.test(t)) {
        addrParts.push(t);
      }
      sibling = sibling.nextElementSibling;
    }
    const addr = cleanAddress(addrParts.join(''));
    if (addr.length >= 4) {
      console.log('[地址] 从兄弟元素提取:', addr);
      return addr;
    }

    return '';
  }

  function cleanAddress(text) {
    const cutIdx = text.search(/[□\uE000-\uF8FF\u200b\u200c\u200d\ufeff]/);
    if (cutIdx > 0) text = text.substring(0, cutIdx);

    return text
      .replace(/工作地址/g, '')
      .replace(/点击查看地图/g, '')
      .replace(/查看地图/g, '')
      .replace(/职位描述|岗位职责|任职要求/g, '')
      .replace(/\s+/g, '')
      .trim();
  }

  // ========== 详情面板 + 选中卡片定位 ==========

  function findDetailPanel() {
    // 右侧详情面板
    const selectors = [
      '.job-detail-box', '.job-detail', '.detail-box', '.job-main',
      '[class*="job-detail"]', '.detail-content-wrapper',
    ];
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el && el.getBoundingClientRect().left > window.innerWidth * 0.3) return el;
      } catch (e) {}
    }
    return null;
  }

  function findSelectedCard() {
    // 左侧选中的岗位卡片
    const selectors = [
      '[class*="job-card"][class*="active"]',
      '[class*="job-card"][class*="selected"]',
      '[class*="job-card"][class*="cur"]',
      '[class*="selected"] [class*="job-card"]',
      '.job-card-wrapper.active',
    ];
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el) return el;
      } catch (e) {}
    }
    return null;
  }

  function extractCompanyFromPanel(panel) {
    // 从详情面板的招聘者区域提取公司名
    const blocks = panel.querySelectorAll(
      '[class*="boss"], [class*="company"], [class*="recruiter"], [class*="info-block"], div'
    );
    for (const block of blocks) {
      const text = getVisibleText(block);
      if (text.length < 5 || text.length > 200) continue;
      const match = text.match(/在线\s+(.+?)(?:\s*[·.]\s*HR|\s*·\s*HR)/);
      if (match && isValidCompany(match[1].trim())) {
        return { value: match[1].trim(), source: 'DOM(详情)', reason: '' };
      }
      const link = block.querySelector('a[href*="/gongsi/"]');
      if (link && isValidCompany(link.textContent.trim())) {
        return { value: link.textContent.trim(), source: 'DOM(链接)', reason: '' };
      }
    }
    return { value: '', source: 'DOM', reason: '详情面板未找到公司' };
  }

  function extractCompanyGlobal() {
    // 全局搜索（但排除JD区域和导航）
    return extractCompanyFromPanel(document.body);
  }

  // ========== 校验函数 ==========

  function isValidCompany(text) {
    if (!text || text === '-' || text.trim() === '') return false;
    const t = text.trim();
    const invalid = ['公司', '职位', '首页', '推荐', '地图搜索', '求职类型',
      '薪资待遇', '公司规模', '融资阶段', '不限', '全职', '兼职', '实习',
      '经验要求', '学历要求', '行业筛选', '招聘', '求职', '首页职位'];
    if (invalid.includes(t)) return false;
    if (t.length < 2 || t.length > 60) return false;
    if (/^\S{1,4}(女士|先生|在线|离线)$/.test(t)) return false;
    return true;
  }

  function isValidSalary(text) {
    if (!text || text === '-' || text.trim() === '') return false;
    const t = text.replace(/\s/g, '');
    if (/□/.test(t)) return false;
    if (/undefined/i.test(t)) return false;
    if (/^\d+-\d+元\/天/.test(t)) return true;
    if (/^\d+[Kk]?-\d+[Kk]?/.test(t) && /[Kk元天薪月年]/.test(t)) return true;
    if (t === '面议') return true;
    if (/^\d{4,5}-\d{4,5}$/.test(t)) return true;
    return false;
  }

  // ========== OCR兜底提取（含详细调试） ==========

  async function extractByOCR(fieldType) {
    // 直接使用 ocrDebug[fieldType] 引用，避免 Object.assign bug
    ocrDebug[fieldType] = ocrDebug[fieldType] || {};
    const dbg = ocrDebug[fieldType]; // dbg === ocrDebug[fieldType]，同一对象
    dbg.steps = [];
    dbg.fieldType = fieldType;

    try {
      dbg.steps.push('start');
      console.log(`[OCR] ${fieldType} DOM失败，启动OCR兜底`);

      // 找截图区域
      const rect = findOcrRect(fieldType);
      if (!rect) {
        const msg = '未找到截图区域rect';
        dbg.steps.push(msg);
        console.warn(`[OCR] ${fieldType}: ${msg}`);
        return { value: '', reason: msg };
      }

      dbg.rect = {
        left: Math.round(rect.left), top: Math.round(rect.top),
        width: Math.round(rect.width), height: Math.round(rect.height),
        dpr: window.devicePixelRatio || 1,
      };
      dbg.steps.push(`rect: ${JSON.stringify(dbg.rect)}`);
      console.log(`[OCR] ${fieldType} rect:`, dbg.rect);

      const dpr = window.devicePixelRatio || 1;
      // 扩大裁剪区域
      const padX = 30;
      const padY = 20;
      const cropRect = {
        x: Math.max(0, rect.left - padX),
        y: Math.max(0, rect.top - padY),
        width: rect.width + padX * 2,
        height: rect.height + padY * 2,
        dpr: dpr,
      };

      dbg.cropRect = {
        x: cropRect.x, y: cropRect.y,
        width: cropRect.width, height: cropRect.height,
        dprCropW: Math.round(cropRect.width * dpr),
        dprCropH: Math.round(cropRect.height * dpr),
      };

      // 截图裁剪
      dbg.steps.push('calling captureArea');
      console.log(`[OCR] ${fieldType} cropRect: x=${cropRect.x} y=${cropRect.y} w=${cropRect.width} h=${cropRect.height} dpr=${dpr}`);
      const capResult = await chrome.runtime.sendMessage({
        action: 'captureArea',
        rect: cropRect,
        tabId: null,
      });

      if (!capResult.success) {
        const msg = '截图失败: ' + (capResult.error || 'unknown');
        dbg.steps.push(msg);
        console.warn(`[OCR] ${fieldType}: ${msg}`);
        return { value: '', reason: msg };
      }

      // 保存裁剪图用于诊断显示（关键：直接设置在同一对象上）
      dbg.cropImageBase64 = capResult.imageBase64;
      dbg.cropSize = `${cropRect.width}x${cropRect.height} (DPR=${dpr})`;
      dbg.steps.push('crop done: ' + dbg.cropSize);
      console.log(`[OCR] ${fieldType} crop size:`, dbg.cropSize);
      console.log(`[OCR] ${fieldType} imageBase64 length:`, capResult.imageBase64 ? capResult.imageBase64.length : 0);

      // 调用后端OCR
      dbg.steps.push('calling backend OCR');
      const ocrResult = await chrome.runtime.sendMessage({
        action: 'ocrField',
        imageBase64: capResult.imageBase64,
        fieldType: fieldType,
      });

      if (!ocrResult.success || !ocrResult.data) {
        const msg = '后端OCR失败: ' + (ocrResult.error || '无响应');
        dbg.steps.push(msg);
        console.warn(`[OCR] ${fieldType}: ${msg}`);
        return { value: '', reason: msg };
      }

      const data = ocrResult.data;
      dbg.ocrRawText = data.rawText || '';
      dbg.ocrCleanedText = data.cleanedText || '';
      dbg.ocrValid = data.valid;
      dbg.ocrReason = data.reason || '';
      dbg.ocrStrategy = data.strategy || '';
      dbg.ocrDetections = data.detections || [];
      dbg.ocrProcessedImage = data.processedImageBase64 || '';

      dbg.steps.push(`OCR返回: rawText="${data.rawText}" cleanedText="${data.cleanedText}" valid=${data.valid} strategy=${data.strategy}`);
      console.log(`[OCR] ${fieldType} 后端详情:`, data);

      if (!data.valid) {
        const msg = data.reason || 'OCR校验不通过';
        dbg.steps.push(msg);
        return { value: '', reason: msg };
      }

      const text = data.text;
      if (fieldType === 'company' && isValidCompany(text)) {
        dbg.steps.push('前端校验通过');
        return { value: text, reason: '' };
      }
      if (fieldType === 'salary' && isValidSalary(text)) {
        dbg.steps.push('前端校验通过');
        return { value: text, reason: '' };
      }

      const msg = `前端校验失败: "${text}"`;
      dbg.steps.push(msg);
      return { value: '', reason: msg };
    } catch (e) {
      const msg = '异常: ' + e.message;
      dbg.steps = dbg.steps || [];
      dbg.steps.push(msg);
      console.error(`[OCR] ${fieldType}: ${msg}`);
      return { value: '', reason: msg };
    }
  }

  /** 页面红框标注OCR目标区域（诊断用） */
  /** 为OCR找到一个好的截图区域 */
  function findOcrRect(fieldType) {
    if (fieldType === 'salary') {
      // 策略1：详情页 H1 标题右侧的薪资元素
      const titleEl = document.querySelector('h1, .job-title, .name h1, .detail-title h1');
      if (titleEl) {
        // 在标题的祖先容器中搜索薪资文本
        const header = titleEl.closest('.job-detail-header, .job-primary, .job-info, .detail-header')
                    || titleEl.parentElement?.parentElement
                    || titleEl.parentElement;

        if (header) {
          const titleTop = titleEl.getBoundingClientRect().top;

          // 遍历容器内所有元素找薪资特征文本
          const candidates = [];
          const allEls = header.querySelectorAll('*');
          for (const el of allEls) {
            // 跳过标题本身
            if (el === titleEl || titleEl.contains(el)) continue;
            // 跳过被黑名单过滤的元素
            if (isBlacklisted(el.className?.toString().toLowerCase())) continue;

            const text = el.innerText?.trim() || el.textContent?.trim() || '';
            const rect = el.getBoundingClientRect();

            // 必须在标题同一行或附近
            if (rect.width < 40 || rect.height < 10) continue;
            if (rect.top < titleTop - 10 || rect.top > titleTop + 60) continue;

            // 检查是否有薪资特征
            const hasSalaryLike = /元\/[天日]/.test(text)
              || /\d+[Kk]/.test(text)
              || /薪/.test(text)
              || /[□]{2,}/.test(text)
              || /面议/.test(text);

            if (hasSalaryLike) {
              candidates.push({ el, rect, text: text.substring(0, 30) });
            }
          }

          // 取最右侧的候选（薪资通常在标题右边）
          if (candidates.length > 0) {
            candidates.sort((a, b) => b.rect.right - a.rect.right);
            const best = candidates[0];
            console.log(`[OCR] salary detail header candidate: "${best.text}"`);
            return best.rect;
          }
        }
      }

      // 策略2：左侧选中岗位卡片右上角薪资
      const selectedCard = document.querySelector(
        '.job-card-wrapper.active, .job-card-wrapper.selected, ' +
        '[class*="job-card"][class*="active"], [class*="job-card"][class*="selected"], ' +
        '.selected .job-card, .active .job-card'
      );
      if (selectedCard) {
        const cr = selectedCard.getBoundingClientRect();
        // 卡片右上角 - 薪资通常在这里
        return {
          left: cr.right - 220,
          top: cr.top + 15,
          width: 200,
          height: 50,
        };
      }

      // 兜底：尝试找任何含"元/天"的可见元素
      const allSpans = document.querySelectorAll('span, div, p, b, strong');
      for (const el of allSpans) {
        const text = el.innerText?.trim() || '';
        if (/元\/[天日]/.test(text) && text.length < 30) {
          const r = el.getBoundingClientRect();
          if (r.width > 40 && r.top < 500) return r;
        }
      }

      return null;
    }

    if (fieldType === 'company') {
      // 公司名：找含"HR"或"在线"的可见文本块（招聘者区域）
      const blocks = document.querySelectorAll(
        'div, section, [class*="boss"], [class*="company"], [class*="info"], ' +
        '[class*="sider"], [class*="card-view"], [class*="recruiter"]'
      );
      for (const block of blocks) {
        if (block.closest('.job-detail-body, .job-detail-box')) continue;
        if (isBlacklisted(block.className?.toString().toLowerCase())) continue;
        const t = getVisibleText(block);
        if (t.length > 10 && t.length < 200 &&
            (t.includes('HR') || t.includes('在线')) &&
            (t.includes('·') || t.includes('.')) &&
            !t.includes('职位描述') && !t.includes('岗位职责')) {
          const r = block.getBoundingClientRect();
          if (r.width > 100 && r.height > 20 && r.top < 800) return r;
        }
      }

      // 兜底：公司链接
      const companyLink = document.querySelector('a[href*="/gongsi/"], a[href*="company"]');
      if (companyLink) {
        const r = companyLink.getBoundingClientRect();
        if (r.width > 30 && r.height > 10) return r;
      }
    }

    // 最后兜底：职位卡片顶部区域
    const titleEl = document.querySelector('h1, .job-title, .name h1');
    if (titleEl) {
      const tr = titleEl.getBoundingClientRect();
      if (fieldType === 'company') {
        return {
          left: tr.left,
          top: tr.bottom + 5,
          width: Math.min(350, tr.width),
          height: 40,
        };
      }
    }
    return null;
  }

  /** 从页面中提取城市名（地点兜底） */
  function findLocationFromPage() {
    const majorCities = [
      '北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '南京',
      '西安', '重庆', '苏州', '天津', '长沙', '郑州', '济南', '青岛',
      '合肥', '福州', '厦门', '东莞', '佛山', '无锡', '宁波', '大连',
      '沈阳', '哈尔滨', '长春', '昆明', '贵阳', '南宁', '海口', '拉萨',
      '银川', '西宁', '兰州', '呼和浩特', '乌鲁木齐', '石家庄', '太原',
    ];

    // 策略1：查找breadcrumb或地址bar中的城市名
    const candidates = document.querySelectorAll(
      '.job-address, .detail-address, .job-location, .location, ' +
      '[class*="address"], [class*="location"], .job-area, .detail-area'
    );
    for (const el of candidates) {
      const text = el.innerText ? el.innerText.trim() : el.textContent.trim();
      for (const city of majorCities) {
        if (text.includes(city) && text.length < 30) return city;
      }
    }

    // 策略2：从URL路径中提取（boss直聘URL有时包含城市信息）
    try {
      const url = window.location.href;
      for (const city of majorCities) {
        if (url.includes(city)) return city;
      }
    } catch (e) {}

    return '';
  }

  /**
   * 多策略提取JD文本
   * 策略1(主): 找到"职位描述"标题 → 收集后续UL/P/DIV兄弟元素（只取可见文本）
   * 策略2: 从标题向上找父容器，用可见文本提取
   * 策略3: 兜底选择器
   */
  function extractJobDescription() {
    const jdHeadingEl = findJdHeading();

    // ========== 策略1（主）：标题定位 + 兄弟元素可见文本收集 ==========
    if (jdHeadingEl) {
      let collected = [];
      let sibling = jdHeadingEl.nextElementSibling;
      const stopTags = ['H1', 'H2', 'H3', 'H4', 'H5'];
      const stopKeywords = [
        '工作地址', '点击查看地图', '去App与BOSS随时沟通',
        '前往App与BOSS随时沟通',
      ];

      while (sibling && !stopTags.includes(sibling.tagName)) {
        const tag = sibling.tagName;
        const cls = (sibling.className || '').toString().toLowerCase();

        // 只收集 UL / P / DIV
        if (['UL', 'P', 'DIV'].includes(tag) && !isBlacklisted(cls)) {
          // 先检查是否包含停止关键词（用 innerText 快速判断）
          const quickText = sibling.innerText ? sibling.innerText.trim() : '';
          if (stopKeywords.some((kw) => quickText.includes(kw))) break;

          // 用可见文本提取
          const visible = getVisibleText(sibling);
          if (visible.length > 0) collected.push(visible);
        }

        sibling = sibling.nextElementSibling;
      }

      let text = collected.join('\n');
      text = cleanJobDescription(text);
      if (text.length >= 80) return text;
    }

    // ========== 策略2：job-detail-body 容器（仅可见文本） ==========
    if (jdHeadingEl) {
      for (const cls of ['job-detail-body', 'job-detail-box']) {
        const container = jdHeadingEl.closest('.' + cls);
        if (container) {
          let text = getVisibleText(container);
          text = cleanJobDescription(text);
          if (text.length >= 80) return text;
        }
      }
    }

    // ========== 策略3：选择器兜底 ==========
    const jdSelectors = ['.job-detail-body', '.job-detail-box', '[class*="job-detail"]', '.detail-content'];
    for (const sel of jdSelectors) {
      try {
        const el = document.querySelector(sel);
        if (!el || isElementBlacklisted(el)) continue;
        let text = getVisibleText(el);
        text = cleanJobDescription(text);
        if (text.length >= 80) return text;
      } catch (e) { /* skip */ }
    }

    // 兜底：页面最大可见文本块
    let bestText = '';
    const candidates = document.querySelectorAll('div, section, article');
    for (const el of candidates) {
      if (isElementBlacklisted(el)) continue;
      let text = getVisibleText(el);
      text = cleanJobDescription(text);
      if (text.length > bestText.length && text.length > 80 && text.length < 8000 && isJobContent(text)) {
        bestText = text;
      }
    }
    return bestText;
  }

  /** 查找"职位描述"等JD关键词标题元素 */
  function findJdHeading() {
    const jdHeadings = ['职位描述', '岗位职责', '任职要求', '工作内容', '职位要求', '岗位要求', '岗位描述'];
    const allHeadings = document.querySelectorAll('h1, h2, h3, h4, h5, strong, b, div, span');
    for (const el of allHeadings) {
      // 用 innerText 而不是 textContent，避免取到隐藏文本
      const text = el.innerText ? el.innerText.trim() : '';
      if (jdHeadings.some((kw) => text === kw || (text.includes(kw) && text.length < 20))) {
        return el;
      }
    }
    return null;
  }

  // ---- 黑名单：class名包含这些词的排除 ---- //
  const BLACKLIST_CLASS = [
    'filter', 'nav', 'dropdown', 'select', 'condition',
    'page-jobs-main', 'user-nav', 'home-inner', 'nav-resume',
    'c-filter', 'filter-select', 'select-list',
    'condition-industry', 'condition-',
  ];

  function isBlacklisted(className) {
    if (!className) return false;
    const lower = className.toLowerCase();
    return BLACKLIST_CLASS.some((kw) => lower.includes(kw));
  }

  function isElementBlacklisted(el) {
    if (!el) return true;
    // 检查元素自身class
    const cls = (el.className || '').toString().toLowerCase();
    if (isBlacklisted(cls)) return true;
    // 检查祖先
    const ancestor = el.closest(
      'nav, header, footer, .nav, .header, .footer, ' +
      '[class*="filter"], [class*="nav-"], [class*="dropdown"], [class*="user-"], ' +
      '.home-inner, .page-jobs-main'
    );
    return !!ancestor;
  }

  // ========== 可见文本提取（跳过 style/script/隐藏元素） ==========

  /** 判断元素是否对用户可见 */
  function isVisibleElement(el) {
    if (!el || el.nodeType !== 1) return true;

    // 跳过不可见标签
    const tag = el.tagName.toLowerCase();
    if (['style', 'script', 'noscript', 'svg', 'path', 'meta', 'link'].includes(tag)) {
      return false;
    }

    // 跳过hidden属性
    if (el.hidden || el.getAttribute('aria-hidden') === 'true') return false;

    // 跳过CSS隐藏
    try {
      const style = window.getComputedStyle(el);
      if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        parseFloat(style.opacity) === 0 ||
        parseFloat(style.fontSize) === 0
      ) {
        return false;
      }
    } catch (e) {
      // getComputedStyle 失败时保守通过
    }

    return true;
  }

  /** 提取元素内所有可见文本，跳过隐藏节点和CSS */
  function getVisibleText(root) {
    let result = [];

    function walk(node) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (!isVisibleElement(node)) return;
        for (const child of node.childNodes) {
          walk(child);
        }
      } else if (node.nodeType === Node.TEXT_NODE) {
        const text = node.nodeValue.replace(/\s+/g, ' ').trim();
        if (text) result.push(text);
      }
    }

    walk(root);
    return result.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  // ========== JD 文本清洗 ==========

  /** 对提取到的JD文本做深度清洗 */
  function cleanJobDescription(text) {
    if (!text) return '';

    // 0. 删除反爬混淆字符（□、PUA区私有字符、零宽字符）
    text = text.replace(/[□\uE000-\uF8FF\u200b\u200c\u200d\u200e\u200f\ufeff]/g, '');

    // 1. 删除CSS代码块（.className{...}）
    text = text.replace(/\.[\w-]+\s*\{[^}]*\}/g, '');

    // 2. 删除Boss反爬噪声词（注意：不破坏正常句子）
    text = text.replace(/来自BOSS直聘/g, '');
    text = text.replace(/BOSS直聘/g, '');
    text = text.replace(/\bkanzhun\b/gi, '');
    // "岗xxx位" → "岗位" 等被拆的词
    text = text.replace(/岗boss位/gi, '岗位');
    text = text.replace(/岗kanzhun位/gi, '岗位');
    text = text.replace(/\b(boss|kanzhun)\b/gi, '');

    // 3. 按停止关键词截断（后面的HR信息/地址不要）
    const cutKeywords = [
      '去App与BOSS随时沟通', '前往App与BOSS随时沟通',
      '工作地址', '点击查看地图', '刘女士', '王先生',
      '张女士', '李女士', '赵女士', '陈女士',
      '在线 积木', '· HR', '·HR',
    ];
    for (const kw of cutKeywords) {
      const idx = text.indexOf(kw);
      if (idx > 50) {
        text = text.substring(0, idx);
        break; // 只按第一个命中截断
      }
    }

    // 4. 删除按钮/操作噪声词
    const buttonWords = ['收藏', '立即沟通', '举报', '微信扫码分享', '分享'];
    for (const word of buttonWords) {
      text = text.replace(new RegExp(word, 'g'), '');
    }

    // 5. 删除只有空白/噪声的行
    text = text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => {
        if (line.length === 0) return false;
        // 过滤纯CSS/噪声行
        if (/^[{};:#.\s]+$/.test(line)) return false;
        if (/^@[\w-]/.test(line)) return false;
        return true;
      })
      .join('\n');

    // 6. 清理多余空白
    text = text.replace(/[\t ]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

    return text;
  }

  /** 清理文本：去除多余空白（保留兼容） */
  function cleanText(text) {
    return text.replace(/[\t ]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  }

  /** 判断文本像JD而不是筛选栏/导航/页面框架 */
  function isJobContent(text) {
    if (text.length < 80) return false;

    // Strong negative: 筛选栏特征词
    const filterWords = [
      '求职类型', '薪资待遇', '经验要求', '学历要求', '公司规模', '融资阶段',
      '行业筛选', '地图搜索', '3K以下', '5-10K', '10-20K', '50K以上',
      '职位类型', '工作性质', '发布时间',
    ];
    let filterCount = 0;
    for (const w of filterWords) {
      if (text.includes(w)) filterCount++;
    }
    if (filterCount >= 2) return false;

    // Strong negative: 导航特征词出现过多
    const navWords = [
      '首页', '消息', '简历new', 'AI简历', '智能简历', '个人中心',
      '升级VIP', '尊享', '投递状态', '在线简历', 'BOSS直聘',
      '岗位筛选', '所在城市', '薪资范围', '求职期望',
    ];
    let navCount = 0;
    for (const w of navWords) {
      if (text.includes(w)) navCount++;
    }
    if (navCount >= 3) return false;

    // Strong positive: JD特征词
    const jdWords = [
      '岗位职责', '任职要求', '职位描述', '工作内容', '岗位要求',
      '岗位描述', '技能要求', '加分项', '优先考虑',
    ];
    let jdScore = 0;
    for (const w of jdWords) {
      if (text.includes(w)) jdScore += 3;
    }

    // Medium positive: 常见技术/工作岗位词
    const techWords = [
      '负责', '经验', '熟练', '掌握', '熟悉', '了解', '具备',
      '项目', '开发', '设计', '能力', '团队', '技术', '产品',
      '本科', '专科', '硕士', '相关专业', '计算机',
      '框架', '数据库', '前端', '后端', '算法', '架构',
      '优化', '维护', '实现', '完成', '参与', '独立',
    ];
    for (const w of techWords) {
      if (text.includes(w)) jdScore += 1;
    }

    // 必须命中至少2个JD直接词 或 技术词超过10个
    return jdScore >= 6 || (jdScore >= 3 && text.length > 300);
  }

  // ========== 处理捕获请求 ==========
  async function handleCapture() {
    const btn = document.getElementById('ai-btn-capture');
    const resultDiv = document.getElementById('ai-panel-result');

    btn.disabled = true;
    btn.textContent = '分析中...';
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<p class="ai-loading">正在分析岗位匹配度...</p>';

    try {
      const jobInfo = await extractJobInfo();

      // 校验必填字段
      const missing = [];
      if (!jobInfo.jobTitle) missing.push('岗位名');
      if (!jobInfo.jobDescription) missing.push('JD文本');
      if (!jobInfo.jobUrl) missing.push('链接');

      if (missing.length > 0) {
        // 打印详细信息到Console帮助排查
        console.log('[AI求职助手] 提取结果:', {
          jobTitle: jobInfo.jobTitle?.substring(0, 30) || '(空)',
          company: jobInfo.company?.substring(0, 20) || '(空)',
          salary: jobInfo.salary || '(空)',
          location: jobInfo.location || '(空)',
          jobDescription: jobInfo.jobDescription
            ? `${jobInfo.jobDescription.substring(0, 80)}...`
            : '(空 - 页面DOM可能已变化)',
        });
        throw new Error(
          `提取不完整：${missing.join('、')}缺失。\n按F12查看Console获取详细信息，或使用手动粘贴JD功能`
        );
      }

      // 从storage读取当前简历ID
      const storage = await chrome.storage.local.get(['resumeId', 'resumeFilename']);
      const resumeId = storage.resumeId || currentResume?.id || null;

      // 无简历时警告
      if (!resumeId) {
        console.warn('[AI求职助手] 未上传简历，仅保存岗位不分析');
      }

      // 发送到后端
      const response = await chrome.runtime.sendMessage({
        action: 'jobCapture',
        data: {
          resume_id: resumeId,
          job_title: jobInfo.jobTitle,
          company: jobInfo.company || null,
          salary: jobInfo.salary || null,
          location: jobInfo.location || null,
          job_url: jobInfo.jobUrl,
          job_description: jobInfo.jobDescription,
        },
      });

      if (!response.success) {
        throw new Error(response.error || '请求失败');
      }

      const data = response.data;
      currentJobRecordId = data.job_record_id;

      // 渲染结果
      renderResult(data);
    } catch (error) {
      resultDiv.innerHTML = `
        <div class="ai-error">
          <p>分析失败：${error.message}</p>
          <p class="ai-hint">请检查：</p>
          <ul>
            <li>后端服务是否已启动（http://127.0.0.1:8000）</li>
            <li>当前是否在Boss直聘岗位详情页</li>
            <li>DOM选择器是否需要更新</li>
          </ul>
        </div>
      `;
    } finally {
      btn.disabled = false;
      btn.textContent = '重新发送分析';
    }
  }

  // ========== 渲染分析结果 ==========
  function renderResult(data) {
    const resultDiv = document.getElementById('ai-panel-result');

    const scoreColor = data.match_score >= 70 ? '#67C23A' : data.match_score >= 50 ? '#E6A23C' : '#F56C6C';
    const hrStatusColorMap = {
      '在线': '#67C23A', '刚刚活跃': '#67C23A', '今日活跃': '#67C23A',
      '3日内活跃': '#E6A23C', '本周活跃': '#E6A23C',
      '本月活跃': '#F56C6C', '两周内活跃': '#F56C6C', '两月内活跃': '#F56C6C',
      '3月内活跃': '#F56C6C', '半年前活跃': '#909399',
    };
    const hrColor = hrStatusColorMap[data.hr_status] || '#909399';

    let html = `
      <div class="ai-result">
        <div class="ai-score-section">
          <div class="ai-score-circle" style="border-color: ${scoreColor}; color: ${scoreColor};">
            <span class="ai-score-num">${data.match_score ?? '--'}</span>
            <span class="ai-score-label">分</span>
          </div>
          <div class="ai-score-info">
            <span class="ai-score-level" style="color: ${scoreColor};">${data.score_level || '未分析'}</span>
            <span class="ai-status-badge ai-status-${data.status}">${statusLabel(data.status)}</span>
          </div>
        </div>
        <p class="ai-recommendation">${data.recommendation || data.message}</p>
    `;

    // HR信息
    if (data.hr_name || data.hr_status) {
      html += `
        <div class="ai-hr-info">
          <span class="ai-hr-label">HR：</span>
          ${data.hr_name ? `<span class="ai-hr-name">${escapeHtml(data.hr_name)}</span>` : ''}
          ${data.hr_status ? `<span class="ai-hr-status" style="color:${hrColor}; background:${hrColor}22; border:1px solid ${hrColor}; padding:2px 8px; border-radius:4px; font-size:11px;">${escapeHtml(data.hr_status)}</span>` : ''}
          ${data.composite_score != null ? `<span class="ai-composite">综合 ${data.composite_score}</span>` : ''}
        </div>
      `;
    }

    // 岗位标签
    if (data.job_tags && data.job_tags.length > 0) {
      const tagsHtml = data.job_tags.map(t => `<span class="ai-job-tag">${escapeHtml(t)}</span>`).join('');
      html += `<div class="ai-job-tags"><span class="ai-tags-label">标签：</span>${tagsHtml}</div>`;
    }

    // 推荐沟通时显示按钮
    if (data.should_recommend && data.job_record_id) {
      html += `
        <button class="ai-panel-btn ai-btn-success" id="ai-btn-communicate">
          一键沟通
        </button>
      `;
    }

    // 如果已分析但不推荐，也可手动标记已沟通
    if (!data.should_recommend && data.job_record_id && data.match_score != null) {
      html += `
        <button class="ai-panel-btn ai-btn-outline" id="ai-btn-communicate">
          仍要沟通（手动确认）
        </button>
      `;
    }

    html += `</div>`;
    resultDiv.innerHTML = html;

    // 绑定一键沟通事件
    const communicateBtn = document.getElementById('ai-btn-communicate');
    if (communicateBtn) {
      communicateBtn.addEventListener('click', handleCommunicate);
    }
  }

  // ========== 处理一键沟通 ==========
  async function handleCommunicate() {
    if (!currentJobRecordId) return;

    // 尝试在页面中查找并点击"立即沟通"按钮
    const chatBtn = findImmediateChatButton();
    if (chatBtn) {
      try {
        chatBtn.click();
        console.log('[AI求职助手] 已点击"立即沟通"按钮');
      } catch (e) {
        console.warn('[AI求职助手] 点击"立即沟通"按钮失败:', e);
      }
    } else {
      console.warn('[AI求职助手] 未在页面中找到"立即沟通"按钮，请手动点击');
      const resultDiv = document.getElementById('ai-panel-result');
      const warning = document.createElement('p');
      warning.className = 'ai-warning';
      warning.textContent = '未找到"立即沟通"按钮，请在页面中手动点击沟通按钮';
      resultDiv.appendChild(warning);
    }

    // 通知后端已沟通
    try {
      await chrome.runtime.sendMessage({
        action: 'markCommunicated',
        recordId: currentJobRecordId,
      });

      const resultDiv = document.getElementById('ai-panel-result');
      const success = document.createElement('p');
      success.className = 'ai-success-msg';
      success.textContent = '已记录沟通状态';
      resultDiv.appendChild(success);

      // 更新面板
      const scoreInfo = document.querySelector('.ai-status-badge');
      if (scoreInfo) {
        scoreInfo.className = 'ai-status-badge ai-status-communicated';
        scoreInfo.textContent = '已沟通';
      }

      const btn = document.getElementById('ai-btn-communicate');
      if (btn) {
        btn.disabled = true;
        btn.textContent = '已沟通';
      }
    } catch (e) {
      console.error('[AI求职助手] 标记已沟通失败:', e);
    }
  }

  // ========== 查找"立即沟通"按钮 ==========
  function findImmediateChatButton() {
    // 按优先级尝试配置的选择器
    for (const selector of SELECTORS.immediateChatBtn) {
      try {
        const el = document.querySelector(selector);
        if (el && el.offsetParent !== null) return el;
      } catch (e) { /* skip */ }
    }

    // 兜底：查找包含"沟通"文字的可点击元素
    const allButtons = document.querySelectorAll('button, a, .btn, [role="button"], span');
    for (const btn of allButtons) {
      if (btn.textContent.includes('沟通') && btn.offsetParent !== null) {
        return btn;
      }
    }

    return null;
  }

  // ========== 自动筛选功能 ==========

  // ============================================================
  //  一、岗位卡片识别（三层策略 + 诊断 + 可视化）
  // ============================================================

  /** 判断元素是否大概是左侧岗位卡片（文本特征） */
  function isLikelyJobCard(el) {
    try {
      const text = (el.innerText || '').trim();
      if (text.length < 20 || text.length > 500) return false;
      const rect = el.getBoundingClientRect();
      if (rect.width < 200 || rect.height < 60) return false;
      // 必须在左侧
      if (rect.left > window.innerWidth * 0.5) return false;

      // 排除黑名单关键词
      const blacklist = ['职位描述', '岗位职责', '任职要求', '公司介绍', '点击下方按钮', '发送到AI求职助手', '工作地址', '举报'];
      for (const w of blacklist) { if (text.includes(w)) return false; }

      // 薪资特征
      const salaryHints = [/\/天/, /\d+[Kk]/, /薪/, /元/, /面议/];
      let hasSalary = false;
      for (const re of salaryHints) { if (re.test(text)) { hasSalary = true; break; } }

      // 经验/学历/周期特征
      const expHints = [/本科/, /硕士/, /学历不限/, /经验不限/, /实习/, /在校/, /应届/, /\d+年/, /\d个月/, /\d+天\/周/];
      let hasExp = false;
      for (const re of expHints) { if (re.test(text)) { hasExp = true; break; } }

      return hasSalary || hasExp;
    } catch (e) { return false; }
  }

  /** 去重：去除被包含的元素，保留更像卡片的 */
  function deduplicateCards(candidates) {
    // 按"卡片评分"排序（更接近典型卡片尺寸的排前面）
    const score = (el) => {
      const r = el.getBoundingClientRect();
      const wScore = r.width > 300 && r.width < 700 ? 3 : 1;
      const hScore = r.height > 80 && r.height < 250 ? 3 : 1;
      const tLen = (el.innerText || '').length;
      const tScore = tLen > 40 && tLen < 300 ? 3 : 1;
      return wScore + hScore + tScore;
    };
    const sorted = candidates.sort((a, b) => score(b) - score(a));

    const result = [];
    const seenTexts = new Set();
    const seenTops = [];

    for (const el of sorted) {
      const text = (el.innerText || '').trim().substring(0, 80);
      // 文本去重
      if (seenTexts.has(text)) continue;
      // 位置去重（top不重复）
      const top = Math.round(el.getBoundingClientRect().top);
      let topDup = false;
      for (const t of seenTops) { if (Math.abs(t - top) < 30) { topDup = true; break; } }
      if (topDup) continue;
      // 检查是否被已选元素包含
      let isContained = false;
      for (const existing of result) {
        if (existing.contains(el) || el.contains(existing)) { isContained = true; break; }
      }
      if (isContained) continue;

      result.push(el);
      seenTexts.add(text);
      seenTops.push(top);
    }
    // 按top排序
    result.sort((a, b) => Math.round(a.getBoundingClientRect().top) - Math.round(b.getBoundingClientRect().top));
    return result;
  }

  /** ★ 核心：获取当前页岗位卡片列表（三层策略） */
  function getJobCards() {
    let cards = [];

    // 第1层：固定选择器（优先左侧列表容器内查找）
    const containerCandidates = [
      '.job-list-box', '.job-list-container', '.search-job-result',
      '.job-list', '.search-result-list', '.job-recommend-list',
    ];
    let container = null;
    for (const sel of containerCandidates) {
      const el = document.querySelector(sel);
      if (el && el.getBoundingClientRect().width > 100) { container = el; break; }
    }

    const cardSelectors = [
      '.job-card-wrapper', '.job-card-body', '.job-primary', '.job-info',
      '.job-card', '[ka^="search_list_"]', 'li[ka^="search_list_"]',
    ];
    const root = container || document;
    for (const sel of cardSelectors) {
      const nodes = root.querySelectorAll(sel);
      if (nodes.length >= 2) {
        cards = Array.from(nodes).filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && r.left < window.innerWidth * 0.6;
        });
        if (cards.length >= 2) break;
      }
    }

    // 第2层：文本特征反推
    if (cards.length < 2) {
      const allDivs = document.querySelectorAll('div, li, a');
      const candidates = [];
      for (const el of allDivs) {
        if (isLikelyJobCard(el)) candidates.push(el);
      }
      cards = deduplicateCards(candidates);
    }

    // 第3层：左侧区域启发式（宽高范围）
    if (cards.length < 2) {
      const allElems = document.querySelectorAll('div, li');
      const candidates = [];
      for (const el of allElems) {
        try {
          const r = el.getBoundingClientRect();
          if (r.width < 280 || r.width > 750) continue;
          if (r.height < 70 || r.height > 300) continue;
          if (r.left > window.innerWidth * 0.5) continue;
          const text = (el.innerText || '').trim();
          if (text.length < 30 || text.length > 600) continue;
          candidates.push(el);
        } catch (e) {}
      }
      // 按top聚合并去重
      candidates.sort((a, b) => Math.round(a.getBoundingClientRect().top) - Math.round(b.getBoundingClientRect().top));
      const merged = [];
      let lastTop = -100;
      for (const el of candidates) {
        const top = Math.round(el.getBoundingClientRect().top);
        if (top - lastTop > 30) {
          merged.push(el);
          lastTop = top;
        }
      }
      if (merged.length >= 2) cards = merged;
    }

    return cards;
  }

  /** 卡片的可点击父级 */
  function getClickableCardElement(el) {
    if (!el) return null;
    const parents = ['.job-card-wrapper', '.job-card-body', '.job-card', 'li'];
    for (const s of parents) {
      const p = el.closest(s);
      if (p && p.getBoundingClientRect().width > 0) return p;
    }
    return el.closest('li') || el;
  }

  /** 可视化高亮卡片（红橙绿交替） */
  function highlightCards(cards) {
    const colors = ['#F56C6C', '#E6A23C', '#67C23A', '#409EFF', '#909399'];
    cards.forEach((card, i) => {
      try {
        const color = colors[i % colors.length];
        card.style.outline = `3px solid ${color}`;
        card.setAttribute('data-ai-highlight', '1');
        setTimeout(() => {
          try {
            if (card.getAttribute('data-ai-highlight') === '1') {
              card.style.outline = '';
              card.removeAttribute('data-ai-highlight');
            }
          } catch(e){}
        }, 2500);
      } catch(e){}
    });
  }

  /** 诊断岗位卡片 — 输出DOM结构到面板日志 */
  function diagnoseJobCards() {
    addLog('========== DOM诊断开始 ==========');
    addLog('当前URL: ' + window.location.href);
    addLog('body前500字: ' + (document.body.innerText || '').substring(0, 500).replace(/\n/g, ' / '));

    const testSelectors = [
      '.job-card-wrapper', '.job-card-body', '.job-card', '.job-list-box',
      '.job-list-container', '.search-job-result', '.job-primary', '.job-info',
      '.job-name', '.job-title', '[class*="job"]', '[class*="card"]',
      '[class*="list"]', 'li', 'a',
    ];

    addLog('--- 候选选择器匹配情况 ---');
    for (const sel of testSelectors) {
      try {
        const nodes = document.querySelectorAll(sel);
        const visibleNodes = Array.from(nodes).filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        });
        addLog(`${sel}: 共${nodes.length}个, 可见${visibleNodes.length}个`);
        // 输出前3个可见元素的详情
        for (let i = 0; i < Math.min(3, visibleNodes.length); i++) {
          const el = visibleNodes[i];
          const r = el.getBoundingClientRect();
          const text = (el.innerText || '').trim().substring(0, 100).replace(/\n/g, ' ');
          addLog(`  [${i+1}] <${el.tagName.toLowerCase()}> class="${(el.className || '').toString().substring(0, 50)}" rect(left=${Math.round(r.left)} top=${Math.round(r.top)} w=${Math.round(r.width)} h=${Math.round(r.height)}) text="${text}"`);
        }
      } catch (e) { addLog(`${sel}: 错误 - ${e.message}`); }
    }

    addLog('--- 第2层文本特征扫描 ---');
    try {
      const allDivs = document.querySelectorAll('div, li, a');
      const candidates = [];
      for (const el of allDivs) {
        if (isLikelyJobCard(el)) candidates.push(el);
      }
      addLog(`isLikelyJobCard 匹配: ${candidates.length} 个`);
      const deduped = deduplicateCards(candidates);
      addLog(`去重后: ${deduped.length} 个`);
      for (let i = 0; i < Math.min(5, deduped.length); i++) {
        const r = deduped[i].getBoundingClientRect();
        addLog(`  [卡片${i+1}] top=${Math.round(r.top)} h=${Math.round(r.height)} text="${(deduped[i].innerText||'').trim().substring(0, 80).replace(/\n/g,' ')}"`);
      }
    } catch(e) { addLog('第2层扫描错误: ' + e.message); }

    addLog('--- 第3层左侧区域扫描 ---');
    try {
      const allElems = document.querySelectorAll('div, li');
      const candidates = [];
      for (const el of allElems) {
        const r = el.getBoundingClientRect();
        if (r.width >= 280 && r.width <= 750 && r.height >= 70 && r.height <= 300 && r.left < window.innerWidth * 0.5) {
          const text = (el.innerText || '').trim();
          if (text.length >= 30 && text.length <= 600) candidates.push(el);
        }
      }
      addLog(`左侧区域匹配: ${candidates.length} 个`);
      const byTop = [...candidates].sort((a,b) => Math.round(a.getBoundingClientRect().top) - Math.round(b.getBoundingClientRect().top));
      for (let i = 0; i < Math.min(5, byTop.length); i++) {
        const r = byTop[i].getBoundingClientRect();
        addLog(`  [elem${i+1}] top=${Math.round(r.top)} w=${Math.round(r.width)} h=${Math.round(r.height)} text="${(byTop[i].innerText||'').trim().substring(0, 80).replace(/\n/g,' ')}"`);
      }
    } catch(e) { addLog('第3层扫描错误: ' + e.message); }

    // 最终getJobCards结果
    const final = getJobCards();
    addLog(`--- 最终 getJobCards() = ${final.length} 个 ---`);
    highlightCards(final);
    for (let i = 0; i < Math.min(5, final.length); i++) {
      try {
        addLog(`  卡片${i+1}: "${(final[i].innerText||'').trim().substring(0, 80).replace(/\n/g, ' ')}"`);
      } catch(e){}
    }
    addLog('========== DOM诊断完成 ==========');
  }

  /** 将卡片滚动到可见区域中间 */
  function scrollCardIntoView(card) {
    try {
      if (card && typeof card.scrollIntoView === 'function') {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } catch (e) {
      try { card && card.scrollIntoView(false); } catch(e2){}
    }
  }

  /** 模拟真实鼠标点击（不依赖PointerEvent，兼容所有环境） */
  function realClick(element) {
    if (!element) return false;
    try {
      const rect = element.getBoundingClientRect();
      const x = rect.left + rect.width * 0.35;
      const y = rect.top + rect.height * 0.35;
      const opts = { bubbles: true, cancelable: true, clientX: x, clientY: y, view: window };

      try { element.focus(); } catch (e) {}

      // PointerEvent（现代浏览器）
      if (typeof PointerEvent !== 'undefined') {
        try { element.dispatchEvent(new PointerEvent('pointerdown', opts)); } catch (e) {}
        try { element.dispatchEvent(new PointerEvent('pointerup', opts)); } catch (e) {}
      }

      // MouseEvent（所有浏览器都支持）
      try { element.dispatchEvent(new MouseEvent('mousedown', opts)); } catch (e) {}
      try { element.dispatchEvent(new MouseEvent('mouseup', opts)); } catch (e) {}
      try { element.dispatchEvent(new MouseEvent('click', opts)); } catch (e) {}

      // 原生 click
      try { element.click(); } catch (e) {}

      // 点击卡片内部标题链接
      try {
        const inner = element.querySelector('.job-name a, .job-title a, .name a, a');
        if (inner && inner !== element) { inner.click(); }
      } catch (e) {}
    } catch (e) {
      console.error('[realClick]', e);
    }
    return true;
  }

  // ============================================================
  //  二、详情变化检测
  // ============================================================

  /** 获取右侧岗位详情纯文本（用于判断是否切换） */
  function getDetailText() {
    const candidateSelectors = [
      '.job-detail', '.job-detail-box', '.job-detail-container',
      '.job-sec-text', '.job-detail-section', '.detail-content',
      '.job-detail-wrap', '.detail-box',
    ];
    for (const sel of candidateSelectors) {
      const el = document.querySelector(sel);
      if (el && el.getBoundingClientRect().width > 0) {
        return (el.textContent || '').replace(/\s+/g, ' ').trim().substring(0, 3000);
      }
    }
    const panel = findDetailPanel();
    if (panel) return (panel.textContent || '').replace(/\s+/g, ' ').trim().substring(0, 3000);
    return (document.body.innerText || '').substring(0, 3000);
  }

  /** 轮询等待右侧详情文本变化 */
  function waitDetailChanged(previousText, timeoutMs) {
    timeoutMs = timeoutMs || 8000;
    const startTime = Date.now();
    return new Promise((resolve) => {
      function check() {
        const current = getDetailText();
        const changed = current.length > 100 && current !== previousText;
        if (changed) { resolve(true); return; }
        if (Date.now() - startTime > timeoutMs) { resolve(false); return; }
        setTimeout(check, 300);
      }
      check();
    });
  }

  /** 获取右侧详情面板顶部真实岗位标题（排除"职位描述"等） */
  function getCurrentDetailTitle() {
    const BLACKLIST = ['职位描述', '职位要求', '岗位职责', '任职要求', '工作职责', '岗位要求', '岗位描述', '职位详情'];
    const panel = findDetailPanel();
    const root = (panel && panel.getBoundingClientRect().width > 0) ? panel : document;

    const selector = 'h1, h2, .job-title, .job-name, .name, [class*="title"], [class*="name"]';
    const candidates = root.querySelectorAll(selector);
    for (const el of candidates) {
      const t = (el.textContent || '').trim().replace(/\s+/g, ' ');
      if (!t) continue;
      if (BLACKLIST.includes(t)) continue;
      if (t.length < 2 || t.length > 50) continue;
      return t;
    }
    return '';
  }

  // ============================================================
  //  三、工具函数
  // ============================================================

  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

  function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash |= 0; }
    return Math.abs(hash).toString(16);
  }

  function makeJobUniqueKey(title, company, salary, location, desc) {
    return simpleHash((title || '') + (company || '') + (salary || '') + (location || '') + (desc || '').substring(0, 200));
  }

  async function randomSleep() {
    const min = Math.max(scanState.minDelay, 1) * 1000;
    const max = Math.max(scanState.maxDelay, scanState.minDelay + 1) * 1000;
    const ms = Math.floor(Math.random() * (max - min + 1)) + min;
    addScanLog(`随机等待 ${(ms / 1000).toFixed(1)} 秒...`);
    return interruptibleSleep(ms, 'randomSleep');
  }

  async function resumeScanFromProgress() {
    if (scanState.status !== 'paused') return;
    scanState.pauseRequested = false;
    scanState.stopRequested = false;
    scanState.status = 'running';
    scanState.controlVersion++;
    addLog('=== 从暂停处继续扫描 ===');
    document.getElementById('ai-btn-scan-pause').disabled = false;
    document.getElementById('ai-btn-scan-continue').disabled = true;
    document.getElementById('ai-btn-scan-stop').disabled = false;
    await autoScanStart();
  }

  // ============================================================
  //  暂停/停止控制（立即中断 + AbortController）
  // ============================================================

  function checkControlSignal(stepName) {
    if (scanState.stopRequested) {
      throw new Error('__SCAN_STOPPED__');
    }
    if (scanState.pauseRequested) {
      scanState.pausedAtStep = stepName || '未知';
      throw new Error('__SCAN_PAUSED__');
    }
  }

  async function interruptibleSleep(ms, stepName) {
    const interval = 100;
    const ver = scanState.controlVersion;
    for (let elapsed = 0; elapsed < ms; elapsed += interval) {
      if (scanState.controlVersion !== ver) {
        checkControlSignal(stepName || 'sleep');
      }
      await new Promise((r) => setTimeout(r, Math.min(interval, ms - elapsed)));
    }
  }

  function requestPauseScan() {
    if (scanState.status !== 'running') return;
    scanState.pauseRequested = true;
    scanState.status = 'paused';
    scanState.controlVersion++;
    if (scanState.activeAbortController) {
      try { scanState.activeAbortController.abort(); } catch(e){}
      scanState.activeAbortController = null;
    }
    try {
      saveScanProgress(scanState.pageKey, { currentIndex: scanState.currentIndex, seenKeys: Array.from(scanState.seenKeys) });
    } catch(e){}
    addLog('已请求立即暂停：当前请求已中断，扫描进度已保存');
    updateScanStatus();
    document.getElementById('ai-btn-scan-pause').disabled = true;
    document.getElementById('ai-btn-scan-continue').disabled = false;
  }

  function requestStopScan() {
    scanState.stopRequested = true;
    scanState.pauseRequested = false;
    scanState.status = 'stopped';
    scanState.controlVersion++;
    if (scanState.activeAbortController) {
      try { scanState.activeAbortController.abort(); } catch(e){}
      scanState.activeAbortController = null;
    }
    try {
      saveScanProgress(scanState.pageKey, { currentIndex: scanState.currentIndex, seenKeys: Array.from(scanState.seenKeys) });
    } catch(e){}
    addLog('已请求立即停止：当前请求已中断，扫描进度已保存');
    updateScanStatus();
    setScanBtns('done');
  }

  async function sendJobForScan(jobInfo, cardIndex) {
    checkControlSignal('before sendJobForScan');
    addScanLog('已发送AI分析...');

    // 优先用内存缓存，避免 chrome.storage API 因扩展重载抛 Extension context invalidated
    let resumeId = currentResume?.id || null;
    if (!resumeId) {
      try {
        const storage = await chrome.storage.local.get(['resumeId']);
        resumeId = storage.resumeId || null;
      } catch (e) {
        // chrome.storage 不可用（扩展已重载），回退到 localStorage
        try {
          const cached = localStorage.getItem('ai_resume_id');
          resumeId = cached ? parseInt(cached) : null;
        } catch (_) { resumeId = null; }
      }
    }
    // 缓存到 localStorage 和 currentResume 供后续使用
    if (resumeId && !currentResume?.id) {
      try { localStorage.setItem('ai_resume_id', String(resumeId)); } catch (_) {}
    }

    const controller = new AbortController();
    scanState.activeAbortController = controller;

    try {
      const response = await fetch(API_BASE + '/plugin/job-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resume_id: resumeId,
          job_title: jobInfo.jobTitle,
          company: jobInfo.company || null,
          salary: jobInfo.salary || null,
          location: jobInfo.location || null,
          job_url: jobInfo.jobUrl,
          job_description: jobInfo.jobDescription,
          captured_page_url: window.location.href,
          card_index: cardIndex,
          job_unique_key: jobInfo._uniqueKey,
          scan_session_id: scanState.sessionId,
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (e) {
      if (e.name === 'AbortError') {
        addLog('AI分析请求已被中断');
        checkControlSignal('after abort');
      }
      throw e;
    } finally {
      if (scanState.activeAbortController === controller) {
        scanState.activeAbortController = null;
      }
    }
  }

  /** 暂停/停止时使用 interruptibleSleep 替代 sleep */
  function safeSleep(ms, step) {
    return interruptibleSleep(ms, step);
  }

  /** 自动沟通 */
  // ============================================================
  //  通信安全 — 校验岗位 + 弹窗处理
  // ============================================================

  function normalizeText(s) {
    return (s || '').replace(/[\s\u3000]+/g, '').replace(/[()（）\-—·•,，.。/、\[\]【】「」『』]/g, '').toLowerCase();
  }

  function fuzzyIncludes(text, keyword) {
    if (!keyword || !text) return false;
    const nt = normalizeText(text);
    const nk = normalizeText(keyword);
    if (!nk || !nt) return false;
    // 完全包含
    if (nt.includes(nk)) return true;
    // 中文截断匹配：取keyword前4-8个连续中文字符
    if (/[\u4e00-\u9fff]/.test(nk)) {
      for (let len = Math.min(nk.length, 8); len >= 3; len--) {
        const sub = nk.substring(0, len);
        if (sub.length >= 3 && nt.includes(sub)) return true;
      }
    }
    // 英文至少3字符匹配
    if (nk.length >= 3) {
      const short = nk.substring(0, Math.min(nk.length, 10));
      if (nt.includes(short)) return true;
    }
    return false;
  }

  function companyMatch(cardText, company) {
    if (!company || !cardText) return false;
    const nc = normalizeText(company);
    const nt = normalizeText(cardText);
    if (!nc) return false;
    // 完全包含
    if (nt.includes(nc)) return true;
    // 去后缀匹配
    const suffixes = ['有限公司','科技有限公司','技术有限公司','信息技术有限公司','网络技术有限公司','科技有限公司','股份有限公司','有限责任公司','公司'];
    let short = nc;
    for (const s of suffixes) {
      if (short.endsWith(s)) { short = short.slice(0, -s.length); break; }
    }
    if (short.length >= 2 && nt.includes(short)) return true;
    // 关键词至少2个中文字
    if (short.length >= 4 && nt.includes(short.substring(0, 4))) return true;
    return false;
  }

  function salaryMatch(cardText, salary) {
    if (!salary || !cardText) return false;
    const ns = salary.replace(/[\s~～－-]/g, '').replace(/[元天日\/月年]/g, '');
    const nc = normalizeText(cardText);
    return nc.includes(ns) || (ns.length >= 3 && nc.includes(ns.substring(0, ns.length - 1)));
  }

  function locationMatch(cardText, location) {
    if (!location || !cardText) return false;
    // 取城市名
    const cities = location.split(/[·,\s，、]/);
    for (const c of cities) {
      if (c.length >= 2 && normalizeText(cardText).includes(normalizeText(c))) return true;
    }
    return false;
  }

  /** 判断卡片文本是否匹配结果（宽松版） */
  function isCardMatchResult(card, result) {
    const text = (card.innerText || '');
    const title = result.job_title || result.jobTitle;
    const company = result.company;
    const salary = result.salary;
    const location = result.location;

    const tMatch = fuzzyIncludes(text, title);
    const cMatch = companyMatch(text, company);
    const sMatch = salaryMatch(text, salary);
    const lMatch = locationMatch(text, location);

    // 任意两组命中即匹配
    let hits = 0;
    if (tMatch) hits++;
    if (cMatch) hits++;
    if (sMatch) hits++;
    if (lMatch) hits++;
    if ((tMatch || cMatch) && hits >= 1) hits++; // 标题或公司命中一个即可

    console.log(`[匹配] card="${text.substring(0, 50).replace(/\n/g,' ')}" | title=${tMatch} company=${cMatch} salary=${sMatch} location=${lMatch} hits=${hits}`);
    return hits >= 2;
  }

  /** 判断右侧岗位与目标是否一致 */
  function isSameJob(currentJob, result) {
    let matchCount = 0;
    if (fuzzyIncludes(currentJob.jobTitle, result.job_title || result.jobTitle)) matchCount++;
    if (companyMatch(currentJob.company || '', result.company)) matchCount++;
    if (result.salary && salaryMatch(currentJob.salary || '', result.salary)) matchCount++;
    if (result.location && locationMatch(currentJob.location || '', result.location)) matchCount++;
    if (currentJob.jobDescription && (result.job_description || result.jobDescription)) {
      const curJD = normalizeText(currentJob.jobDescription.substring(0, 100));
      const resJD = normalizeText((result.job_description || result.jobDescription).substring(0, 100));
      if (curJD.includes(resJD) || resJD.includes(curJD)) matchCount++;
    }
    return matchCount >= 2;
  }

  // ---- 滚动容器辅助 ----

  function getScrollTop(container) {
    if (container === document.scrollingElement || container === document.documentElement) return window.scrollY;
    return container.scrollTop || 0;
  }

  function scrollContainerTo(container, top) {
    if (container === document.scrollingElement || container === document.documentElement) {
      window.scrollTo({ top, behavior: 'smooth' });
    } else {
      container.scrollTo({ top, behavior: 'smooth' });
    }
  }

  function scrollContainerBy(container, distance) {
    if (container === document.scrollingElement || container === document.documentElement) {
      window.scrollBy({ top: distance, behavior: 'smooth' });
    } else {
      container.scrollBy({ top: distance, behavior: 'smooth' });
    }
  }

  function highlightOneCard(card) {
    try {
      card.style.outline = '4px solid #67C23A';
      card.setAttribute('data-ai-highlight', '1');
      setTimeout(() => {
        try { if (card.getAttribute('data-ai-highlight') === '1') { card.style.outline = ''; card.removeAttribute('data-ai-highlight'); } } catch(e){}
      }, 3000);
    } catch(e){}
  }

  /** 滚动查找目标岗位卡片 */
  async function searchJobCardByScrolling(result) {
    addLog(`开始滚动查找：${result.job_title || result.jobTitle} / ${result.company}`);
    const container = getScrollableJobListContainer() || document.scrollingElement || document.documentElement;

    // 先滚到顶部
    scrollContainerTo(container, 0);
    await sleep(800);

    const maxRounds = 30;
    let lastScrollTop = -1;
    let noMoveCount = 0;

    for (let round = 0; round < maxRounds; round++) {
      const cards = getJobCards();
      addLog(`滚动查找第${round+1}轮，可见卡片：${cards.length}个`);

      for (const card of cards) {
        if (isCardMatchResult(card, result)) {
          addLog('已找到匹配岗位卡片 ✓');
          highlightOneCard(card);
          return card;
        }
      }

      const before = getScrollTop(container);
      scrollContainerBy(container, Math.floor(window.innerHeight * 0.8));
      await sleep(700);
      const after = getScrollTop(container);

      if (Math.abs(after - before) < 5 || after === lastScrollTop) {
        noMoveCount++;
      } else {
        noMoveCount = 0;
      }
      lastScrollTop = after;

      if (noMoveCount >= 3) {
        addLog('已滚动到底部，仍未找到目标岗位');
        break;
      }
    }
    return null;
  }

  /** 根据result定位左侧岗位卡片（含滚动查找） */
  async function findJobCardForResult(result) {
    const cards = getJobCards();

    // 1. card_index 定位 + 校验
    const idx = result.card_index;
    if (Number.isInteger(idx) && idx >= 0 && idx < cards.length) {
      if (isCardMatchResult(cards[idx], result)) return cards[idx];
    }

    // 2. 当前可见卡片遍历
    for (const card of cards) {
      if (isCardMatchResult(card, result)) return card;
    }

    // 3. 滚动查找
    return await searchJobCardByScrolling(result);
  }

  /** 等待右侧详情切换到目标岗位 */
  async function waitDetailChangedByResult(result, timeoutMs) {
    timeoutMs = timeoutMs || 3000;
    const start = Date.now();
    // 先快速检查当前是否已经匹配
    try { const cur = await extractJobInfo(); if (isSameJob(cur, result)) return true; } catch(e){}
    while (Date.now() - start < timeoutMs) {
      try {
        const cur = await extractJobInfo();
        if (isSameJob(cur, result)) return true;
      } catch (e) {}
      await sleep(150);
    }
    return false;
  }

  // ============================================================
  //  弹窗识别 & 关闭（纯文本特征，不依赖class）
  // ============================================================

  function _norm(s) {
    return String(s || '').replace(/[\s\u3000]+/g, '').replace(/[【】\[\]()（）.,，。、:：;；!！?？\-—·•'""''""/\\]/g, '').toLowerCase();
  }

  function _isVis(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.closest('#ai-job-assistant-panel')) return false;
    try {
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return false;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
      return true;
    } catch(e) { return false; }
  }

  /** 不依赖class：纯文本特征识别弹窗 */
  function findBossSentPopup() {
    const all = Array.from(document.querySelectorAll('div, section, article, aside'));
    const candidates = all.filter(el => {
      if (!_isVis(el)) return false;
      const t = _norm(el.innerText || '');
      if (t.length < 40) return false;
      const r = el.getBoundingClientRect();
      // 排除过小/过大
      if (r.width < 200 || r.height < 100) return false;
      if (r.width > window.innerWidth * 0.98 || r.height > window.innerHeight * 0.98) return false;
      // 核心关键词
      const hasBoss = t.includes('已向boss发送消息') || t.includes('向boss发送');
      const hasStay = t.includes('留在此页');
      const hasContinue = t.includes('继续沟通');
      return hasBoss || (hasStay && hasContinue);
    });
    if (candidates.length === 0) return null;
    // 取面积最小的（弹窗本体，而非遮罩层）
    candidates.sort((a, b) => {
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      return (ra.width * ra.height) - (rb.width * rb.height);
    });
    return candidates[0];
  }

  /** 查找"留在此页"按钮（不限元素类型） */
  function findStayButton(popup) {
    if (!popup) return null;
    const els = popup.querySelectorAll('button, a, div, span, [role="button"]');
    for (const el of els) {
      if (!_isVis(el)) continue;
      const t = (el.innerText || '').trim();
      if (t.includes('留在此页') || t.includes('留在')) {
        // 排除"继续沟通"
        if (t.includes('继续沟通')) continue;
        return el;
      }
    }
    return null;
  }

  /** 查找弹窗关闭按钮（X图标） */
  function findPopupCloseButton(popup) {
    if (!popup) return null;
    // 右上角区域查找
    const r = popup.getBoundingClientRect();
    const all = popup.querySelectorAll('button, span, div, svg, i, [class*="close"], [class*="Close"], [aria-label*="close"], [aria-label*="关闭"]');
    for (const el of all) {
      if (!_isVis(el)) continue;
      const er = el.getBoundingClientRect();
      // X通常在弹窗右上角
      if (er.top < r.top + r.height * 0.3 && er.left > r.left + r.width * 0.7) return el;
    }
    // 兜底：文本×
    const allEls = popup.querySelectorAll('*');
    for (const el of allEls) {
      if ((el.innerText || '').trim() === '×' || (el.innerText || '').trim() === '✕') {
        if (_isVis(el)) return el;
      }
    }
    return null;
  }

  /** 坐标兜底：点击"留在此页"估算位置 */
  function clickPopupStayArea(popup) {
    const r = popup.getBoundingClientRect();
    // Boss弹窗底部两个按钮：左边"留在此页"，右边"继续沟通"
    // 点击偏左区域
    const x = r.left + r.width * 0.35;
    const y = r.top + r.height * 0.82;
    addLog(`坐标兜底点击留在此页区域 (${Math.round(x)}, ${Math.round(y)})`);
    try {
      const el = document.elementFromPoint(x, y);
      if (el) {
        addLog(`坐标命中元素: <${el.tagName.toLowerCase()}> "${(el.innerText||'').trim().substring(0, 40)}"`);
        el.click();
      }
    } catch(e) { addLog('坐标点击失败: ' + e.message); }
  }

  /** 关闭弹窗：留在此页 → X → 坐标兜底 */
  async function closeBossSentPopup() {
    const popup = findBossSentPopup();
    if (!popup) { return false; }

    addLog('检测到Boss发送成功弹窗');
    addLog(`弹窗文本: "${(popup.innerText||'').trim().substring(0, 120).replace(/\n/g,' ')}"`);

    // 1. 留在此页
    const stayBtn = findStayButton(popup);
    if (stayBtn) {
      addLog('找到"留在此页"按钮，点击');
      try { stayBtn.click(); } catch(e) { realClick(stayBtn); }
    } else {
      addLog('未找到"留在此页"按钮，使用坐标兜底点击');
      clickPopupStayArea(popup);
    }
    await sleep(800);

    if (!findBossSentPopup()) {
      addLog('弹窗已关闭 ✓');
      return true;
    }

    // 2. 仍存在：尝试X
    addLog('弹窗仍存在，尝试点击右上角关闭X');
    const closeBtn = findPopupCloseButton(popup);
    if (closeBtn) {
      try { closeBtn.click(); } catch(e) {}
      await sleep(800);
    }

    if (!findBossSentPopup()) {
      addLog('弹窗已通过X关闭 ✓');
      return true;
    }

    addLog('弹窗仍未关闭，请手动处理');
    return false;
  }

  /** 等待弹窗出现并关闭 */
  async function waitAndCloseBossPopupAfterClick(timeout) {
    timeout = timeout || 10000;
    addLog('等待Boss发送成功弹窗...');
    const start = Date.now();

    while (Date.now() - start < timeout) {
      const popup = findBossSentPopup();
      if (popup) {
        addLog('已捕捉到Boss发送成功弹窗');
        return await closeBossSentPopup();
      }
      await sleep(200);
    }

    addLog('超时未捕捉到Boss发送成功弹窗，开始诊断...');
    diagnoseBossPopup();
    return false;
  }

  /** 诊断弹窗 */
  function diagnoseBossPopup() {
    addLog('===== Boss弹窗诊断 =====');
    const keywords = ['已向', 'boss', '发送消息', '留在此页', '继续沟通', '招呼语', '面试机会'];
    const all = document.querySelectorAll('div, section, article, aside');
    const hits = [];
    for (const el of all) {
      if (!_isVis(el)) continue;
      const t = _norm(el.innerText || '');
      let score = 0;
      for (const kw of keywords) { if (t.includes(kw)) score++; }
      if (score > 0) {
        const r = el.getBoundingClientRect();
        hits.push({ el, r, score, text: (el.innerText||'').trim().substring(0, 100) });
      }
    }
    hits.sort((a, b) => b.score - a.score);
    addLog(`找到 ${hits.length} 个候选弹窗元素`);
    for (const h of hits.slice(0, 10)) {
      addLog(`[score=${h.score}] <${h.el.tagName.toLowerCase()}> class="${String(h.el.className||'').substring(0, 40)}" rect(${Math.round(h.r.left)},${Math.round(h.r.top)} ${Math.round(h.r.width)}x${Math.round(h.r.height)}) text="${h.text.replace(/\n/g,' ')}"`);
    }
    // 检查是否有遮罩
    const mask = document.querySelector('[class*="mask"], [class*="overlay"], [class*="backdrop"]');
    if (mask && _isVis(mask)) {
      addLog(`发现遮罩层: class="${String(mask.className||'').substring(0, 60)}"`);
    }
    addLog('===== 诊断完成 =====');
  }

  /** 沟通：清理残留 → 点击 → 等待弹窗 → 关闭 → 标记 */
  async function communicateVerifiedCurrentJob(result, options) {
    options = options || { source: 'manual' };
    try {
      addLog(`准备沟通：${result.job_title || result.jobTitle} / ${result.company}`);

      if (options.source === 'auto') {
        const delay = Math.floor(Math.random() * (scanState.maxDelay - scanState.minDelay + 1)) + scanState.minDelay;
        addLog(`自动沟通前随机等待 ${delay} 秒...`);
        await safeSleep(delay * 1000, 'pre communicate');
      }

      // ★ 步骤1：先清理残留弹窗
      const residual = findBossSentPopup();
      if (residual) {
        addLog('检测到残留弹窗，先关闭...');
        await closeBossSentPopup();
        await sleep(500);
        if (findBossSentPopup()) {
          addLog('残留弹窗无法关闭，禁止执行沟通');
          return false;
        }
      }

      // ★ 步骤2：点击立即沟通
      const chatBtn = findImmediateChatButton();
      if (!chatBtn) { addLog('未找到"立即沟通"按钮'); return false; }

      addLog('正在点击"立即沟通"');
      try { chatBtn.click(); } catch(e) { addLog('点击按钮失败'); return false; }

      // ★ 步骤3：等待弹窗 → 关闭弹窗
      const closed = await waitAndCloseBossPopupAfterClick(10000);

      // ★ 步骤4：只有弹窗确认关闭才标记
      if (closed) {
        try {
          await chrome.runtime.sendMessage({ action: 'markCommunicated', recordId: result.job_record_id });
          scanState.communicatedCount++;
          addLog('沟通成功，已通知后端');
          updateScanStatus();
          return true;
        } catch (e) {
          addLog('通知后端失败（沟通已成功）');
          scanState.communicatedCount++;
          return true;
        }
      } else {
        addLog('弹窗未确认关闭，本次沟通不标记为已沟通');
        return false;
      }
    } catch (e) {
      addLog('沟通异常：' + (e.message || e));
      return false;
    }
  }

  /** 快速轮询直到右侧详情匹配（1500ms / 100ms间隔） */
  async function quickWaitUntilSameJob(result, timeout) {
    timeout = timeout || 1500;
    const start = Date.now();
    while (Date.now() - start < timeout) {
      try {
        const cur = await extractJobInfo();
        if (isSameJob(cur, result)) return true;
      } catch(e){}
      await sleep(100);
    }
    return false;
  }

  /** 暂停自动筛选并保存进度（用于手动定位岗位） */
  async function pauseScanForManualCommunication() {
    if (scanState.status === 'running') {
      scanState.pauseRequested = true;
      scanState.status = 'paused';
      try {
        await saveScanProgress(scanState.pageKey, {
          currentIndex: scanState.currentIndex,
          seenKeys: Array.from(scanState.seenKeys),
        });
      } catch(e){}
      addLog('用户发起岗位定位，已暂停自动筛选，当前进度已保存');
      updateScanStatus();
      document.getElementById('ai-btn-scan-pause').disabled = true;
      document.getElementById('ai-btn-scan-continue').disabled = false;
    }
  }

  /** 定位岗位 — 只切换左侧卡片和右侧详情，不点击立即沟通 */
  async function locateJobForManualCommunication(result) {
    try {
      await pauseScanForManualCommunication();
      addLog(`准备定位岗位：${result.job_title || '--'} / ${result.company || '--'}`);

      const targetCard = await findJobCardForResult(result);
      if (!targetCard) {
        addLog('未找到对应岗位卡片，请点击"加载更多岗位"后重试，或手动在左侧列表查找');
        return false;
      }
      addLog('已找到目标岗位卡片');

      // 点击目标卡片
      highlightOneCard(targetCard);
      scrollCardIntoView(targetCard);
      await sleep(200);
      realClick(targetCard);
      await sleep(300);

      // 快速确认
      let curJob;
      try { curJob = await extractJobInfo(); } catch(e){}
      if (!isSameJob(curJob, result)) {
        addLog('右侧详情暂未匹配目标岗位，快速等待中(最多1.5s)...');
        const matched = await quickWaitUntilSameJob(result, 1500);
        if (!matched) {
          addLog('已尝试点击目标岗位，但无法确认右侧详情是否匹配，请人工确认后再沟通');
          return false;
        }
      }

      addLog('右侧详情已切换到目标岗位');
      addLog('请在 Boss 页面手动点击"立即沟通"');
      return true;

    } catch (e) {
      addLog('定位岗位失败：' + (e.message || e));
      return false;
    }
  }

  /** 自动沟通 */
  function checkHrStatusAllowed(hrStatus, hrStatusAllowed) {
    if (hrStatusAllowed === null || hrStatusAllowed === undefined) return true; // 不限制
    if (!hrStatus) return hrStatusAllowed.includes('未知'); // 无状态时看是否允许未知
    return hrStatusAllowed.includes(hrStatus);
  }

  async function maybeAutoCommunicate(result) {
    if (scanState.communicatedCount >= scanState.maxAutoCommunicateCount) {
      addLog(`已达沟通上限(${scanState.maxAutoCommunicateCount}个)，跳过`);
      return false;
    }
    return await communicateVerifiedCurrentJob(result, { source: 'auto' });
  }

  // ============================================================
  //  首个岗位 & 详情匹配辅助
  // ============================================================

  /** 从卡片提取基础信息（用于与右侧详情比对） */
  function extractCardBasicInfo(card) {
    if (!card) return { raw_text: '' };
    const text = (card.innerText || '').trim();
    return { raw_text: normalizeText(text) };
  }

  /** 判断当前右侧详情是否匹配这个左侧卡片 */
  function isCurrentDetailMatchesCard(card, currentJob) {
    if (!card || !currentJob) return false;
    const cinfo = extractCardBasicInfo(card);
    const nt = cinfo.raw_text;
    if (!nt) return false;
    let m = 0;
    if (currentJob.jobTitle && fuzzyIncludes(nt, currentJob.jobTitle)) m++;
    if (currentJob.company && companyMatch(nt, currentJob.company)) m++;
    if (currentJob.salary && salaryMatch(nt, currentJob.salary)) m++;
    if (currentJob.location && locationMatch(nt, currentJob.location)) m++;
    return m >= 2;
  }

  /** 复用处理流程：提取校验→去重→发送→推荐 */
  async function analyzeAndHandleJob(jobInfo, i, card) {
    // 校验 JD
    if (!jobInfo.jobDescription || jobInfo.jobDescription.length < 80) {
      scanState.failedCount++; scanState.currentIndex = i + 1; updateScanStatus();
      await saveScanProgress(scanState.pageKey, { currentIndex: i + 1, seenKeys: Array.from(scanState.seenKeys) });
      addLog(`JD过短(${jobInfo.jobDescription ? jobInfo.jobDescription.length : 0}字)，已保存进度`);
      return;
    }

    addLog(`提取成功：${jobInfo.jobTitle || '-'} / ${jobInfo.company || '-'}`);

    // 去重
    const uniqueKey = makeJobUniqueKey(jobInfo.jobTitle, jobInfo.company, jobInfo.salary, jobInfo.location, jobInfo.jobDescription);
    addLog(`唯一标识: ${uniqueKey.substring(0, 8)}...`);
    if (scanState.seenKeys.has(uniqueKey)) {
      scanState.currentIndex = i + 1;
      await saveScanProgress(scanState.pageKey, { currentIndex: i + 1, seenKeys: Array.from(scanState.seenKeys) });
      addLog('该岗位与之前重复，已保存进度');
      return;
    }
    scanState.seenKeys.add(uniqueKey);
    jobInfo._uniqueKey = uniqueKey;

    // 发送后端
    let result;
    try {
      result = await sendJobForScan(jobInfo, i);
    } catch (e) {
      // Extension context invalidated 不可恢复，不重试直接记录失败
      if (e.message && e.message.includes('context invalidated')) {
        scanState.failedCount++; scanState.currentIndex = i + 1; updateScanStatus();
        await saveScanProgress(scanState.pageKey, { currentIndex: i + 1, seenKeys: Array.from(scanState.seenKeys) });
        addLog('扩展上下文已失效（插件可能被重载），请求失败: ' + e.message + '。请刷新BOSS页面后重新开始。');
        return;
      }
      addLog('首次请求失败: ' + e.message + '，重试...');
      await sleep(1000);
      try {
        result = await sendJobForScan(jobInfo, i);
      } catch (e2) {
        scanState.failedCount++; scanState.currentIndex = i + 1; updateScanStatus();
        await saveScanProgress(scanState.pageKey, { currentIndex: i + 1, seenKeys: Array.from(scanState.seenKeys) });
        addLog('重试仍失败，已保存进度: ' + e2.message);
        return;
      }
    }

    scanState.analyzedCount++;
    const fullResult = {
      ...result,
      jobTitle: jobInfo.jobTitle,
      job_title: jobInfo.jobTitle,
      company: jobInfo.company,
      salary: jobInfo.salary,
      location: jobInfo.location,
      job_description: jobInfo.jobDescription,
      card_index: i,
      job_unique_key: jobInfo._uniqueKey,
      captured_page_url: window.location.href,
    };
    scanState.results.push(fullResult);
    scanState.currentIndex = i + 1;
    updateScanStatus();
    await saveScanProgress(scanState.pageKey, { currentIndex: i + 1, seenKeys: Array.from(scanState.seenKeys) });
    addLog('已保存进度，下次将从第' + (i + 2) + '个岗位继续');

    if (result.match_score >= scanState.threshold) {
      scanState.recommendedCount++;
      addLog(`匹配度 ${result.match_score} → 建议沟通`);
      let communicated = false;
      if (scanState.autoCommunicate && scanState.communicatedCount < scanState.maxAutoCommunicateCount) {
        // HR状态过滤
        const hrOk = checkHrStatusAllowed(result.hr_status, scanState.hrStatusAllowed);
        if (hrOk) {
          communicated = await maybeAutoCommunicate(fullResult);
        } else {
          const hrLabel = HR_REQUIREMENT_LABEL[scanState.hrRequirement] || scanState.hrRequirement;
          addLog(`匹配度达标，但HR状态【${result.hr_status || '未知'}】不满足当前自动沟通策略【${hrLabel}】，已跳过自动沟通`);
        }
      }
      try {
        addToRecommendedList(
          { job_title: jobInfo.jobTitle, company: jobInfo.company, match_score: result.match_score, job_record_id: result.job_record_id, salary: jobInfo.salary, location: jobInfo.location, job_description: jobInfo.jobDescription, card_index: i, job_unique_key: jobInfo._uniqueKey, hr_status: result.hr_status },
          communicated
        );
      } catch(e){}
    } else {
      addLog(`匹配度 ${result.match_score}，低于阈值 ${scanState.threshold}，跳过`);
    }
  }

  // ============================================================
  //  四、UI 辅助
  // ============================================================

  function updateScanStatus() {
    try {
      const set = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
      set('ai-scan-progress', `${scanState.currentIndex}/${scanState.totalCards}`);
      set('ai-scan-analyzed', scanState.analyzedCount);
      set('ai-scan-recommended', scanState.recommendedCount);
      set('ai-scan-communicated', scanState.communicatedCount);
      set('ai-scan-failed', scanState.failedCount);
    } catch (e) { console.error('[updateScanStatus]', e); }
  }

  /** 通用日志（最多保留300条，防止DOM无限增长） */
  function addLog(msg) {
    console.log('[AI求职助手]', msg);
    try {
      const logEl = document.getElementById('ai-scan-log');
      if (!logEl) return;
      // 超过300条时删除最旧的
      while (logEl.children.length >= 300) {
        logEl.removeChild(logEl.firstChild);
      }
      const time = new Date().toLocaleTimeString('zh-CN', { hour12: false });
      const entry = document.createElement('div');
      entry.className = 'ai-scan-log-entry';
      entry.textContent = `[${time}] ${msg}`;
      logEl.appendChild(entry);
      logEl.scrollTop = logEl.scrollHeight;
    } catch (e) {}
  }

  function addScanLog(msg) { addLog(msg); }

  function addToRecommendedList(result, communicated) {
    const listEl = document.getElementById('ai-scan-recommended-list');
    if (!listEl) return;
    const item = document.createElement('div');
    item.className = 'ai-scan-rec-item';
    const statusText = communicated ? '已沟通' : '建议沟通';
    const statusCls = communicated ? 'ai-scan-rec-comm' : 'ai-scan-rec-rec';
    const hrColor = getHrStatusColor(result.hr_status);
    item.innerHTML = `
      <div class="ai-scan-rec-info">
        <span class="ai-scan-rec-title">${escapeHtml(result.job_title || '-')}</span>
        <span class="ai-scan-rec-company">${escapeHtml(result.company || '-')}</span>
      </div>
      <div class="ai-scan-rec-score">
        ${result.hr_status ? `<span class="ai-scan-rec-hr" style="color:${hrColor}">${escapeHtml(result.hr_status)}</span>` : ''}
        <span class="ai-scan-rec-num">${result.match_score ?? '--'}</span>分
        <span class="ai-scan-rec-status ${statusCls}">${statusText}</span>
        ${!communicated ? `<button class="ai-scan-rec-btn" data-id="${result.job_record_id}">定位岗位</button>` : ''}
      </div>
    `;
    listEl.appendChild(item);
    if (!communicated) {
      const btn = item.querySelector('.ai-scan-rec-btn');
      if (btn) {
        btn.addEventListener('click', async () => {
          btn.disabled = true; btn.textContent = '定位中...';
          const ok = await locateJobForManualCommunication(result);
          if (ok) {
            btn.textContent = '已定位'; btn.className = 'ai-scan-rec-btn ai-scan-rec-done';
          } else {
            btn.disabled = false; btn.textContent = '重新定位';
          }
        });
      }
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function getHrStatusColor(status) {
    if (!status) return '#909399';
    if (['在线', '刚刚活跃', '今日活跃'].includes(status)) return '#67C23A';
    if (['3日内活跃', '本周活跃'].includes(status)) return '#E6A23C';
    if (['本月活跃'].includes(status)) return '#F56C6C'; // 橙色
    return '#F56C6C'; // 两月内活跃及以上 → 红色
  }

  // ============================================================
  //  五、核心主循环 — 开始自动筛选
  // ============================================================

  // ============================================================
  //  岗位加载 — 模拟下滑加载更多岗位卡片
  // ============================================================

  /** 获取 Boss 页面左侧可滚动岗位列表容器 */
  function getScrollableJobListContainer() {
    const candidates = [
      '.job-list-box', '.job-list-container', '.search-job-result',
      '.job-list', '[class*="job-list"]', '[class*="search-job"]',
    ];
    for (const sel of candidates) {
      try {
        const el = document.querySelector(sel);
        if (el && el.scrollHeight > el.clientHeight + 50) return el;
      } catch (e) {}
    }
    return null;
  }

  /** 模拟滚动一页距离 */
  async function simulateScrollOnePage() {
    const distance = Math.floor(window.innerHeight * 0.85);
    const container = getScrollableJobListContainer();
    if (container) {
      const before = container.scrollTop;
      container.scrollBy({ top: distance, behavior: 'smooth' });
      await sleep(600);
      const after = container.scrollTop;
      return Math.abs(after - before);
    } else {
      const before = window.scrollY;
      window.scrollBy({ top: distance, behavior: 'smooth' });
      await sleep(600);
      const after = window.scrollY;
      return Math.abs(after - before);
    }
  }

  /** 更新输入框上限约束 */
  function updateLimitInputs(maxCount) {
    loadState.maxAllowedCount = maxCount;
    const scanInput = document.getElementById('ai-scan-max-scan');
    const commInput = document.getElementById('ai-scan-max-comm');
    if (scanInput) {
      scanInput.max = maxCount;
      if (parseInt(scanInput.value) > maxCount || !parseInt(scanInput.value)) {
        scanInput.value = maxCount;
      }
    }
    if (commInput) {
      commInput.max = maxCount;
      if (parseInt(commInput.value) > maxCount || isNaN(parseInt(commInput.value))) {
        commInput.value = maxCount;
      }
    }
    // 同步 scanState
    scanState.maxScanCount = parseInt(scanInput?.value) || maxCount;
    scanState.maxAutoCommunicateCount = parseInt(commInput?.value) || maxCount;

    const countEl = document.getElementById('ai-load-count');
    if (countEl) countEl.textContent = maxCount;
  }

  /** 绑定输入框校验（超出上限自动修正） */
  function bindLimitInputValidation() {
    const scanInput = document.getElementById('ai-scan-max-scan');
    const commInput = document.getElementById('ai-scan-max-comm');
    const validate = (input) => {
      const max = loadState.maxAllowedCount || 500;
      let val = parseInt(input.value);
      if (isNaN(val) || val < 1) { val = max; input.value = val; }
      if (val > max) { input.value = max; addLog(`输入值超过当前岗位数量上限(${max})，已自动调整为${max}`); }
    };
    if (scanInput) { scanInput.addEventListener('change', () => validate(scanInput)); scanInput.addEventListener('blur', () => validate(scanInput)); }
    if (commInput) { commInput.addEventListener('change', () => validate(commInput)); commInput.addEventListener('blur', () => validate(commInput)); }
  }

  // 初始化时绑定一次
  setTimeout(bindLimitInputValidation, 2000);

  /** 更新加载状态UI */
  function updateLoadStatusUI() {
    try {
      document.getElementById('ai-load-count').textContent = loadState.loadedCardCount || '-';
      const map = { idle: '未开始', loading: '加载中...', stopped: '已停止', finished: '已完成' };
      document.getElementById('ai-load-status-text').textContent = map[loadState.status] || loadState.status;
    } catch (e) {}
  }

  function setLoadBtns(loading) {
    try {
      document.getElementById('ai-btn-load-more').disabled = loading;
      document.getElementById('ai-btn-load-stop').disabled = !loading;
      // 互斥：加载期间禁用开始筛选
      const startBtn = document.getElementById('ai-start-auto-scan');
      if (startBtn) startBtn.disabled = loading;
    } catch (e) {}
  }

  /** 加载完成后的收尾 */
  function finalizeLoadMoreJobs() {
    const count = getJobCards().length;
    loadState.status = loadState.stopRequested ? 'stopped' : 'finished';
    loadState.loadedCardCount = count;
    updateLimitInputs(count);
    updateLoadStatusUI();
    setLoadBtns(false);
    addLog(`当前检测到岗位卡片数量：${count}`);
    addLog(`当前允许的扫描上限为该卡片数量：${count}`);
    addLog(`当前允许的沟通上限为：${count}`);
    // 重新绑定校验（因为max已更新）
    bindLimitInputValidation();
  }

  /** 开始加载更多岗位 */
  async function startLoadMoreJobs() {
    if (loadState.status === 'loading') return;
    if (scanState.status === 'running') { addLog('自动筛选进行中，无法加载更多岗位'); return; }

    loadState.status = 'loading';
    loadState.stopRequested = false;
    loadState.noGrowthTimes = 0;
    loadState.scrollCount = 0;
    loadState.loadedCardCount = getJobCards().length;
    updateLoadStatusUI();
    setLoadBtns(true);

    addLog('开始加载更多岗位...');
    addLog(`初始岗位数：${loadState.loadedCardCount}`);

    let lastCount = loadState.loadedCardCount;
    let prevScrollPos = 0;

    while (!loadState.stopRequested) {
      // 记录滚动前位置
      const container = getScrollableJobListContainer();
      prevScrollPos = container ? container.scrollTop : window.scrollY;

      // 滚动一页
      const moved = await simulateScrollOnePage();
      loadState.scrollCount++;

      // 重新统计卡片
      const currentCount = getJobCards().length;
      addLog(`第${loadState.scrollCount}次下滑，当前岗位数：${currentCount}`);

      if (currentCount > lastCount) {
        addLog(`新增${currentCount - lastCount}个岗位`);
        loadState.noGrowthTimes = 0;
        lastCount = currentCount;
        loadState.loadedCardCount = currentCount;
        updateLoadStatusUI();
      } else {
        loadState.noGrowthTimes++;
      }

      // 连续5次不增长 → 到底
      if (loadState.noGrowthTimes >= 5) {
        addLog('岗位数量连续5次未增长，停止加载');
        break;
      }

      // 滚动位置不再变化 → 到底
      const afterPos = container ? container.scrollTop : window.scrollY;
      if (moved < 10 && loadState.noGrowthTimes >= 2) {
        addLog('页面无法继续下滑，停止加载');
        break;
      }

      // 全局上限保护
      if (currentCount >= 500) {
        addLog('已达到全局上限500个岗位，停止加载');
        break;
      }
    }

    finalizeLoadMoreJobs();
  }

  /** 停止加载更多岗位 */
  function stopLoadMoreJobs() {
    loadState.stopRequested = true;
    loadState.status = 'stopped';
    updateLoadStatusUI();
    setLoadBtns(false);
    addLog('用户已请求停止加载');
  }

  // ============================================================
  //  扫描进度持久化（chrome.storage.local 降级 localStorage）
  // ============================================================

  async function storageGet(key) {
    try {
      const result = await chrome.storage.local.get(key);
      return result[key] || null;
    } catch (e) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      } catch (e2) { return null; }
    }
  }

  async function storageSet(key, value) {
    try {
      await chrome.storage.local.set({ [key]: value });
    } catch (e) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e2) {}
    }
  }

  async function storageRemove(key) {
    try { await chrome.storage.local.remove(key); } catch (e) {
      try { localStorage.removeItem(key); } catch (e2) {}
    }
  }

  function normalizePageUrl(url) {
    try {
      const u = new URL(url);
      // 保留关键参数，去除时间戳等
      const keep = ['query', 'city', 'salary', 'experience', 'degree', 'scale', 'stage', 'industry'];
      const params = new URLSearchParams();
      for (const k of keep) {
        const v = u.searchParams.get(k);
        if (v) params.set(k, v);
      }
      return u.origin + u.pathname + (params.toString() ? '?' + params.toString() : '');
    } catch (e) {
      return url;
    }
  }

  async function loadScanProgress(pageKey) {
    const key = 'scan_progress_' + pageKey;
    return await storageGet(key) || { currentIndex: 0, seenKeys: [], updatedAt: null };
  }

  async function saveScanProgress(pageKey, progress) {
    const key = 'scan_progress_' + pageKey;
    await storageSet(key, { ...progress, updatedAt: new Date().toISOString() });
  }

  async function resetScanProgress(pageKey) {
    const key = 'scan_progress_' + pageKey;
    await storageRemove(key);
    scanState.currentIndex = 0;
    scanState.seenKeys = new Set();
    scanState.pageDone = false;
    addLog('当前页面扫描进度已重置');
  }

  // ============================================================
  //  autoScanStart — 带进度持久化
  // ============================================================

  async function autoScanStart() {
    try {
      addLog('=== 准备启动自动筛选 ===');

      // 计算页面Key
      scanState.pageKey = normalizePageUrl(window.location.href);
      addLog('当前页面Key：' + scanState.pageKey.substring(0, 60));

      // 读取历史进度
      const progress = await loadScanProgress(scanState.pageKey);
      addLog('历史扫描进度：currentIndex = ' + progress.currentIndex);

      // 检查 resumeFromLast（默认勾选，用户可取消）
      scanState.resumeFromLast = document.getElementById('ai-scan-resume-check')?.checked !== false;

      if (progress.currentIndex > 0 && scanState.resumeFromLast) {
        // 检查是否本页已扫描完
        const cards = getJobCards();
        if (cards.length > 0 && progress.currentIndex >= cards.length) {
          addLog(`本页已扫描完成（${progress.currentIndex}/${cards.length}），如需重新扫描请点击"重置扫描进度"`);
          scanState.pageDone = true;
          setScanBtns('done');
          return;
        }
        if (cards.length > 0 && progress.currentIndex >= scanState.maxScanCount) {
          addLog(`已达到扫描上限（${scanState.maxScanCount}），如需重新扫描请点击"重置扫描进度"`);
          scanState.pageDone = true;
          setScanBtns('done');
          return;
        }
        scanState.currentIndex = progress.currentIndex;
        scanState.seenKeys = new Set(progress.seenKeys || []);
        addLog(`从历史进度恢复，将从第 ${scanState.currentIndex + 1} 个岗位继续`);
      } else {
        scanState.currentIndex = 0;
        scanState.seenKeys = new Set();
        scanState.pageDone = false;
        addLog('从第 1 个岗位开始扫描');
      }

      // 读取配置
      scanState.threshold = parseInt(document.getElementById('ai-scan-threshold')?.value) || 85;

      // 扫描上限：1-500，<=0无效则用默认20
      let maxScanVal = parseInt(document.getElementById('ai-scan-max-scan')?.value);
      if (!maxScanVal || maxScanVal <= 0) { maxScanVal = 20; addLog('扫描上限输入无效(<=0)，已使用默认值20'); }
      scanState.maxScanCount = Math.min(maxScanVal, 500);

      // 沟通上限：0-150，<=0无效则用默认3（0=合法，负数无效）
      let maxCommVal = parseInt(document.getElementById('ai-scan-max-comm')?.value);
      if (isNaN(maxCommVal) || maxCommVal < 0) { maxCommVal = 3; addLog('沟通上限输入无效(<0)，已使用默认值3'); }
      scanState.maxAutoCommunicateCount = Math.min(maxCommVal, 150);

      scanState.autoCommunicate = document.getElementById('ai-scan-auto-comm')?.checked || false;
      scanState.hrRequirement = document.getElementById('ai-scan-hr-req')?.value || '3days';
      scanState.hrStatusAllowed = HR_REQUIREMENT_MAP[scanState.hrRequirement] || null;
      scanState.sessionId = 'scan_' + Date.now().toString(36);

      scanState.status = 'running';
      scanState.analyzedCount = 0;
      scanState.recommendedCount = 0;
      scanState.communicatedCount = 0;
      scanState.failedCount = 0;
      scanState.results = [];
      scanState.stopRequested = false;
      scanState.pauseRequested = false;

      // 显示UI
      try {
        const statusEl = document.getElementById('ai-scan-status');
        if (statusEl) statusEl.style.display = 'block';
        const logEl = document.getElementById('ai-scan-log');
        if (logEl) logEl.innerHTML = '';
        const listEl = document.getElementById('ai-scan-recommended-list');
        if (listEl) listEl.innerHTML = '';
        updateScanStatus();
        setScanBtns('start');
      } catch (e) {
        console.error('[autoScanStart] UI初始化失败:', e);
      }

      // 获取岗位卡片
      let cards = [];
      try {
        cards = getJobCards();
        addLog('检测到岗位卡片数量：' + cards.length);
      } catch (e) {
        addLog('获取岗位卡片出错：' + e.message);
      }

      if (!cards || cards.length === 0) {
        addLog('未找到岗位卡片，自动执行DOM诊断...');
        diagnoseJobCards();
        addLog('未识别到岗位卡片，已输出DOM诊断信息，请把诊断日志发给开发者调整选择器');
        scanState.status = 'idle';
        setScanBtns('done');
        return;
      }

      // ★ 根据实际卡片数量动态限制扫描/沟通上限
      if (scanState.maxScanCount > cards.length) {
        addLog(`扫描上限(${scanState.maxScanCount})超过当前岗位数(${cards.length})，已自动调整为${cards.length}`);
        scanState.maxScanCount = cards.length;
        try { document.getElementById('ai-scan-max-scan').value = cards.length; } catch(e){}
      }
      if (scanState.maxAutoCommunicateCount > cards.length) {
        addLog(`沟通上限(${scanState.maxAutoCommunicateCount})超过当前岗位数(${cards.length})，已自动调整为${cards.length}`);
        scanState.maxAutoCommunicateCount = cards.length;
        try { document.getElementById('ai-scan-max-comm').value = cards.length; } catch(e){}
      }

      addLog(`识别到岗位卡片数量：${cards.length}`);
      for (let i = 0; i < Math.min(3, cards.length); i++) {
        try {
          addLog(`  第${i+1}个卡片: "${(cards[i].innerText||'').trim().substring(0, 60).replace(/\n/g,' ')}"`);
        } catch(e){}
      }

      // 可视化高亮
      highlightCards(cards);
      addLog('已在左侧岗位卡片上标记彩色边框（持续2.5秒），请肉眼确认');

      scanState.totalCards = Math.min(cards.length, scanState.maxScanCount);
      addLog(`本次最多扫描 ${scanState.totalCards} 个`);
      addLog(`匹配阈值: ${scanState.threshold}分 | 自动沟通: ${scanState.autoCommunicate ? '开启' : '关闭'}`);

      // ---- 主循环 ----
      const startIdx = scanState.currentIndex;
      addLog(`本次从第 ${startIdx + 1} 个岗位开始`);

      let scanError = null;
      try {
      for (let i = startIdx; i < scanState.totalCards; i++) {
        checkControlSignal('loop start');

        while (scanState.pauseRequested && !scanState.stopRequested) {
          scanState.status = 'paused';
          await interruptibleSleep(500, 'pause wait');
        }
        checkControlSignal('after pause check');
        scanState.status = 'running';

        // 重新获取卡片列表
        cards = getJobCards();
        if (cards.length === 0) { addLog('未找到岗位卡片，停止'); break; }

        // ★ 自动滚动加载更多岗位
        if (i >= cards.length) {
          addLog(`当前可见卡片${cards.length}个，已耗尽，尝试下滑加载更多...`);
          const beforeCount = cards.length;
          scanState.scrollCount++;
          // 滚动到底部
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
          await sleep(2500);
          // 也尝试滚动左侧列表容器
          const listContainer = document.querySelector('.job-list-box, .job-list-container, .search-job-result, .job-list');
          if (listContainer) {
            listContainer.scrollTo({ top: listContainer.scrollHeight, behavior: 'smooth' });
            await sleep(1500);
          }
          cards = getJobCards();
          addLog(`滚动后可见卡片：${cards.length}个（滚动前${beforeCount}个）`);
          if (cards.length > beforeCount) {
            addLog(`新加载了${cards.length - beforeCount}个卡片，更新扫描上限`);
            scanState.totalCards = Math.min(cards.length, scanState.maxScanCount);
          } else if (i >= cards.length) {
            addLog('下滑后仍无新卡片，已扫描当前页面所有岗位');
            scanState.pageDone = true;
            break;
          }
        }

        const rawCard = cards[i];
        const card = getClickableCardElement(rawCard);
        if (!card) {
          scanState.failedCount++; scanState.currentIndex = i + 1; updateScanStatus();
          // ★ 即使跳过也保存进度
          await saveScanProgress(scanState.pageKey, { currentIndex: i + 1, seenKeys: Array.from(scanState.seenKeys) });
          addLog(`跳过第${i+1}个卡片（无法定位），已保存进度`);
          await randomSleep(); continue;
        }

        addLog(`--- 第${i+1}/${scanState.totalCards}个岗位 ---`);
        addLog(`当前页卡片总数：${cards.length}`);

        try { card.style.outline = '3px solid red'; setTimeout(() => { try { card.style.outline = ''; } catch(e){} }, 2000); } catch(e){}

        const prevDetailText = getDetailText();
        const prevTitle = getCurrentDetailTitle();
        addLog(`点击前标题："${prevTitle}"`);

        // ★ 首个岗位特殊处理：刷新后右侧默认已展示第1个岗位
        if (i === 0 || scanState.currentIndex === 0) {
          let firstJob;
          try { firstJob = await extractJobInfo(); } catch(e){}
          if (firstJob && firstJob.jobTitle && isCurrentDetailMatchesCard(card, firstJob)) {
            addLog(`当前右侧详情："${firstJob.jobTitle}"`);
            addLog(`第1个卡片："${(card.innerText||'').trim().substring(0, 80).replace(/\\n/g,' ')}"`);
            addLog('当前右侧详情已是第1个岗位，无需等待切换，直接分析');
            await analyzeAndHandleJob(firstJob, i, card);
            if (i < scanState.totalCards - 1 && !scanState.stopRequested) await randomSleep();
            continue;
          }
        }

        addLog(`正在点击第${i+1}个岗位...`);
        checkControlSignal('before click');
        try { scrollCardIntoView(card); } catch(e){}
        await safeSleep(800, 'scroll wait');
        try { realClick(card); } catch(e){ addLog('点击异常: ' + e.message); }
        await safeSleep(1000, 'click wait');
        checkControlSignal('after click');

        addLog('等待右侧详情切换...');
        let changed = await waitDetailChanged(prevDetailText, 8000);
        let newTitle = getCurrentDetailTitle();
        addLog(`点击后标题："${newTitle}"`);

        // 二次尝试
        if (!changed) {
          addLog('详情未变化，尝试点击卡片内标题元素...');
          try {
            const titleEl = card.querySelector('.job-name a, .job-title a, .name a, .job-name, .job-title, .name');
            if (titleEl) {
              scrollCardIntoView(card); await sleep(400);
              realClick(titleEl); await sleep(1000);
              changed = await waitDetailChanged(prevDetailText, 6000);
              newTitle = getCurrentDetailTitle();
              addLog(`二次尝试后标题："${newTitle}"`);
            }
          } catch(e){}
        }

        // 三次尝试
        if (!changed) {
          addLog('仍无变化，尝试点击卡片内链接...');
          try {
            const link = card.querySelector('a');
            if (link) { realClick(link); await sleep(1000); }
            changed = await waitDetailChanged(prevDetailText, 5000);
            newTitle = getCurrentDetailTitle();
            addLog(`三次尝试后标题："${newTitle}"`);
          } catch(e){}
        }

        // ★ 详情未变化时，二次判断：当前是否已匹配目标卡片
        if (!changed) {
          addLog('详情文本未变化，检查当前详情是否已匹配目标卡片...');
          let curJob;
          try { curJob = await extractJobInfo(); } catch(e){}
          if (curJob && isCurrentDetailMatchesCard(card, curJob)) {
            addLog(`详情未变化但已匹配第${i+1}个岗位("${curJob.jobTitle}")，继续分析`);
            changed = true; // 标记为已确认
          } else {
            addLog(`详情未变化且不匹配第${i+1}个岗位，跳过`);
            scanState.failedCount++; scanState.currentIndex = i + 1; updateScanStatus();
            await saveScanProgress(scanState.pageKey, { currentIndex: i + 1, seenKeys: Array.from(scanState.seenKeys) });
            await randomSleep(); continue;
          }
        } else {
          addLog('详情已变化 ✓');
        }

        await safeSleep(600, 'pre extract');
        checkControlSignal('before extract');

        // 提取岗位信息（统一走 analyzeAndHandleJob）
        let jobInfo;
        try {
          jobInfo = await extractJobInfo();
        } catch (e) {
          scanState.failedCount++; scanState.currentIndex = i + 1; updateScanStatus();
          await saveScanProgress(scanState.pageKey, { currentIndex: i + 1, seenKeys: Array.from(scanState.seenKeys) });
          addLog('提取失败，已保存进度: ' + e.message);
          await randomSleep(); continue;
        }

        await analyzeAndHandleJob(jobInfo, i, card);

        if (i < scanState.totalCards - 1 && !scanState.stopRequested) {
          await randomSleep();
        }
      }
      } catch (err) {
        scanError = err;
      }

      if (scanError) {
        if (scanError.message === '__SCAN_PAUSED__') {
          addLog(`自动筛选已暂停，位置：第${scanState.currentIndex + 1}个岗位，步骤：${scanState.pausedAtStep || '未知'}`);
          scanState.status = 'paused';
          try { await saveScanProgress(scanState.pageKey, { currentIndex: scanState.currentIndex, seenKeys: Array.from(scanState.seenKeys) }); } catch(e){}
          updateScanStatus();
          document.getElementById('ai-btn-scan-pause').disabled = true;
          document.getElementById('ai-btn-scan-continue').disabled = false;
          return;
        }
        if (scanError.message === '__SCAN_STOPPED__') {
          addLog(`自动筛选已停止，进度已保存，下次可以从第${scanState.currentIndex + 1}个岗位继续`);
          scanState.status = 'stopped';
          try { await saveScanProgress(scanState.pageKey, { currentIndex: scanState.currentIndex, seenKeys: Array.from(scanState.seenKeys) }); } catch(e){}
          updateScanStatus();
          setScanBtns('done');
          return;
        }
        throw scanError;
      }

      // 总结
      scanState.status = scanState.stopRequested ? 'stopped' : 'finished';
      addLog(scanState.stopRequested ? '=== 扫描已停止 ===' : '=== 扫描完成 ===');
      addLog(`总结: 扫描${scanState.currentIndex}/${scanState.totalCards} | 已分析${scanState.analyzedCount} | 推荐${scanState.recommendedCount} | 已沟通${scanState.communicatedCount} | 失败${scanState.failedCount}`);
      addLog(`下次点击"开始自动筛选"将从第 ${scanState.currentIndex + 1} 个岗位继续`);
      setScanBtns('done');

    } catch (e) {
      console.error('autoScanStart error:', e);
      addLog('自动筛选出错：' + (e.message || e));
      scanState.status = 'idle';
      try { setScanBtns('done'); } catch(e2){}
    }
  }

  function setScanBtns(state) {
    try {
      const start = document.getElementById('ai-start-auto-scan');
      const pause = document.getElementById('ai-btn-scan-pause');
      const cont = document.getElementById('ai-btn-scan-continue');
      const stop = document.getElementById('ai-btn-scan-stop');
      const loadBtn = document.getElementById('ai-btn-load-more');
      if (state === 'start') {
        if (start) start.disabled = true;
        if (pause) pause.disabled = false;
        if (cont) cont.disabled = true;
        if (stop) stop.disabled = false;
        // 扫描期间禁用加载
        if (loadBtn) loadBtn.disabled = true;
      } else {
        if (start) start.disabled = false;
        if (pause) pause.disabled = true;
        if (cont) cont.disabled = true;
        if (stop) stop.disabled = true;
        // 扫描结束后恢复加载按钮
        if (loadBtn) loadBtn.disabled = false;
      }
    } catch (e) { console.error('[setScanBtns]', e); }
  }

  // ========== 辅助函数 ==========
  function statusLabel(status) {
    const map = {
      captured: '已捕获',
      analyzed: '已分析',
      recommended: '建议沟通',
      communicated: '已沟通',
    };
    return map[status] || status;
  }

  // ========== 面板CSS样式 ==========
  function getPanelCSS() {
    return `
      #${PANEL_ID} {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 99999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      .ai-panel-container {
        width: 360px;
        max-height: 92vh;
        background: #fff;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.15);
        overflow: hidden;
        border: 1px solid #e8e8e8;
        display: flex; flex-direction: column;
      }
      /* 紧凑模式 */
      .ai-compact .ai-panel-container { width: 320px; max-height: 260px; }
      .ai-panel-body { padding: 12px 14px; overflow-y: auto; flex: 1; min-height: 0; }
      .ai-panel-header {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        background: linear-gradient(135deg, #409EFF, #337ECC);
        color: #fff;
        gap: 8px;
      }
      .ai-panel-logo {
        width: 28px;
        height: 28px;
        border-radius: 6px;
        background: #fff;
        color: #409EFF;
        font-weight: 800;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .ai-panel-title {
        flex: 1;
        font-size: 15px;
        font-weight: 600;
      }
      .ai-panel-close {
        background: none;
        border: none;
        color: #fff;
        font-size: 20px;
        cursor: pointer;
        padding: 0 4px;
        line-height: 1;
      }
      .ai-panel-toggle {
        background: none; border: none; color: #fff; font-size: 18px;
        cursor: pointer; padding: 0 4px; line-height: 1;
      }
      .ai-panel-toggle:hover { opacity: 0.8; }
      .ai-panel-close {
        background: none; border: none; color: #fff; font-size: 20px;
        cursor: pointer; padding: 0 4px; line-height: 1;
      }
      .ai-panel-close:hover {
        opacity: 0.8;
      }
      /* body 已在上方统一定义 */
      .ai-panel-hint {
        font-size: 13px;
        color: #666;
        margin: 0 0 12px 0;
        line-height: 1.6;
      }
      .ai-panel-btn {
        display: block;
        width: 100%;
        padding: 10px 0;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }
      .ai-panel-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .ai-btn-primary {
        background: #409EFF;
        color: #fff;
      }
      .ai-btn-primary:hover:not(:disabled) {
        background: #337ECC;
      }
      .ai-btn-success {
        background: #67C23A;
        color: #fff;
        margin-top: 10px;
      }
      .ai-btn-success:hover:not(:disabled) {
        background: #5aaf30;
      }
      .ai-btn-outline {
        background: #fff;
        color: #409EFF;
        border: 1px solid #409EFF;
        margin-top: 10px;
      }
      .ai-btn-outline:hover:not(:disabled) {
        background: #ecf5ff;
      }
      /* 简历区域 */
      .ai-resume-section {
        padding: 10px 12px;
        margin-bottom: 12px;
        background: #f8f9ff;
        border-radius: 8px;
        border: 1px solid #e8ecf4;
      }
      .ai-resume-header {
        font-size: 13px;
        font-weight: 600;
        color: #333;
        margin-bottom: 6px;
      }
      .ai-resume-name {
        font-size: 13px;
        font-weight: 500;
      }
      .ai-resume-name.ok { color: #67C23A; }
      .ai-resume-name.empty { color: #c0c4cc; }
      .ai-resume-status {
        font-size: 11px;
        margin-top: 2px;
      }
      .ai-resume-status.ok { color: #67C23A; }
      .ai-resume-status.empty { color: #909399; }
      .ai-resume-status.error { color: #F56C6C; }
      .ai-resume-actions {
        margin-top: 8px;
      }
      .ai-btn-upload {
        background: #ecf5ff;
        color: #409EFF;
        border: 1px solid #d9ecff;
        padding: 6px 0;
        font-size: 12px;
      }
      .ai-btn-upload:hover { background: #d9ecff; }
      .ai-panel-footer {
        padding: 8px 16px;
        border-top: 1px solid #f0f0f0;
        text-align: right;
      }
      .ai-panel-version {
        font-size: 11px;
        color: #c0c4cc;
      }
      .ai-loading {
        text-align: center;
        color: #409EFF;
        font-size: 14px;
        padding: 20px 0;
      }
      .ai-result {
        padding-top: 8px;
      }
      .ai-score-section {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 12px;
      }
      .ai-score-circle {
        width: 70px;
        height: 70px;
        border-radius: 50%;
        border: 3px solid #409EFF;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }
      .ai-score-num {
        font-size: 24px;
        font-weight: 700;
        line-height: 1;
      }
      .ai-score-label {
        font-size: 11px;
        color: #999;
      }
      .ai-score-info {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .ai-score-level {
        font-size: 16px;
        font-weight: 600;
      }
      .ai-status-badge {
        display: inline-block;
        padding: 2px 10px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 500;
      }
      .ai-status-captured { background: #f0f2f5; color: #909399; }
      .ai-status-analyzed { background: #ecf5ff; color: #409EFF; }
      .ai-status-recommended { background: #f0f9eb; color: #67C23A; }
      .ai-status-communicated { background: #ecf5ff; color: #409EFF; }
      .ai-recommendation {
        font-size: 13px;
        color: #555;
        line-height: 1.6;
        margin: 0 0 8px 0;
      }
      .ai-error {
        color: #F56C6C;
        font-size: 13px;
        line-height: 1.6;
      }
      .ai-error p { margin: 4px 0; }
      .ai-error ul { margin: 4px 0; padding-left: 20px; }
      .ai-hint { color: #999; font-size: 12px; }
      .ai-warning {
        color: #E6A23C;
        font-size: 12px;
        margin: 8px 0 0 0;
      }
      .ai-hr-info {
        display: flex; align-items: center; gap: 8px;
        margin: 8px 0; font-size: 12px;
      }
      .ai-hr-label { color: #909399; }
      .ai-hr-name { font-weight: 500; color: #333; }
      .ai-composite { font-size: 11px; color: #409EFF; font-weight: 600; margin-left: auto; }
      .ai-job-tags {
        display: flex; flex-wrap: wrap; align-items: center; gap: 4px;
        margin: 6px 0; font-size: 12px;
      }
      .ai-tags-label { color: #909399; }
      .ai-job-tag {
        background: #f0f9eb; color: #67C23A; border: 1px solid #c6e2b3;
        padding: 1px 6px; border-radius: 4px; font-size: 11px;
      }
      .ai-success-msg {
        color: #67C23A;
        font-size: 12px;
        margin: 4px 0 0 0;
      }

      /* 自动筛选区域 */
      /* 岗位加载区域 */
      .ai-load-section { margin: 14px 0 6px 0; padding: 10px 12px; background: #f0f9ff; border-radius: 8px; border: 1px solid #d9ecff; }
      .ai-load-status { font-size: 12px; color: #666; margin-bottom: 8px; }
      .ai-load-status b { color: #333; }
      .ai-load-btns { display: flex; gap: 6px; }
      /* 自动筛选区域 */
      .ai-scan-section { margin-top: 16px; }
      .ai-scan-divider { border-top: 1px solid #ebeef5; margin-bottom: 12px; }
      .ai-scan-title { font-size: 14px; font-weight: 600; color: #333; margin-bottom: 10px; }
      .ai-scan-config { display: flex; flex-wrap: wrap; gap: 6px 14px; margin-bottom: 10px; }
      .ai-scan-row { display: flex; align-items: center; gap: 4px; }
      .ai-scan-label { font-size: 12px; color: #666; white-space: nowrap; }
      .ai-scan-input { width: 48px; height: 22px; padding: 0 4px; border: 1px solid #dcdfe6; border-radius: 4px; font-size: 12px; text-align: center; }
      .ai-scan-select { width: 100px; height: 24px; padding: 0 4px; border: 1px solid #dcdfe6; border-radius: 4px; font-size: 12px; background: #fff; }
      .ai-scan-unit { font-size: 11px; color: #999; }
      .ai-scan-delay { font-size: 12px; color: #666; }
      .ai-scan-switch-row { margin-top: 2px; }
      .ai-scan-switch { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #666; cursor: pointer; }
      .ai-scan-switch input { cursor: pointer; }
      .ai-scan-btns { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
      .ai-scan-btn {
        padding: 5px 10px; border: none; border-radius: 6px; font-size: 12px;
        font-weight: 500; cursor: pointer; transition: all 0.2s;
      }
      .ai-scan-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      .ai-scan-btn-start { background: #409EFF; color: #fff; }
      .ai-scan-btn-start:hover:not(:disabled) { background: #337ECC; }
      .ai-scan-btn-diag { background: #909399; color: #fff; }
      .ai-scan-btn-diag:hover:not(:disabled) { background: #73767a; }
      .ai-scan-resume-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
      .ai-scan-btn-reset { padding: 3px 8px; border: 1px solid #dcdfe6; border-radius: 4px; background: #fff; color: #909399; font-size: 11px; cursor: pointer; }
      .ai-scan-btn-reset:hover { color: #F56C6C; border-color: #F56C6C; }
      .ai-scan-btn-pause { background: #E6A23C; color: #fff; }
      .ai-scan-btn-continue { background: #67C23A; color: #fff; }
      .ai-scan-btn-stop { background: #F56C6C; color: #fff; }
      .ai-scan-status { margin-top: 8px; padding: 8px; background: #f8f9ff; border-radius: 6px; }
      .ai-scan-stats { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 11px; color: #666; margin-bottom: 8px; }
      .ai-scan-stats b { color: #333; }
      .ai-scan-log {
        max-height: 140px; overflow-y: auto; padding: 6px 8px;
        background: #fff; border-radius: 4px; font-size: 11px; line-height: 1.6;
        border: 1px solid #ebeef5; margin-bottom: 8px;
      }
      .ai-scan-log-entry { color: #666; word-break: break-all; }
      .ai-scan-recommended { max-height: 180px; overflow-y: auto; }
      .ai-scan-rec-item {
        display: flex; justify-content: space-between; align-items: center;
        padding: 6px 8px; margin-bottom: 4px; background: #f0f9eb; border-radius: 4px;
        font-size: 12px;
      }
      .ai-scan-rec-info { flex: 1; min-width: 0; }
      .ai-scan-rec-title { font-weight: 500; color: #333; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .ai-scan-rec-company { color: #999; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px; }
      .ai-scan-rec-score { display: flex; align-items: center; gap: 6px; color: #666; white-space: nowrap; margin-left: 8px; }
      .ai-scan-rec-num { font-weight: 700; font-size: 15px; color: #67C23A; }
      .ai-scan-rec-status { font-size: 10px; padding: 1px 6px; border-radius: 3px; }
      .ai-scan-rec-rec { background: #ecf5ff; color: #409EFF; }
      .ai-scan-rec-comm { background: #f0f9eb; color: #67C23A; }
      .ai-scan-rec-btn {
        padding: 2px 8px; border: 1px solid #409EFF; color: #409EFF; background: #fff;
        border-radius: 3px; font-size: 11px; cursor: pointer; transition: all 0.2s;
      }
      .ai-scan-rec-btn:hover { background: #409EFF; color: #fff; }
      .ai-scan-rec-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      .ai-scan-rec-done { border-color: #67C23A; color: #67C23A; cursor: default; }
    `;
  }

  // ========== 启动 ==========
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
