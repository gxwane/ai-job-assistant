/**
 * AI求职助手 - 自动扫描状态机与控制循环
 */
import { scanState, loadState, runtimeState } from '../store/state.js';
import { HR_REQUIREMENT_LABEL } from '../config.js';
import { extractJobInfo } from '../extractor/job_info.js';
import { postJobCapture, markCommunicatedOnBackend } from '../api/client.js';
import {
  calculateGaussianJitter,
  detectRiskCircuitBreaker,
  getDailyCommunicatedCount,
  incrementDailyCommunicatedCount
} from './anti_ban.js';
import { updateScanStatus, addLog, addScanLog, addToRecommendedList } from '../ui/render.js';

export function checkControlSignal(stepName) {
  if (scanState.stopRequested) {
    throw new Error('__SCAN_STOPPED__');
  }
  if (scanState.pauseRequested) {
    scanState.pausedAtStep = stepName || '未知';
    throw new Error('__SCAN_PAUSED__');
  }
}

export async function interruptibleSleep(ms, stepName) {
  const interval = 100;
  const ver = scanState.controlVersion;
  for (let elapsed = 0; elapsed < ms; elapsed += interval) {
    if (scanState.controlVersion !== ver) {
      checkControlSignal(stepName || 'sleep');
    }
    await new Promise((r) => setTimeout(r, Math.min(interval, ms - elapsed)));
  }
}

export function requestPauseScan() {
  if (scanState.status !== 'running') return;
  scanState.pauseRequested = true;
  scanState.status = 'paused';
  scanState.controlVersion++;
  if (scanState.activeAbortController) {
    try { scanState.activeAbortController.abort(); } catch(e){}
    scanState.activeAbortController = null;
  }
  addLog('已请求立即暂停：当前请求已中断，扫描进度已保存');
  updateScanStatus();
  const pauseBtn = document.getElementById('ai-btn-scan-pause');
  const continueBtn = document.getElementById('ai-btn-scan-continue');
  if (pauseBtn) pauseBtn.disabled = true;
  if (continueBtn) continueBtn.disabled = false;
}

export function requestStopScan() {
  scanState.stopRequested = true;
  scanState.pauseRequested = false;
  scanState.status = 'stopped';
  scanState.controlVersion++;
  if (scanState.activeAbortController) {
    try { scanState.activeAbortController.abort(); } catch(e){}
    scanState.activeAbortController = null;
  }
  addLog('已请求立即停止：当前请求已中断，扫描进度已保存');
  updateScanStatus();
  setScanBtns('done');
}

export function resumeScanFromProgress() {
  if (scanState.status !== 'paused') return;
  scanState.pauseRequested = false;
  scanState.stopRequested = false;
  scanState.status = 'running';
  scanState.controlVersion++;
  addLog('=== 从暂停处继续扫描 ===');
  const pauseBtn = document.getElementById('ai-btn-scan-pause');
  const continueBtn = document.getElementById('ai-btn-scan-continue');
  if (pauseBtn) pauseBtn.disabled = false;
  if (continueBtn) continueBtn.disabled = true;
}

export function setScanBtns(state) {
  const startBtn = document.getElementById('ai-start-auto-scan');
  const pauseBtn = document.getElementById('ai-btn-scan-pause');
  const continueBtn = document.getElementById('ai-btn-scan-continue');
  const stopBtn = document.getElementById('ai-btn-scan-stop');
  if (!startBtn) return;

  if (state === 'running') {
    startBtn.disabled = true;
    if (pauseBtn) pauseBtn.disabled = false;
    if (continueBtn) continueBtn.disabled = true;
    if (stopBtn) stopBtn.disabled = false;
  } else if (state === 'done') {
    startBtn.disabled = false;
    if (pauseBtn) pauseBtn.disabled = true;
    if (continueBtn) continueBtn.disabled = true;
    if (stopBtn) stopBtn.disabled = true;
  }
}

export async function sendJobForScan(jobInfo, cardIndex) {
  checkControlSignal('before sendJobForScan');
  addScanLog('已发送AI分析...');

  let resumeId = runtimeState.currentResume?.id || null;
  if (!resumeId) {
    try {
      const storage = await chrome.storage.local.get(['resumeId']);
      resumeId = storage.resumeId || null;
    } catch (e) {
      try {
        const cached = localStorage.getItem('ai_resume_id');
        resumeId = cached ? parseInt(cached) : null;
      } catch (_) { resumeId = null; }
    }
  }

  const controller = new AbortController();
  scanState.activeAbortController = controller;

  try {
    const data = await postJobCapture({
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
    }, controller.signal);
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

export async function autoScanStart() {
  addLog('=== 开始自动筛选 ===');
  const cards = document.querySelectorAll('.job-card-wrapper, .job-card-box, [class*="job-card"]');
  scanState.totalCards = cards.length;
  scanState.status = 'running';
  scanState.sessionId = 'scan_' + Date.now();
  setScanBtns('running');
  updateScanStatus();

  const statusBox = document.getElementById('ai-scan-status');
  if (statusBox) statusBox.style.display = 'block';

  try {
    for (let i = scanState.currentIndex; i < cards.length; i++) {
      checkControlSignal(`card ${i}`);
      if (scanState.analyzedCount >= scanState.maxScanCount) {
        addLog(`已达单次最大扫描数 (${scanState.maxScanCount})，停止扫描`);
        break;
      }

      const card = cards[i];
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await interruptibleSleep(600, 'scroll');

      try {
        card.click();
      } catch (e) {}
      await interruptibleSleep(1200, 'after card click');

      const jobInfo = await extractJobInfo();
      await analyzeAndHandleJob(jobInfo, i, card);

      const delay = calculateGaussianJitter(scanState.minDelay, scanState.maxDelay);
      addScanLog(`高斯拟人等待 ${delay} 秒...`);
      await interruptibleSleep(delay * 1000, 'between jobs');
    }
    addLog('=== 自动筛选结束 ===');
  } catch (err) {
    if (err.message === '__SCAN_STOPPED__') {
      addLog('扫描已由用户终止');
    } else if (err.message === '__SCAN_PAUSED__') {
      addLog(`扫描已在步骤 [${scanState.pausedAtStep}] 暂停`);
    } else {
      addLog(`扫描异常终止: ${err.message}`);
    }
  } finally {
    if (scanState.status !== 'paused') {
      scanState.status = 'idle';
      setScanBtns('done');
    }
  }
}

async function analyzeAndHandleJob(jobInfo, i, card) {
  if (!jobInfo.jobDescription || jobInfo.jobDescription.length < 80) {
    scanState.failedCount++;
    scanState.currentIndex = i + 1;
    updateScanStatus();
    addLog(`JD过短(${jobInfo.jobDescription ? jobInfo.jobDescription.length : 0}字)，已跳过`);
    return;
  }

  addLog(`提取成功：${jobInfo.jobTitle || '-'} / ${jobInfo.company || '-'}`);
  const uniqueKey = `${jobInfo.jobTitle}_${jobInfo.company}_${jobInfo.salary}`;
  if (scanState.seenKeys.has(uniqueKey)) {
    scanState.currentIndex = i + 1;
    addLog('该岗位已在本次扫描记录中，已跳过');
    return;
  }
  scanState.seenKeys.add(uniqueKey);
  jobInfo._uniqueKey = uniqueKey;

  let result;
  try {
    result = await sendJobForScan(jobInfo, i);
  } catch (e) {
    scanState.failedCount++;
    scanState.currentIndex = i + 1;
    updateScanStatus();
    addLog(`分析请求失败: ${e.message}`);
    return;
  }

  scanState.analyzedCount++;
  scanState.currentIndex = i + 1;
  updateScanStatus();

  if (result.match_score >= scanState.threshold) {
    scanState.recommendedCount++;
    addLog(`匹配度 ${result.match_score} → 建议沟通`);
    let communicated = false;
    if (scanState.autoCommunicate && scanState.communicatedCount < scanState.maxAutoCommunicateCount) {
      communicated = await executeAutoCommunicate(result);
    }
    addToRecommendedList(
      {
        job_title: jobInfo.jobTitle,
        company: jobInfo.company,
        match_score: result.match_score,
        job_record_id: result.job_record_id,
        hr_status: result.hr_status,
      },
      communicated
    );
  } else {
    addLog(`匹配度 ${result.match_score} 低于阈值 ${scanState.threshold}，跳过`);
  }
}

async function executeAutoCommunicate(result) {
  const preRisk = detectRiskCircuitBreaker();
  if (preRisk.detected) {
    addLog(`🚨 [风控熔断] ${preRisk.reason}！已紧急停止自动化操作！`);
    scanState.stopRequested = true;
    return false;
  }

  const dailyCount = await getDailyCommunicatedCount();
  const DAILY_LIMIT = 20;
  if (dailyCount >= DAILY_LIMIT) {
    addLog(`⚠️ [风控拦截] 今日自动沟通已达硬上限（${dailyCount}/${DAILY_LIMIT}次），已强制停止沟通保护账号！`);
    scanState.stopRequested = true;
    return false;
  }

  const chatBtn = document.querySelector('.btn-startchat, .btn-chat, .chat-btn, .op-btn.chat, .btn-immediately');
  if (!chatBtn) {
    addLog('未找到"立即沟通"按钮');
    return false;
  }

  addLog('正在点击"立即沟通"');
  try {
    chatBtn.click();
  } catch (e) {
    addLog('点击按钮失败');
    return false;
  }

  await interruptibleSleep(1000, 'after chat click');
  const postRisk = detectRiskCircuitBreaker();
  if (postRisk.detected) {
    addLog(`🚨 [风控熔断] 点击后触发安全验证（${postRisk.reason}），已紧急熔断停止！`);
    scanState.stopRequested = true;
    return false;
  }

  try {
    await markCommunicatedOnBackend(result.job_record_id);
    scanState.communicatedCount++;
    await incrementDailyCommunicatedCount();
    const todayCount = await getDailyCommunicatedCount();
    addLog(`沟通成功（今日累计沟通 ${todayCount}/${DAILY_LIMIT} 次）`);
    updateScanStatus();
    return true;
  } catch (e) {
    return false;
  }
}
