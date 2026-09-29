import { PANEL_ID } from '../config.js';

export function getPanelCSS() {
  return `
    #${PANEL_ID} {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    #${PANEL_ID} * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    /* 整体磨砂玻璃容器 */
    .ai-panel-container {
      width: 380px;
      max-height: 90vh;
      background: rgba(255, 255, 255, 0.94);
      backdrop-filter: blur(24px) saturate(180%);
      -webkit-backdrop-filter: blur(24px) saturate(180%);
      border-radius: 18px;
      box-shadow:
        0 24px 48px -12px rgba(15, 23, 42, 0.2),
        0 4px 16px -2px rgba(15, 23, 42, 0.08),
        0 0 0 1px rgba(226, 232, 240, 0.85);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    }

    /* 紧凑 / 折叠悬浮胶囊模式 */
    .ai-compact .ai-panel-container {
      width: auto;
      max-height: 52px;
      border-radius: 26px;
      background: rgba(15, 23, 42, 0.92);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.18);
      box-shadow:
        0 16px 36px -8px rgba(0, 0, 0, 0.35),
        0 0 0 1px rgba(255, 255, 255, 0.1);
    }
    .ai-compact .ai-panel-body {
      display: none !important;
    }
    .ai-compact .ai-panel-footer {
      display: none !important;
    }
    .ai-compact .ai-panel-header {
      background: transparent !important;
      padding: 8px 16px;
      gap: 10px;
      color: #fff;
      border-bottom: none;
    }
    .ai-compact .ai-panel-logo {
      background: linear-gradient(135deg, #6366f1, #3b82f6) !important;
      color: #fff !important;
      box-shadow: 0 0 12px rgba(99, 102, 241, 0.6) !important;
    }

    /* 顶部标题栏 */
    .ai-panel-header {
      display: flex;
      align-items: center;
      padding: 13px 18px;
      background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 50%, #2563eb 100%);
      color: #fff;
      gap: 10px;
      cursor: move;
      user-select: none;
      border-bottom: 1px solid rgba(255, 255, 255, 0.15);
      position: relative;
    }
    .ai-panel-header::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
    }
    .ai-panel-logo {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.22);
      backdrop-filter: blur(8px);
      color: #fff;
      font-weight: 800;
      font-size: 13px;
      letter-spacing: -0.5px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(255, 255, 255, 0.35);
      box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.4);
      flex-shrink: 0;
    }
    .ai-panel-title-wrap {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .ai-panel-title {
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.2px;
      white-space: nowrap;
    }
    .ai-panel-badge {
      font-size: 10px;
      padding: 1px 7px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.2);
      color: #e0e7ff;
      font-weight: 500;
      border: 1px solid rgba(255, 255, 255, 0.25);
    }

    /* 标题栏操作按钮 */
    .ai-header-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .ai-panel-toggle, .ai-panel-close {
      width: 26px;
      height: 26px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      background: rgba(255, 255, 255, 0.15);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .ai-panel-toggle:hover, .ai-panel-close:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: scale(1.05);
    }
    .ai-panel-close:hover {
      background: rgba(239, 68, 68, 0.8) !important;
      border-color: rgba(239, 68, 68, 0.9) !important;
    }

    /* 主体内容滚动区 */
    .ai-panel-body {
      padding: 14px 16px;
      overflow-y: auto;
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    /* 滚动条美化 */
    .ai-panel-body::-webkit-scrollbar,
    .ai-scan-log::-webkit-scrollbar,
    .ai-scan-recommended::-webkit-scrollbar {
      width: 5px;
    }
    .ai-panel-body::-webkit-scrollbar-thumb,
    .ai-scan-log::-webkit-scrollbar-thumb,
    .ai-scan-recommended::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 4px;
    }

    /* 模块卡片化基础 */
    .ai-card-section {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px 14px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
    }

    /* 简历状态区 */
    .ai-resume-section {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 10px 12px;
    }
    .ai-resume-header {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .ai-resume-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px 10px;
      gap: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
    }
    .ai-resume-info {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
      flex: 1;
    }
    .ai-resume-file-icon {
      font-size: 14px;
      flex-shrink: 0;
    }
    .ai-resume-name {
      font-size: 12px;
      font-weight: 600;
      color: #1e293b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .ai-resume-status {
      font-size: 10px;
      color: #059669;
      background: #ecfdf5;
      padding: 1px 6px;
      border-radius: 6px;
      font-weight: 600;
      border: 1px solid #a7f3d0;
    }
    .ai-btn-upload {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      color: #475569;
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      flex-shrink: 0;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .ai-btn-upload:hover {
      border-color: #6366f1;
      color: #4f46e5;
      background: #eef2ff;
    }

    /* 单岗位即时分析区 */
    .ai-capture-box {
      margin-top: 4px;
    }
    .ai-panel-hint {
      font-size: 11px;
      color: #94a3b8;
      text-align: center;
      margin: 0 0 8px 0;
      line-height: 1.4;
    }
    .ai-panel-btn {
      width: 100%;
      padding: 11px 14px;
      border: none;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .ai-btn-icon {
      font-size: 14px;
    }
    .ai-btn-primary {
      background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%);
      color: #fff;
      box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35);
    }
    .ai-btn-primary:hover:not(:disabled) {
      box-shadow: 0 6px 20px rgba(79, 70, 229, 0.45);
      transform: translateY(-1px);
    }
    .ai-btn-primary:active:not(:disabled) {
      transform: translateY(0);
    }
    .ai-btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      box-shadow: none;
    }

    /* 分析结果卡片 */
    .ai-result {
      margin-top: 10px;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
    }
    .ai-score-section {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 10px;
    }
    .ai-score-circle {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      border: 3.5px solid #10b981;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      line-height: 1;
      flex-shrink: 0;
      background: #f0fdf4;
      box-shadow: 0 0 16px rgba(16, 185, 129, 0.15);
    }
    .ai-score-num {
      font-size: 22px;
      font-weight: 800;
      color: #065f46;
    }
    .ai-score-label {
      font-size: 10px;
      color: #047857;
      font-weight: 600;
      margin-top: 1px;
    }
    .ai-score-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
    }
    .ai-score-level {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
    }
    .ai-status-badge {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 6px;
      font-weight: 600;
      display: inline-block;
      width: fit-content;
    }
    .ai-status-captured { background: #eff6ff; color: #3b82f6; }
    .ai-status-analyzed { background: #f1f5f9; color: #64748b; }
    .ai-status-recommended { background: #f0fdf4; color: #10b981; border: 1px solid #bbf7d0; }
    .ai-status-applied, .ai-status-interview { background: #fffbeb; color: #f59e0b; border: 1px solid #fde68a; }

    .ai-recommendation {
      font-size: 12px;
      color: #475569;
      line-height: 1.6;
      margin: 8px 0;
      background: #f8fafc;
      padding: 8px 10px;
      border-radius: 8px;
      border-left: 3px solid #3b82f6;
    }
    .ai-hr-info {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 6px 0;
      font-size: 12px;
    }
    .ai-hr-label { color: #94a3b8; }
    .ai-hr-name { font-weight: 600; color: #334155; }
    .ai-composite {
      font-size: 11px;
      color: #4f46e5;
      background: #eef2ff;
      padding: 2px 8px;
      border-radius: 6px;
      font-weight: 600;
    }
    .ai-job-tags {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 5px;
      margin-top: 8px;
    }
    .ai-tags-label { color: #94a3b8; font-size: 11px; }
    .ai-job-tag {
      background: #ecfdf5;
      color: #059669;
      border: 1px solid #a7f3d0;
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 500;
    }
    .ai-btn-success {
      background: linear-gradient(135deg, #10b981, #059669);
      color: #fff;
      margin-top: 8px;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
    }
    .ai-btn-success:hover {
      box-shadow: 0 6px 16px rgba(16, 185, 129, 0.35);
      transform: translateY(-1px);
    }

    /* 自动批量筛选模块 */
    .ai-scan-section {
      border-top: 1px solid #e2e8f0;
      padding-top: 12px;
      margin-top: 2px;
    }
    .ai-scan-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .ai-scan-title {
      font-size: 13px;
      font-weight: 700;
      color: #1e293b;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* 现代 iOS/macOS 风格分段控制器 (Segmented Control) */
    .ai-preset-tabs {
      display: flex;
      background: #f1f5f9;
      padding: 3px;
      border-radius: 9px;
      gap: 3px;
      margin-bottom: 6px;
      border: 1px solid #e2e8f0;
    }
    .ai-preset-tab {
      flex: 1;
      padding: 6px 0;
      border: none;
      border-radius: 7px;
      background: transparent;
      color: #64748b;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      text-align: center;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .ai-preset-tab:hover {
      color: #3b82f6;
    }
    .ai-preset-tab.active {
      background: #fff;
      color: #2563eb;
      font-weight: 700;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
    }
    .ai-preset-desc {
      font-size: 11px;
      color: #64748b;
      margin-bottom: 10px;
      line-height: 1.4;
      min-height: 16px;
      padding: 0 2px;
    }

    /* 参数网格配置区 */
    .ai-scan-config {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 10px 12px;
      margin-bottom: 12px;
    }
    .ai-scan-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
    }
    .ai-scan-label {
      font-size: 11px;
      color: #64748b;
      font-weight: 500;
      white-space: nowrap;
    }
    .ai-scan-input-group,
    .ai-scan-input-wrap {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .ai-scan-input {
      width: 48px;
      height: 26px;
      padding: 0 6px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      text-align: center;
      color: #1e293b;
      background: #fff;
      transition: all 0.2s;
    }
    .ai-scan-input:focus, .ai-scan-select:focus {
      outline: none;
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
    }
    .ai-delay-input {
      width: 38px !important;
    }
    .ai-scan-select {
      height: 26px;
      padding: 0 6px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 11px;
      color: #1e293b;
      background: #fff;
      font-weight: 500;
    }
    .ai-scan-unit {
      font-size: 11px;
      color: #94a3b8;
    }
    .ai-scan-switch-row {
      grid-column: span 2;
      border-top: 1px dashed #e2e8f0;
      padding-top: 6px;
      margin-top: 2px;
    }
    .ai-scan-switch {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 500;
      color: #475569;
      cursor: pointer;
    }

    /* 自动化控制按钮组 */
    .ai-scan-btns {
      display: flex;
      gap: 6px;
      margin-bottom: 10px;
    }
    .ai-scan-btn {
      padding: 7px 12px;
      border: none;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .ai-scan-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .ai-scan-btn-start {
      flex: 2;
      background: linear-gradient(135deg, #2563eb, #3b82f6);
      color: #fff;
      box-shadow: 0 3px 10px rgba(37, 99, 235, 0.3);
    }
    .ai-scan-btn-start:hover:not(:disabled) {
      box-shadow: 0 5px 14px rgba(37, 99, 235, 0.4);
      transform: translateY(-1px);
    }
    .ai-scan-btn-pause {
      flex: 1;
      background: #f59e0b;
      color: #fff;
    }
    .ai-scan-btn-continue {
      flex: 1;
      background: #10b981;
      color: #fff;
    }
    .ai-scan-btn-stop {
      flex: 1;
      background: #ef4444;
      color: #fff;
    }

    /* 状态与控制条 */
    .ai-scan-resume-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .ai-scan-btn-reset {
      padding: 2px 8px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      background: #fff;
      color: #64748b;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    .ai-scan-btn-reset:hover {
      color: #ef4444;
      border-color: #fca5a5;
      background: #fef2f2;
    }

    /* 扫描进度与控制日志面板 */
    .ai-scan-status {
      margin-top: 8px;
      padding: 10px 12px;
      background: #0f172a;
      border-radius: 10px;
      color: #e2e8f0;
    }
    .ai-scan-stats {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 14px;
      font-size: 11px;
      color: #94a3b8;
      margin-bottom: 8px;
    }
    .ai-scan-stats b {
      color: #38bdf8;
      font-weight: 700;
    }
    .ai-scan-log {
      max-height: 120px;
      overflow-y: auto;
      padding: 8px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 6px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      line-height: 1.6;
      border: 1px solid rgba(255, 255, 255, 0.08);
      margin-bottom: 8px;
    }
    .ai-scan-log-entry {
      color: #94a3b8;
      word-break: break-all;
    }
    .ai-scan-log-entry:last-child {
      color: #34d399;
    }

    /* 推荐命中岗位列表 */
    .ai-scan-recommended {
      max-height: 160px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .ai-scan-rec-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 10px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 6px;
      font-size: 11px;
    }
    .ai-scan-rec-info {
      flex: 1;
      min-width: 0;
    }
    .ai-scan-rec-title {
      font-weight: 600;
      color: #f1f5f9;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .ai-scan-rec-company {
      color: #64748b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .ai-scan-rec-score {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-left: 8px;
    }
    .ai-scan-rec-num {
      font-weight: 800;
      font-size: 13px;
      color: #34d399;
    }
    .ai-scan-rec-btn {
      padding: 3px 8px;
      border: 1px solid #38bdf8;
      color: #38bdf8;
      background: transparent;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .ai-scan-rec-btn:hover {
      background: #38bdf8;
      color: #0f172a;
    }
    .ai-scan-rec-done {
      border-color: #34d399;
      color: #34d399;
      cursor: default;
    }

    /* 底部标注栏 */
    .ai-panel-footer {
      padding: 6px 16px 10px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: #94a3b8;
      border-top: 1px solid #f1f5f9;
      background: rgba(255, 255, 255, 0.6);
    }
    .ai-panel-footer a {
      color: #6366f1;
      text-decoration: none;
      font-weight: 500;
    }
    .ai-panel-footer a:hover {
      text-decoration: underline;
    }
  `;
}
