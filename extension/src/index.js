/**
 * AI求职助手 - Boss直聘内容脚本主入口
 * 模块化组装与生命周期初始化
 */
import { PANEL_ID } from './config.js';
import { runtimeState, scanState, resetScanState } from './store/state.js';
import { createPanel, updateResumeDisplay } from './ui/panel.js';
import { renderResult, addLog } from './ui/render.js';
import { extractJobInfo } from './extractor/job_info.js';
import { fetchDefaultResume, postJobCapture } from './api/client.js';
import {
  autoScanStart,
  requestPauseScan,
  resumeScanFromProgress,
  requestStopScan,
} from './scanner/scanner.js';

async function handleCapture() {
  const btn = document.getElementById('ai-btn-capture');
  const resultDiv = document.getElementById('ai-panel-result');
  if (!btn || !resultDiv) return;

  btn.disabled = true;
  btn.textContent = '分析中...';
  resultDiv.style.display = 'block';
  resultDiv.innerHTML = '<p class="ai-loading">正在提取岗位信息并发送匹配分析...</p>';

  try {
    const jobInfo = await extractJobInfo();
    if (!jobInfo.jobTitle || !jobInfo.jobDescription || jobInfo.jobTitle === '-') {
      throw new Error('未能在当前页面有效提取到岗位标题或JD内容');
    }

    let resumeId = runtimeState.currentResume?.id || null;
    if (!resumeId) {
      const storage = await chrome.storage.local.get(['resumeId']);
      resumeId = storage.resumeId || null;
    }

    const data = await postJobCapture({
      resume_id: resumeId,
      job_title: jobInfo.jobTitle,
      company: jobInfo.company || null,
      salary: jobInfo.salary || null,
      location: jobInfo.location || null,
      job_url: jobInfo.jobUrl,
      job_description: jobInfo.jobDescription,
      captured_page_url: window.location.href,
    });

    runtimeState.currentJobRecordId = data.job_record_id;
    renderResult(data);
  } catch (error) {
    resultDiv.innerHTML = `
      <div class="ai-error">
        <p>分析失败：${error.message}</p>
        <p class="ai-hint">请确认后端服务已在 http://127.0.0.1:8000 正常运行。</p>
      </div>
    `;
  } finally {
    btn.disabled = false;
    btn.textContent = '重新发送分析';
  }
}

async function loadInitialResume() {
  try {
    const backendResume = await fetchDefaultResume();
    if (backendResume) {
      runtimeState.currentResume = backendResume;
      await chrome.storage.local.set({
        resumeId: backendResume.id,
        resumeFilename: backendResume.filename,
      });
    } else {
      const storage = await chrome.storage.local.get(['resumeId', 'resumeFilename']);
      if (storage.resumeId) {
        runtimeState.currentResume = {
          id: storage.resumeId,
          filename: storage.resumeFilename || '已上传简历',
        };
      }
    }
  } catch (e) {}
  updateResumeDisplay();
}

function init() {
  if (document.getElementById(PANEL_ID)) return;

  setTimeout(() => {
    createPanel({
      onCapture: handleCapture,
      onStartScan: autoScanStart,
      onPauseScan: requestPauseScan,
      onContinueScan: resumeScanFromProgress,
      onStopScan: requestStopScan,
      onResetProgress: () => {
        resetScanState();
        addLog('扫描状态已重置');
      },
    });
    loadInitialResume();
  }, 1200);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
