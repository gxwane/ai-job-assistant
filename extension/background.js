/**
 * AI求职助手 - Background Service Worker
 * 处理来自content.js的消息、API调用、截图裁剪
 * 兼容 Edge (Chromium) 和 Chrome，API 完全通用
 */

const API_BASE_URL = 'http://127.0.0.1:8000/api';

// 监听来自content.js的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'jobCapture') {
    handleJobCapture(message.data)
      .then((result) => sendResponse({ success: true, data: result }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.action === 'markCommunicated') {
    markCommunicated(message.recordId)
      .then((result) => sendResponse({ success: true, data: result }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.action === 'captureArea') {
    // 获取发送者的窗口ID用于截图
    const windowId = sender.tab ? sender.tab.windowId : null;
    handleCaptureArea(message.rect, windowId)
      .then((base64) => sendResponse({ success: true, imageBase64: base64 }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.action === 'ocrField') {
    handleOcrField(message.imageBase64, message.fieldType)
      .then((result) => sendResponse({ success: true, data: result }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// ==================== 岗位捕获 ====================

async function handleJobCapture(data) {
  const response = await fetch(`${API_BASE_URL}/plugin/job-capture`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${response.status}`);
  }
  return await response.json();
}

// ==================== 沟通标记 ====================

async function markCommunicated(recordId) {
  const response = await fetch(`${API_BASE_URL}/plugin/job-records/${recordId}/communicated`, {
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

// ==================== 截图 + 裁剪 ====================

/**
 * 截取可见标签页并裁剪指定区域
 * @param {Object} rect - {x, y, width, height} 页面坐标（未乘DPR）
 * @param {number} windowId - 窗口ID（来自sender.tab.windowId）
 * @returns {string} 裁剪区域的Base64 PNG
 */
async function handleCaptureArea(rect, windowId) {
  // 1. 截取可见标签页
  const dataUrl = await chrome.tabs.captureVisibleTab(windowId, { format: 'png' });
  if (!dataUrl) throw new Error('截图返回空');

  // 2. 加载图片
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const imageBitmap = await createImageBitmap(blob);

  console.log('[Capture] 截图尺寸:', imageBitmap.width, 'x', imageBitmap.height);
  console.log('[Capture] CSS rect:', rect);

  // 3. DPR换算
  const dpr = rect.dpr || 1;
  const sx = Math.round(rect.x * dpr);
  const sy = Math.round(rect.y * dpr);
  const sw = Math.round(rect.width * dpr);
  const sh = Math.round(rect.height * dpr);

  console.log('[Capture] 裁剪源坐标(设备像素):', `sx=${sx} sy=${sy} sw=${sw} sh=${sh}`);

  // 边界保护
  const cropW = Math.min(sw, imageBitmap.width - sx);
  const cropH = Math.min(sh, imageBitmap.height - sy);

  if (cropW <= 0 || cropH <= 0) {
    throw new Error(`裁剪区域超出截图范围: sx=${sx}, sy=${sy}, sw=${sw}, sh=${sh}, img=${imageBitmap.width}x${imageBitmap.height}`);
  }

  // 4. 裁剪
  const canvas = new OffscreenCanvas(cropW, cropH);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(imageBitmap, sx, sy, cropW, cropH, 0, 0, cropW, cropH);

  console.log('[Capture] 最终裁剪尺寸:', cropW, 'x', cropH, '(设备像素)');

  // 5. 导出 PNG Base64
  const croppedBlob = await canvas.convertToBlob({ type: 'image/png' });
  const arrayBuffer = await croppedBlob.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);

  let binary = '';
  for (let i = 0; i < uint8.length; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  const base64 = btoa(binary);

  imageBitmap.close();

  const result = 'data:image/png;base64,' + base64;
  console.log('[Capture] Base64长度:', result.length);
  return result;
}

// ==================== OCR请求 ====================

/**
 * 发送裁剪图片到后端OCR识别
 */
async function handleOcrField(imageBase64, fieldType) {
  const response = await fetch(`${API_BASE_URL}/ocr/extract-field`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64, fieldType }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `OCR请求失败 HTTP ${response.status}`);
  }
  return await response.json();
}
