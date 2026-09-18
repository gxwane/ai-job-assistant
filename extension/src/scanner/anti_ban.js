/**
 * AI求职助手 - 防封号高斯时延与风控熔断机制
 */

export function calculateGaussianJitter(minSec = 15, maxSec = 45) {
  const u1 = Math.max(Math.random(), 1e-7);
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  const mean = (minSec + maxSec) / 2.0;
  const stdDev = (maxSec - minSec) / 6.0;
  const delay = Math.round(mean + z0 * stdDev);
  return Math.max(minSec, Math.min(maxSec, delay));
}

export function getDailyCommKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `daily_comm_${y}-${m}-${day}`;
}

export async function getDailyCommunicatedCount() {
  const key = getDailyCommKey();
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const res = await chrome.storage.local.get([key]);
      return res[key] || 0;
    }
    return parseInt(localStorage.getItem(key) || '0', 10);
  } catch (e) {
    return parseInt(localStorage.getItem(key) || '0', 10);
  }
}

export async function incrementDailyCommunicatedCount() {
  const key = getDailyCommKey();
  const current = await getDailyCommunicatedCount();
  const updated = current + 1;
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ [key]: updated });
    } else {
      localStorage.setItem(key, String(updated));
    }
  } catch (e) {
    localStorage.setItem(key, String(updated));
  }
  return updated;
}

export function detectRiskCircuitBreaker() {
  const captchaSelectors = [
    '.geetest_holder', '.geetest_popup', '.geetest_radar_tip',
    '[class*="geetest"]', '#captcha', '[class*="captcha"]',
    '[class*="verify-wrap"]', '[class*="security-dialog"]',
    '.dialog-wrap.verify-dialog',
  ];
  for (const sel of captchaSelectors) {
    try {
      const el = document.querySelector(sel);
      if (el && el.offsetParent !== null) {
        return { detected: true, reason: `匹配到风控元素: ${sel}` };
      }
    } catch (e) {}
  }

  const textContainers = document.querySelectorAll(
    '.dialog-container, .dialog-wrap, .boss-popup, .modal-content, [role="dialog"]'
  );
  for (const container of textContainers) {
    if (container.offsetParent !== null) {
      const text = container.innerText || '';
      if (/操作过于频繁|操作频繁|系统检测到异常|安全验证|安全校验|请完成验证/.test(text)) {
        return { detected: true, reason: `检测到风控提示文本: "${text.substring(0, 30)}"` };
      }
    }
  }
  return { detected: false };
}
