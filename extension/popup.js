// HR要求下拉 → 允许的状态列表
const HR_REQUIREMENT_MAP = {
  "online":  ["在线", "刚刚活跃"],
  "3days":   ["在线", "刚刚活跃", "今日活跃", "3日内活跃"],
  "week":    ["在线", "刚刚活跃", "今日活跃", "3日内活跃", "本周活跃"],
  "month":   ["在线", "刚刚活跃", "今日活跃", "3日内活跃", "本周活跃", "本月活跃"],
  "unlimited": null,
};

const autoComm = document.getElementById('autoComm');
const hrReq = document.getElementById('hrReq');
const statusEl = document.getElementById('status');

// 加载配置
chrome.storage.local.get(['autoComm', 'hrRequirement', 'hrStatusAllowed'], (data) => {
  autoComm.checked = data.autoComm !== false;
  hrReq.value = data.hrRequirement || '3days';
});

// 保存
document.getElementById('save').addEventListener('click', () => {
  const config = {
    autoComm: autoComm.checked,
    hrRequirement: hrReq.value,
    hrStatusAllowed: HR_REQUIREMENT_MAP[hrReq.value] || null,
  };
  chrome.storage.local.set(config, () => {
    statusEl.textContent = '设置已保存';
    setTimeout(() => { statusEl.textContent = ''; }, 1500);
  });
});
