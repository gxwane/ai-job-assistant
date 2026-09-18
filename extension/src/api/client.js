/**
 * AI求职助手 - 后端 API 客户端与通信封装
 */
import { API_BASE } from '../config.js';

export async function fetchDefaultResume() {
  try {
    const resp = await fetch(`${API_BASE}/resume/default`);
    if (resp.ok) {
      const data = await resp.json();
      if (data.resume_id) {
        return { id: data.resume_id, filename: data.filename || '已上传简历' };
      }
    }
  } catch (e) {
    // 后端不可用，忽略
  }
  return null;
}

export async function uploadResumeFile(file) {
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
  return { id: data.resume_id, filename: data.filename };
}

export async function pollJobRecordAnalysis(recordId, timeoutMs = 60000, intervalMs = 1500, signal = null) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    if (signal && signal.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
    try {
      const res = await fetch(`${API_BASE}/job-records/${recordId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: signal || undefined,
      });
      if (!res.ok) continue;
      const detail = await res.json();
      if (detail.analysis_status === 'done') {
        detail.job_record_id = detail.id;
        detail.should_recommend = (detail.status === 'recommended' || (detail.match_score != null && detail.match_score >= 70));
        return detail;
      } else if (detail.analysis_status === 'failed') {
        throw new Error('AI 后台分析失败，请检查服务日志');
      }
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      console.warn('[AI求职助手] 轮询岗位分析状态出现非阻断异常:', err);
    }
  }
  throw new Error('AI 分析轮询超时（60秒），可在后台历史记录中查看');
}

export async function postJobCapture(payload, signal = null) {
  const response = await fetch(`${API_BASE}/plugin/job-capture`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: signal || undefined,
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${response.status}`);
  }
  let data = await response.json();
  if (data.analysis_status === 'pending' || data.analysis_status === 'running') {
    data = await pollJobRecordAnalysis(data.job_record_id, 60000, 1500, signal);
  }
  return data;
}

export async function markCommunicatedOnBackend(recordId) {
  const response = await fetch(`${API_BASE}/plugin/job-records/${recordId}/communicated`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${response.status}`);
  }
  return await response.json();
}
