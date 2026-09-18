/**
 * AI求职助手 - OCR 截图与降级处理
 */
import { runtimeState } from '../store/state.js';

export function isBlacklisted(className) {
  if (!className) return false;
  const blacklist = [
    'btn', 'button', 'badge', 'tag', 'nav', 'tab', 'menu', 'icon',
    'search', 'filter', 'sort', 'page', 'footer', 'header-user',
    'dialog', 'modal', 'popup', 'dropdown', 'user-info',
  ];
  return blacklist.some(b => className.includes(b));
}

export function isValidCompany(t) {
  if (!t || t.length < 2 || t.length > 50) return false;
  if (/^[\d\s\-_]+$/.test(t)) return false;
  if (['未找到', '未知', '公司', '企业', '招聘', 'BOSS'].includes(t)) return false;
  if (/^[\d.]+k$/i.test(t)) return false;
  return true;
}

export function isValidSalary(t) {
  if (!t || t.length < 2) return false;
  if (/^\d+[Kk]?-\d+[Kk]?/.test(t) && /[Kk元天薪月年]/.test(t)) return true;
  if (t === '面议') return true;
  if (/^\d{4,5}-\d{4,5}$/.test(t)) return true;
  return false;
}

export function getVisibleText(el) {
  if (!el) return '';
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode: function (node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      const style = window.getComputedStyle(parent);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let text = '';
  let n;
  while ((n = walker.nextNode())) {
    text += n.textContent.trim() + ' ';
  }
  return text.trim();
}

export function findOcrRect(fieldType) {
  if (fieldType === 'salary') {
    const titleEl = document.querySelector('h1, .job-title, .name h1, .detail-title h1');
    if (titleEl) {
      const header = titleEl.closest('.job-detail-header, .job-primary, .job-info, .detail-header')
                  || titleEl.parentElement?.parentElement
                  || titleEl.parentElement;
      if (header) {
        const titleTop = titleEl.getBoundingClientRect().top;
        const candidates = [];
        const allEls = header.querySelectorAll('*');
        for (const el of allEls) {
          if (el === titleEl || titleEl.contains(el)) continue;
          if (isBlacklisted(el.className?.toString().toLowerCase())) continue;
          const text = el.innerText?.trim() || el.textContent?.trim() || '';
          const rect = el.getBoundingClientRect();
          if (rect.width < 40 || rect.height < 10) continue;
          if (rect.top < titleTop - 10 || rect.top > titleTop + 60) continue;

          const hasSalaryLike = /元\/[天日]/.test(text)
            || /\d+[Kk]/.test(text)
            || /薪/.test(text)
            || /[□]{2,}/.test(text)
            || /面议/.test(text);

          if (hasSalaryLike) {
            candidates.push({ el, rect, text: text.substring(0, 30) });
          }
        }
        if (candidates.length > 0) {
          candidates.sort((a, b) => b.rect.right - a.rect.right);
          return candidates[0].rect;
        }
      }
    }

    const selectedCard = document.querySelector(
      '.job-card-wrapper.active, .job-card-wrapper.selected, ' +
      '[class*="job-card"][class*="active"], [class*="job-card"][class*="selected"], ' +
      '.selected .job-card, .active .job-card'
    );
    if (selectedCard) {
      const cr = selectedCard.getBoundingClientRect();
      return {
        left: cr.right - 220,
        top: cr.top + 15,
        width: 200,
        height: 50,
      };
    }

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

    const companyLink = document.querySelector('a[href*="/gongsi/"], a[href*="company"]');
    if (companyLink) {
      const r = companyLink.getBoundingClientRect();
      if (r.width > 30 && r.height > 10) return r;
    }
  }

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

export async function extractByOCR(fieldType) {
  runtimeState.ocrDebug[fieldType] = runtimeState.ocrDebug[fieldType] || {};
  const dbg = runtimeState.ocrDebug[fieldType];
  dbg.steps = [];
  dbg.fieldType = fieldType;

  try {
    dbg.steps.push('start');
    const rect = findOcrRect(fieldType);
    if (!rect) {
      const msg = '未找到截图区域rect';
      dbg.steps.push(msg);
      return { value: '', reason: msg };
    }

    const dpr = window.devicePixelRatio || 1;
    dbg.rect = {
      left: Math.round(rect.left), top: Math.round(rect.top),
      width: Math.round(rect.width), height: Math.round(rect.height),
      dpr: dpr,
    };

    const padX = 30;
    const padY = 20;
    const cropRect = {
      x: Math.max(0, rect.left - padX),
      y: Math.max(0, rect.top - padY),
      width: rect.width + padX * 2,
      height: rect.height + padY * 2,
      dpr: dpr,
    };

    const capResult = await chrome.runtime.sendMessage({
      action: 'captureArea',
      rect: cropRect,
      tabId: null,
    });

    if (!capResult || !capResult.success) {
      const msg = '截图失败: ' + (capResult?.error || 'unknown');
      dbg.steps.push(msg);
      return { value: '', reason: msg };
    }

    dbg.cropImageBase64 = capResult.imageBase64;
    dbg.cropSize = `${cropRect.width}x${cropRect.height} (DPR=${dpr})`;

    const ocrResult = await chrome.runtime.sendMessage({
      action: 'ocrField',
      imageBase64: capResult.imageBase64,
      fieldType: fieldType,
    });

    if (!ocrResult || !ocrResult.success || !ocrResult.data) {
      const msg = '后端OCR失败: ' + (ocrResult?.error || '无响应');
      dbg.steps.push(msg);
      return { value: '', reason: msg };
    }

    const data = ocrResult.data;
    dbg.ocrRawText = data.rawText || '';
    dbg.ocrCleanedText = data.cleanedText || '';
    dbg.ocrValid = data.valid;
    dbg.ocrReason = data.reason || '';

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
    return { value: '', reason: msg };
  }
}
