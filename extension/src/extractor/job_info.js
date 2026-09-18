/**
 * AI求职助手 - 岗位信息主提取策略
 */
import { runtimeState } from '../store/state.js';
import { extractByOCR, isValidCompany, isValidSalary, isBlacklisted } from './ocr_helper.js';
import { cleanJobDescription, getVisibleText, findLocationFromPage, isJobContent } from './jd_cleaner.js';

export function isValidJobTitle(text) {
  if (!text) return false;
  const t = text.trim();
  const exactInvalid = [
    '职位描述', '岗位职责', '任职要求', '岗位要求', '工作地址', '公司介绍',
    '工作内容', '职位要求', '岗位描述', '技能要求',
  ];
  if (exactInvalid.includes(t)) return false;

  const hrWords = [
    '刚刚活跃', '先生', '女士', 'HR', '人事', '招聘者',
    '主管', '经理', '在线', '活跃', '离线',
  ];
  if (hrWords.some(k => t.includes(k))) return false;

  if (/^[\u4e00-\u9fa5]{1,4}(先生|女士)(.+(活跃|在线))?$/.test(t)) return false;
  if (/^(先生|女士|在线|活跃|HR|人事|招聘)/.test(t)) return false;

  const buttonWords = ['收藏', '立即沟通', '举报', '分享', '微信扫码', '工作地址', '点击查看'];
  if (buttonWords.some(k => t.includes(k))) return false;

  if (t.length < 3 || t.length > 80) return false;
  return true;
}

export function cleanTitle(text) {
  const cutIdx = text.search(/[□\uE000-\uF8FF\u200b\u200c\u200d\u200e\u200f\ufeff\u00A0]/);
  if (cutIdx > 0) {
    text = text.substring(0, cutIdx);
  }
  return text
    .replace(/\d+[-~—–]\d+元\/[天日]/g, '')
    .replace(/\d+[-~—–]\d+[Kk]([·\u00b7]\d+薪)?/g, '')
    .replace(/职位描述|岗位职责|任职要求|工作地址|岗位要求|工作内容/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractTitleFromDetail(detailPanel) {
  const ctx = detailPanel || document;
  const h1List = [...ctx.querySelectorAll('h1')];
  for (const h1 of h1List) {
    const text = getVisibleText(h1).trim();
    if (isValidJobTitle(text)) {
      return cleanTitle(text);
    }
  }

  if (detailPanel) {
    const bossArea = detailPanel.querySelector('[class*="boss"], [class*="recruiter"], [class*="contact"]');
    const candidates = detailPanel.querySelectorAll('.job-title, .name:not(.boss-name), [class*="title"]:not([class*="boss"])');
    for (const el of candidates) {
      if (bossArea && bossArea.contains(el)) continue;
      const text = getVisibleText(el).trim();
      if (isValidJobTitle(text) && text.length > 5) {
        return cleanTitle(text);
      }
    }
  }

  const allH1 = [...document.querySelectorAll('h1')];
  for (const h1 of allH1) {
    const rect = h1.getBoundingClientRect();
    if (rect.left < window.innerWidth * 0.3) continue;
    const text = getVisibleText(h1).trim();
    if (isValidJobTitle(text)) {
      return cleanTitle(text);
    }
  }
  return '';
}

export function extractWorkAddress() {
  const allNodes = [...document.querySelectorAll('h2, h3, h4, div, span, p, strong, b')];
  const titleNode = allNodes.find(el => {
    const text = el.innerText ? el.innerText.trim() : el.textContent.trim();
    return text === '工作地址' && text.length === 4;
  });
  if (!titleNode) return '';

  let container = titleNode.parentElement;
  for (let i = 0; i < 5 && container; i++) {
    const text = container.innerText ? container.innerText.trim() : getVisibleText(container);
    const cleaned = cleanAddress(text);
    if (cleaned && cleaned.length >= 4) return cleaned;
    container = container.parentElement;
  }

  let sibling = titleNode.nextElementSibling;
  let addrParts = [];
  while (sibling) {
    const t = sibling.innerText ? sibling.innerText.trim() : getVisibleText(sibling);
    if (t && !/点击查看地图|查看地图|职位描述|岗位职责/.test(t)) {
      addrParts.push(t);
    }
    sibling = sibling.nextElementSibling;
  }
  return cleanAddress(addrParts.join(''));
}

export function cleanAddress(text) {
  if (!text) return '';
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

export function findDetailPanel() {
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

export function findSelectedCard() {
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

export function extractCompanyFromPanel(panel) {
  const blocks = panel.querySelectorAll(
    '[class*="boss"], [class*="company"], [class*="recruiter"], [class*="info-block"], div'
  );
  for (const block of blocks) {
    const text = getVisibleText(block);
    if (text.length < 5 || text.length > 200) continue;
    const match = text.match(/在线\s+(.+?)(?:\s*[·.]\s*HR|\s*·\s*HR)/);
    if (match && isValidCompany(match[1].trim())) {
      return { value: match[1].trim(), source: 'DOM(详情)' };
    }
    const link = block.querySelector('a[href*="/gongsi/"]');
    if (link && isValidCompany(link.textContent.trim())) {
      return { value: link.textContent.trim(), source: 'DOM(链接)' };
    }
  }
  return { value: '', source: 'DOM' };
}

export function extractJobDescription() {
  const jdHeadingEl = findJdHeading();
  if (jdHeadingEl) {
    let collected = [];
    let sibling = jdHeadingEl.nextElementSibling;
    const stopTags = ['H1', 'H2', 'H3', 'H4', 'H5'];
    const stopKeywords = ['工作地址', '点击查看地图', '去App与BOSS随时沟通', '前往App与BOSS随时沟通'];
    while (sibling && !stopTags.includes(sibling.tagName)) {
      const tag = sibling.tagName;
      const cls = (sibling.className || '').toString().toLowerCase();
      if (['UL', 'P', 'DIV'].includes(tag) && !isBlacklisted(cls)) {
        const quickText = sibling.innerText ? sibling.innerText.trim() : '';
        if (stopKeywords.some((kw) => quickText.includes(kw))) break;
        const visible = getVisibleText(sibling);
        if (visible.length > 0) collected.push(visible);
      }
      sibling = sibling.nextElementSibling;
    }
    let text = cleanJobDescription(collected.join('\n'));
    if (text.length >= 80) return text;
  }

  if (jdHeadingEl) {
    for (const cls of ['job-detail-body', 'job-detail-box']) {
      const container = jdHeadingEl.closest('.' + cls);
      if (container) {
        let text = cleanJobDescription(getVisibleText(container));
        if (text.length >= 80) return text;
      }
    }
  }

  const jdSelectors = ['.job-detail-body', '.job-detail-box', '[class*="job-detail"]', '.detail-content'];
  for (const sel of jdSelectors) {
    try {
      const el = document.querySelector(sel);
      if (el) {
        let text = cleanJobDescription(getVisibleText(el));
        if (text.length >= 80) return text;
      }
    } catch (e) {}
  }

  let bestText = '';
  const candidates = document.querySelectorAll('div, section, article');
  for (const el of candidates) {
    let text = cleanJobDescription(getVisibleText(el));
    if (text.length > bestText.length && text.length > 80 && text.length < 8000 && isJobContent(text)) {
      bestText = text;
    }
  }
  return bestText;
}

function findJdHeading() {
  const jdHeadings = ['职位描述', '岗位职责', '任职要求', '工作内容', '职位要求', '岗位要求', '岗位描述'];
  const allHeadings = document.querySelectorAll('h1, h2, h3, h4, h5, strong, b, div, span');
  for (const el of allHeadings) {
    const text = el.innerText ? el.innerText.trim() : '';
    if (jdHeadings.some((kw) => text === kw || (text.includes(kw) && text.length < 20))) {
      return el;
    }
  }
  return null;
}

export async function extractJobInfo() {
  runtimeState.fieldSources = {};
  runtimeState.ocrDebug = {};

  const jobUrl = window.location.href;
  const detailPanel = findDetailPanel();
  const selectedCard = findSelectedCard();

  let jobTitle = extractTitleFromDetail(detailPanel);
  if (!jobTitle && selectedCard) {
    const cardTitle = selectedCard.querySelector('.job-name, .name, [class*="title"], a');
    if (cardTitle) {
      const ct = cardTitle.textContent.trim();
      if (isValidJobTitle(ct)) jobTitle = cleanTitle(ct);
    }
  }
  if (!jobTitle) jobTitle = '-';
  runtimeState.fieldSources.jobTitle = jobTitle !== '-' ? 'DOM' : '失败';

  if (!isValidJobTitle(jobTitle) || jobTitle === '-') {
    const pageTitle = document.title.replace(/[-|].*$/, '').trim();
    if (isValidJobTitle(pageTitle) && pageTitle.length > 3) {
      jobTitle = pageTitle;
      runtimeState.fieldSources.jobTitle = 'DOM(页面标题)';
    } else {
      jobTitle = '-';
      runtimeState.fieldSources.jobTitle = '失败(无效标题)';
    }
  }

  let company = '';
  if (selectedCard) {
    const compEl = selectedCard.querySelector('a[href*="/gongsi/"], a[href*="company"], [class*="company"] a, [class*="company"]');
    if (compEl) {
      const ct = compEl.textContent.trim();
      if (isValidCompany(ct)) {
        company = ct;
        runtimeState.fieldSources.company = 'DOM(卡片)';
      }
    }
  }

  if (!isValidCompany(company) && detailPanel) {
    let { value, source } = extractCompanyFromPanel(detailPanel);
    company = value;
    if (isValidCompany(company)) runtimeState.fieldSources.company = source;
  }

  if (!isValidCompany(company)) {
    let { value, source } = extractCompanyFromPanel(document.body);
    company = value;
    if (isValidCompany(company)) runtimeState.fieldSources.company = source;
  }

  if (!isValidCompany(company)) {
    const ocrComp = await extractByOCR('company');
    if (ocrComp.value) {
      company = ocrComp.value;
      runtimeState.fieldSources.company = 'OCR';
    } else {
      company = '-';
      runtimeState.fieldSources.company = '失败';
    }
  }

  let salary = '';
  let salaryDOM = '';
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

  if (!isValidSalary(salaryDOM)) {
    const ocrSal = await extractByOCR('salary');
    if (ocrSal.value) {
      salary = ocrSal.value;
      runtimeState.fieldSources.salary = 'OCR';
    } else {
      salary = '-';
      runtimeState.fieldSources.salary = '失败';
    }
  } else {
    salary = salaryDOM;
    runtimeState.fieldSources.salary = 'DOM';
  }

  let location = extractWorkAddress();
  if (location) {
    runtimeState.fieldSources.location = 'DOM(工作地址)';
  } else {
    if (detailPanel) {
      const locEl = detailPanel.querySelector('[class*="location"], [class*="address"], [class*="area"]');
      if (locEl) {
        location = cleanAddress(locEl.textContent.trim()).substring(0, 15);
      }
    }
    if (location) {
      runtimeState.fieldSources.location = 'DOM(顶部)';
    } else if (selectedCard) {
      const locEl = selectedCard.querySelector('[class*="location"], [class*="address"], [class*="area"]');
      if (locEl) location = cleanAddress(locEl.textContent.trim()).substring(0, 15);
      runtimeState.fieldSources.location = location ? 'DOM(卡片)' : '失败';
    }
    if (!location) {
      location = findLocationFromPage();
      runtimeState.fieldSources.location = location ? 'DOM兜底' : '失败';
    }
  }

  location = cleanAddress(location || '');
  let jobDescription = extractJobDescription();
  runtimeState.fieldSources.jobDescription = jobDescription ? 'DOM' : '失败';

  if (!isValidJobTitle(jobTitle) || jobTitle === '职位描述') {
    jobTitle = '-';
  }
  if (!location || location === '-' || location.length < 2) {
    location = findLocationFromPage() || '-';
  }

  return { jobTitle, company, salary, location, jobDescription, jobUrl };
}
