import { PANEL_ID } from '../config.js';

export function getPanelCSS() {
  return `
    #${PANEL_ID} {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 99999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .ai-panel-container {
      width: 360px;
      max-height: 92vh;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.15);
      overflow: hidden;
      border: 1px solid #e8e8e8;
      display: flex; flex-direction: column;
    }
    /* 紧凑模式 */
    .ai-compact .ai-panel-container { width: 320px; max-height: 260px; }
    .ai-panel-body { padding: 12px 14px; overflow-y: auto; flex: 1; min-height: 0; }
    .ai-panel-header {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      background: linear-gradient(135deg, #409EFF, #337ECC);
      color: #fff;
      gap: 8px;
    }
    .ai-panel-logo {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      background: #fff;
      color: #409EFF;
      font-weight: 800;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .ai-panel-title {
      flex: 1;
      font-size: 15px;
      font-weight: 600;
    }
    .ai-panel-close {
      background: none;
      border: none;
      color: #fff;
      font-size: 20px;
      cursor: pointer;
      line-height: 1;
      padding: 0 4px;
      opacity: 0.8;
    }
    .ai-panel-close:hover { opacity: 1; }
    .ai-panel-btn {
      width: 100%;
      padding: 8px 12px;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    .ai-btn-primary { background: #409EFF; color: #fff; }
    .ai-btn-primary:hover:not(:disabled) { background: #337ECC; }
    .ai-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .ai-btn-success { background: #67C23A; color: #fff; margin-top: 8px; }
    .ai-btn-success:hover { background: #529b2e; }
    .ai-btn-outline { background: #fff; border: 1px solid #dcdfe6; color: #606266; margin-top: 6px; }
    .ai-btn-outline:hover { border-color: #409EFF; color: #409EFF; }
    .ai-panel-loading, .ai-loading { color: #909399; font-size: 13px; text-align: center; margin: 12px 0; }
    .ai-error { color: #F56C6C; font-size: 12px; margin-top: 8px; }
    .ai-error p { margin: 4px 0; font-weight: 500; }
    .ai-hint { color: #909399; margin: 4px 0 2px 0; }
    .ai-error ul { margin: 2px 0; padding-left: 18px; color: #606266; }
    .ai-result { margin-top: 10px; }
    .ai-score-section { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
    .ai-score-circle {
      width: 52px; height: 52px; border-radius: 50%; border: 3px solid #67C23A;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      line-height: 1; flex-shrink: 0;
    }
    .ai-score-num { font-size: 20px; font-weight: 700; }
    .ai-score-label { font-size: 10px; opacity: 0.8; }
    .ai-score-info { display: flex; flex-direction: column; gap: 4px; }
    .ai-score-level { font-size: 15px; font-weight: 600; }
    .ai-status-badge { font-size: 11px; padding: 2px 6px; border-radius: 4px; display: inline-block; width: fit-content; }
    .ai-status-captured { background: #ecf5ff; color: #409EFF; }
    .ai-status-analyzed { background: #f4f4f5; color: #909399; }
    .ai-status-recommended { background: #f0f9eb; color: #67C23A; }
    .ai-status-applied, .ai-status-interview { background: #fdf6ec; color: #E6A23C; }
    .ai-recommendation { font-size: 12px; color: #606266; line-height: 1.5; margin: 6px 0; }
    .ai-hr-info { display: flex; align-items: center; gap: 6px; margin: 6px 0; font-size: 12px; }
    .ai-hr-label { color: #909399; }
    .ai-hr-name { font-weight: 500; color: #303133; }
    .ai-composite { font-size: 11px; color: #409EFF; background: #ecf5ff; padding: 1px 6px; border-radius: 4px; }
    .ai-job-tags { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin: 6px 0; font-size: 12px; }
    .ai-tags-label { color: #909399; }
    .ai-job-tag { background: #f0f9eb; color: #67C23A; border: 1px solid #c6e2b3; padding: 1px 6px; border-radius: 4px; font-size: 11px; }
    .ai-success-msg { color: #67C23A; font-size: 12px; margin: 4px 0 0 0; }
    /* 岗位加载区域 */
    .ai-load-section { margin: 14px 0 6px 0; padding: 10px 12px; background: #f0f9ff; border-radius: 8px; border: 1px solid #d9ecff; }
    .ai-load-status { font-size: 12px; color: #666; margin-bottom: 8px; }
    .ai-load-status b { color: #333; }
    .ai-load-btns { display: flex; gap: 6px; }
    /* 自动筛选区域 */
    .ai-scan-section { margin-top: 16px; }
    .ai-scan-divider { border-top: 1px solid #ebeef5; margin-bottom: 12px; }
    .ai-scan-title { font-size: 14px; font-weight: 600; color: #333; margin-bottom: 10px; }
    .ai-scan-config { display: flex; flex-wrap: wrap; gap: 6px 14px; margin-bottom: 10px; }
    .ai-scan-row { display: flex; align-items: center; gap: 4px; }
    .ai-scan-label { font-size: 12px; color: #666; white-space: nowrap; }
    .ai-scan-input { width: 48px; height: 22px; padding: 0 4px; border: 1px solid #dcdfe6; border-radius: 4px; font-size: 12px; text-align: center; }
    .ai-scan-select { width: 100px; height: 24px; padding: 0 4px; border: 1px solid #dcdfe6; border-radius: 4px; font-size: 12px; background: #fff; }
    .ai-scan-unit { font-size: 11px; color: #999; }
    .ai-scan-delay { font-size: 12px; color: #666; }
    .ai-scan-switch-row { margin-top: 2px; }
    .ai-scan-switch { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #666; cursor: pointer; }
    .ai-scan-switch input { cursor: pointer; }
    .ai-scan-btns { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
    .ai-scan-btn {
      padding: 5px 10px; border: none; border-radius: 6px; font-size: 12px;
      font-weight: 500; cursor: pointer; transition: all 0.2s;
    }
    .ai-scan-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .ai-scan-btn-start { background: #409EFF; color: #fff; }
    .ai-scan-btn-start:hover:not(:disabled) { background: #337ECC; }
    .ai-scan-btn-diag { background: #909399; color: #fff; }
    .ai-scan-btn-diag:hover:not(:disabled) { background: #73767a; }
    .ai-scan-resume-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .ai-scan-btn-reset { padding: 3px 8px; border: 1px solid #dcdfe6; border-radius: 4px; background: #fff; color: #909399; font-size: 11px; cursor: pointer; }
    .ai-scan-btn-reset:hover { color: #F56C6C; border-color: #F56C6C; }
    .ai-scan-btn-pause { background: #E6A23C; color: #fff; }
    .ai-scan-btn-continue { background: #67C23A; color: #fff; }
    .ai-scan-btn-stop { background: #F56C6C; color: #fff; }
    .ai-scan-status { margin-top: 8px; padding: 8px; background: #f8f9ff; border-radius: 6px; }
    .ai-scan-stats { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 11px; color: #666; margin-bottom: 8px; }
    .ai-scan-stats b { color: #333; }
    .ai-scan-log {
      max-height: 140px; overflow-y: auto; padding: 6px 8px;
      background: #fff; border-radius: 4px; font-size: 11px; line-height: 1.6;
      border: 1px solid #ebeef5; margin-bottom: 8px;
    }
    .ai-scan-log-entry { color: #666; word-break: break-all; }
    .ai-scan-recommended { max-height: 180px; overflow-y: auto; }
    .ai-scan-rec-item {
      display: flex; justify-content: space-between; align-items: center;
      padding: 6px 8px; margin-bottom: 4px; background: #f0f9eb; border-radius: 4px;
      font-size: 12px;
    }
    .ai-scan-rec-info { flex: 1; min-width: 0; }
    .ai-scan-rec-title { font-weight: 500; color: #333; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ai-scan-rec-company { color: #999; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px; }
    .ai-scan-rec-score { display: flex; align-items: center; gap: 6px; color: #666; white-space: nowrap; margin-left: 8px; }
    .ai-scan-rec-num { font-weight: 700; font-size: 15px; color: #67C23A; }
    .ai-scan-rec-status { font-size: 10px; padding: 1px 6px; border-radius: 3px; }
    .ai-scan-rec-rec { background: #ecf5ff; color: #409EFF; }
    .ai-scan-rec-comm { background: #f0f9eb; color: #67C23A; }
    .ai-scan-rec-btn {
      padding: 2px 8px; border: 1px solid #409EFF; color: #409EFF; background: #fff;
      border-radius: 3px; font-size: 11px; cursor: pointer; transition: all 0.2s;
    }
    .ai-scan-rec-btn:hover { background: #409EFF; color: #fff; }
    .ai-scan-rec-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .ai-scan-rec-done { border-color: #67C23A; color: #67C23A; cursor: default; }
  `;
}
