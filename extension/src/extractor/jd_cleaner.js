/**
 * AI求职助手 - JD 文本提取与清洗
 */

export function isVisibleElement(el) {
  if (!el || el.nodeType !== 1) return true;
  const tag = el.tagName.toLowerCase();
  if (['style', 'script', 'noscript', 'svg', 'path', 'meta', 'link'].includes(tag)) {
    return false;
  }
  if (el.hidden || el.getAttribute('aria-hidden') === 'true') return false;
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
  } catch (e) {}
  return true;
}

export function getVisibleText(root) {
  if (!root) return '';
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

export function cleanJobDescription(text) {
  if (!text) return '';

  text = text.replace(/[□\uE000-\uF8FF\u200b\u200c\u200d\u200e\u200f\ufeff]/g, '');
  text = text.replace(/\.[\w-]+\s*\{[^}]*\}/g, '');
  text = text.replace(/来自BOSS直聘/g, '');
  text = text.replace(/BOSS直聘/g, '');
  text = text.replace(/\bkanzhun\b/gi, '');
  text = text.replace(/岗boss位/gi, '岗位');
  text = text.replace(/岗kanzhun位/gi, '岗位');
  text = text.replace(/\b(boss|kanzhun)\b/gi, '');

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
      break;
    }
  }

  const buttonWords = ['收藏', '立即沟通', '举报', '微信扫码分享', '分享'];
  for (const word of buttonWords) {
    text = text.replace(new RegExp(word, 'g'), '');
  }

  text = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => {
      if (line.length === 0) return false;
      if (/^[{};:#.\s]+$/.test(line)) return false;
      if (/^@[\w-]/.test(line)) return false;
      return true;
    })
    .join('\n');

  text = text.replace(/[\t ]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  return text;
}

export function isJobContent(text) {
  if (!text || text.length < 80) return false;

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

  const jdWords = [
    '岗位职责', '任职要求', '职位描述', '工作内容', '岗位要求',
    '岗位描述', '技能要求', '加分项', '优先考虑',
  ];
  let jdScore = 0;
  for (const w of jdWords) {
    if (text.includes(w)) jdScore += 3;
  }

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

  return jdScore >= 6 || (jdScore >= 3 && text.length > 300);
}

export function findLocationFromPage() {
  const majorCities = [
    '北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '南京',
    '西安', '重庆', '苏州', '天津', '长沙', '郑州', '济南', '青岛',
    '合肥', '福州', '厦门', '东莞', '佛山', '无锡', '宁波', '大连',
    '沈阳', '哈尔滨', '长春', '昆明', '贵阳', '南宁', '海口', '拉萨',
    '银川', '西宁', '兰州', '呼和浩特', '乌鲁木齐', '石家庄', '太原',
  ];

  const candidates = document.querySelectorAll(
    '.job-location, .location-address, .address-text, .job-area, .detail-location, ' +
    '.location, .city-name, .current-city, [class*="address"], [class*="location"]'
  );
  for (const el of candidates) {
    const t = el.innerText?.trim() || '';
    for (const city of majorCities) {
      if (t.includes(city)) return city;
    }
  }

  const allText = document.body.innerText || '';
  for (const city of majorCities) {
    const idx = allText.indexOf(city);
    if (idx !== -1 && idx < 5000) return city;
  }
  return null;
}
