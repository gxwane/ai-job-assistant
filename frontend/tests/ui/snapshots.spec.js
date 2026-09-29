import { test } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import * as mock from './fixtures/mock-data.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SNAPSHOT_DIR = path.resolve(__dirname, '../../../docs/ui-snapshots/baseline');

/**
 * 拦截所有前端 API 请求，纯脱机注入高保真 Mock 数据
 */
async function setupApiMocks(page) {
  // 简历相关接口
  await page.route(/\/api\/resume\/list.*/, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mock.mockResumeList) });
  });
  await page.route(/\/api\/resume\/active/, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mock.mockResumeList[0]) });
  });
  await page.route(/\/api\/resume\/\d+/, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mock.mockResumeList[0]) });
  });

  // 历史分析记录与单条详情
  await page.route(/\/api\/history\/list.*/, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: mock.mockHistoryList, total: 4 }) });
  });
  await page.route(/\/api\/history\/\d+/, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mock.mockAnalysisDetail) });
  });
  await page.route(/\/api\/analysis\/history\/\d+/, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mock.mockAnalysisDetail) });
  });

  // 岗位记录与面试题
  await page.route(/\/api\/job-records\/\d+\/interview-questions/, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mock.mockInterviewQuestions) });
  });
  await page.route(/\/api\/job-records\/\d+$/, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mock.mockJobRecords[0]) });
  });
  await page.route(/\/api\/job-records(\?.*)?$/, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: mock.mockJobRecords, total: 4 }) });
  });

  // 数据统计大屏
  await page.route(/\/api\/statistics\/overview/, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mock.mockStatisticsOverview) });
  });
  await page.route(/\/api\/statistics\/score-distribution/, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mock.mockScoreDistribution) });
  });
  await page.route(/\/api\/statistics\/job-funnel/, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mock.mockJobFunnel) });
  });
  await page.route(/\/api\/statistics\/hr-status-distribution/, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mock.mockHrStatusDistribution) });
  });
  await page.route(/\/api\/statistics\/recent-recommended.*/, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mock.mockJobRecords.slice(0, 2)) });
  });

  // 系统配置
  await page.route(/\/api\/settings.*/, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mock.mockSettings) });
  });
}

test.describe('AI-Job-Assistant 全栈 UI 高保真视觉评测套件', () => {

  test('01 - 首页 (Home Hero & Feature Showcase)', async ({ page }) => {
    await setupApiMocks(page);
    await page.goto('/');
    await page.waitForSelector('.app-header');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SNAPSHOT_DIR, '01_home_hero.png'), fullPage: true });
  });

  test('02 - 简历管理与上传页 (Resume Upload & Manager)', async ({ page }) => {
    await setupApiMocks(page);
    await page.goto('/upload');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SNAPSHOT_DIR, '02_resume_upload.png'), fullPage: true });
  });

  test('03 - 岗位分析输入页 (Job Description Analysis Input)', async ({ page }) => {
    await setupApiMocks(page);
    await page.addInitScript((resume) => {
      sessionStorage.setItem('analysis_store', JSON.stringify({
        currentResume: resume,
        jobInfo: { title: '', description: '' },
      }));
    }, mock.mockResumeList[0]);
    await page.goto('/analyze');
    await page.waitForSelector('.analyze-card', { timeout: 10000 });
    await page.fill('input[placeholder*="例如"]', '资深全栈开发专家 (Vue3 / Python)');
    const textarea = page.locator('textarea');
    if (await textarea.count() > 0) {
      await textarea.fill(mock.mockAnalysisDetail.job_description);
    }
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SNAPSHOT_DIR, '03_job_analyze_input.png'), fullPage: true });
  });

  test('04 - 匹配结果打分报告页 (Match Result Report & Radar Chart)', async ({ page }) => {
    await setupApiMocks(page);
    await page.goto('/result/101');
    await page.waitForSelector('.score-dashboard, .result-page', { timeout: 10000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SNAPSHOT_DIR, '04_match_result_report.png'), fullPage: true });
  });

  test('05 - 求职数据大屏页 (Analytics Dashboard & Charts)', async ({ page }) => {
    await setupApiMocks(page);
    await page.goto('/dashboard');
    await page.waitForSelector('.dashboard-page', { timeout: 10000 });
    // 等待 ECharts 渲染与渐变动效完成
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SNAPSHOT_DIR, '05_dashboard_metrics.png'), fullPage: true });
  });

  test('06 - 插件捕获岗位记录页 (Plugin Jobs Table & Status Flow)', async ({ page }) => {
    await setupApiMocks(page);
    await page.goto('/plugin-jobs');
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(SNAPSHOT_DIR, '06_job_history_table.png'), fullPage: true });
  });

  test('07 - 定制面试题生成页 (Interview Questions View)', async ({ page }) => {
    await setupApiMocks(page);
    await page.goto('/interview-questions/201');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SNAPSHOT_DIR, '07_interview_questions.png'), fullPage: true });
  });

  test('08 - 大模型配置中心弹窗 (Settings Modal & Presets)', async ({ page }) => {
    await setupApiMocks(page);
    await page.goto('/');
    await page.waitForSelector('.settings-btn');
    await page.click('.settings-btn');
    await page.waitForSelector('.settings-dialog, .el-dialog', { timeout: 5000 });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SNAPSHOT_DIR, '08_settings_modal.png'), fullPage: false });
  });

  test('09 - 浏览器插件 Popup 弹窗 (Extension Popup View)', async ({ page }) => {
    const popupFile = path.resolve(__dirname, '../../../extension/popup.html').replace(/\\/g, '/');
    await page.goto(`file:///${popupFile}`);
    await page.setViewportSize({ width: 360, height: 600 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SNAPSHOT_DIR, '09_extension_popup.png') });
  });

  test('10 - 脱机 Mock Boss 页面上的扩展悬浮面板 (Extension Floating Panel Injected)', async ({ page }) => {
    const mockBossFile = path.resolve(__dirname, './fixtures/mock_boss_page.html').replace(/\\/g, '/');
    const contentJsPath = path.resolve(__dirname, '../../../extension/content.js');
    
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`file:///${mockBossFile}`);

    // 注入 Chrome Storage Polyfill 确保脱机脚本不报错
    await page.evaluate(() => {
      window.chrome = {
        storage: {
          local: {
            get: (keys, cb) => {
              const res = { resumeId: 1, resumeFilename: '张三_资深全栈架构师.pdf' };
              if (cb) cb(res);
              return Promise.resolve(res);
            },
            set: (obj, cb) => {
              if (cb) cb();
              return Promise.resolve();
            }
          },
          onChanged: { addListener: () => {} }
        },
        runtime: { onMessage: { addListener: () => {} } }
      };
    });

    // 注入编译产物 extension/content.js
    await page.addScriptTag({ path: contentJsPath });

    // 等待面板初始化完成 (content.js 内置 1200ms setTimeout)
    await page.waitForSelector('#ai-job-assistant-panel', { timeout: 5000 });
    await page.waitForTimeout(800);

    // 截图展开状态 (全屏视口与浮窗特写)
    await page.screenshot({ path: path.join(SNAPSHOT_DIR, '10_extension_floating_expanded.png') });
    await page.locator('#ai-job-assistant-panel').screenshot({ path: path.join(SNAPSHOT_DIR, '10_extension_floating_panel_detail.png') });

    // 点击缩小按钮测试折叠态
    const toggleBtn = page.locator('#ai-panel-toggle');
    if (await toggleBtn.count() > 0) {
      await toggleBtn.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(SNAPSHOT_DIR, '11_extension_floating_collapsed.png') });
    }
  });

});
