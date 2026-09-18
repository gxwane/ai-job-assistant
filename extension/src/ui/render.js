/**
 * AI求职助手 - UI 结果、日志与列表渲染
 */
import { HR_STATUS_COLOR_MAP } from '../config.js';
import { scanState, runtimeState } from '../store/state.js';
import { markCommunicatedOnBackend } from '../api/client.js';

export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

export function statusLabel(status) {
  const map = {
    captured: '已保存',
    analyzed: '已分析',
    recommended: '推荐投递',
    applied: '已投递',
    interview: '面试中',
  };
  return map[status] || status || '未分析';
}

export function getHrStatusColor(status) {
  return HR_STATUS_COLOR_MAP[status] || '#909399';
}

export function updateScanStatus() {
  try {
    const set = (id, val) => {
      const e = document.getElementById(id);
      if (e) e.textContent = val;
    };
    set('ai-scan-progress', `${scanState.currentIndex}/${scanState.totalCards}`);
    set('ai-scan-analyzed', scanState.analyzedCount);
    set('ai-scan-recommended', scanState.recommendedCount);
    set('ai-scan-communicated', scanState.communicatedCount);
    set('ai-scan-failed', scanState.failedCount);
  } catch (e) {
    console.error('[updateScanStatus]', e);
  }
}

export function addLog(msg) {
  console.log('[AI求职助手]', msg);
  try {
    const logEl = document.getElementById('ai-scan-log');
    if (!logEl) return;
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

export function addScanLog(msg) {
  addLog(msg);
}

export function addToRecommendedList(result, communicated) {
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
    </div>
  `;
  listEl.appendChild(item);
}

export function renderResult(data) {
  const resultDiv = document.getElementById('ai-panel-result');
  if (!resultDiv) return;

  const scoreColor = data.match_score >= 70 ? '#67C23A' : data.match_score >= 50 ? '#E6A23C' : '#F56C6C';
  const hrColor = getHrStatusColor(data.hr_status);

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
      <p class="ai-recommendation">${data.recommendation || data.message || ''}</p>
  `;

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

  if (data.job_tags && data.job_tags.length > 0) {
    const tagsHtml = data.job_tags.map(t => `<span class="ai-job-tag">${escapeHtml(t)}</span>`).join('');
    html += `<div class="ai-job-tags"><span class="ai-tags-label">标签：</span>${tagsHtml}</div>`;
  }

  if (data.should_recommend && data.job_record_id) {
    html += `
      <button class="ai-panel-btn ai-btn-success" id="ai-btn-communicate">
        一键沟通
      </button>
    `;
  } else if (!data.should_recommend && data.job_record_id && data.match_score != null) {
    html += `
      <button class="ai-panel-btn ai-btn-outline" id="ai-btn-communicate">
        仍要沟通（手动确认）
      </button>
    `;
  }

  html += `</div>`;
  resultDiv.innerHTML = html;

  const communicateBtn = document.getElementById('ai-btn-communicate');
  if (communicateBtn) {
    communicateBtn.addEventListener('click', handleCommunicate);
  }
}

async function handleCommunicate() {
  if (!runtimeState.currentJobRecordId) return;

  const chatBtn = document.querySelector('.btn-startchat, .btn-chat, .chat-btn, .op-btn.chat, .btn-immediately');
  if (chatBtn) {
    try {
      chatBtn.click();
      console.log('[AI求职助手] 已点击立即沟通按钮');
    } catch (e) {
      console.warn('[AI求职助手] 点击按钮异常:', e);
    }
  }

  try {
    await markCommunicatedOnBackend(runtimeState.currentJobRecordId);
    const badge = document.querySelector('.ai-status-badge');
    if (badge) {
      badge.className = 'ai-status-badge ai-status-communicated';
      badge.textContent = '已沟通';
    }
    const btn = document.getElementById('ai-btn-communicate');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '已沟通';
    }
  } catch (e) {
    console.error('[AI求职助手] 标记沟通失败:', e);
  }
}
