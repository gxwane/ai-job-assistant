import { PANEL_ID } from '../config.js';

export function getPanelCSS() {
  return `
    #${PANEL_ID} {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
      line-height: 1.45;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    #${PANEL_ID},
    #${PANEL_ID} * {
      box-sizing: border-box;
    }
    #${PANEL_ID} p,
    #${PANEL_ID} h1,
    #${PANEL_ID} h2,
    #${PANEL_ID} h3,
    #${PANEL_ID} ul,
    #${PANEL_ID} ol {
      margin: 0;
      padding: 0;
    }

    /* 整体通透磨砂玻璃容器 */
    .ai-panel-container {
      width: 395px;
      max-height: calc(100vh - 48px);
      background: rgba(255, 255, 255, 0.96);
      backdrop-filter: blur(28px) saturate(190%);
      -webkit-backdrop-filter: blur(28px) saturate(190%);
      border-radius: 18px;
      box-shadow:
        0 20px 50px -12px rgba(15, 23, 42, 0.22),
        0 4px 16px -2px rgba(15, 23, 42, 0.06),
        0 0 0 1px rgba(226, 232, 240, 0.9);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    }

    /* 紧凑 / 折叠悬浮胶囊模式 (Sleek Dark Glass Pill) */
    .ai-compact .ai-panel-container {
      width: auto;
      max-height: 44px;
      border-radius: 22px;
      background: rgba(15, 23, 42, 0.90);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.16);
      box-shadow:
        0 16px 36px -8px rgba(0, 0, 0, 0.4),
        0 0 0 1px rgba(255, 255, 255, 0.1);
    }
    .ai-compact .ai-panel-body,
    .ai-compact .ai-panel-footer {
      display: none !important;
    }
    .ai-compact .ai-panel-header {
      background: transparent !important;
      padding: 7px 14px;
      gap: 10px;
      color: #fff;
      border-bottom: none;
    }
    .ai-compact .ai-panel-title {
      color: #f8fafc !important;
      font-size: 13px;
    }
    .ai-compact .ai-panel-badge {
      background: rgba(255, 255, 255, 0.15) !important;
      color: #93c5fd !important;
      border-color: rgba(255, 255, 255, 0.25) !important;
    }
    .ai-compact .ai-panel-toggle,
    .ai-compact .ai-panel-close {
      background: rgba(255, 255, 255, 0.12) !important;
      border-color: rgba(255, 255, 255, 0.18) !important;
      color: #e2e8f0 !important;
    }
    .ai-compact .ai-panel-logo {
      background: linear-gradient(135deg, #6366f1, #3b82f6) !important;
      color: #fff !important;
      box-shadow: 0 0 12px rgba(99, 102, 241, 0.6) !important;
    }

    /* 顶部一体化白底毛玻璃标题栏 */
    .ai-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      background: rgba(255, 255, 255, 0.94);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      color: #0f172a;
      border-bottom: 1px solid #f1f5f9;
      cursor: move;
      user-select: none;
    }
    .ai-panel-header-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .ai-panel-logo {
      width: 26px;
      height: 26px;
      border-radius: 7px;
      background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%);
      color: #ffffff;
      font-size: 12px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 6px rgba(79, 70, 229, 0.3);
      flex-shrink: 0;
    }
    .ai-panel-title-wrap {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .ai-panel-title {
      font-size: 13.5px;
      font-weight: 700;
      letter-spacing: -0.2px;
      color: #0f172a;
      white-space: nowrap;
    }
    .ai-panel-badge {
      font-size: 10px;
      padding: 1px 6px;
      border-radius: 9999px;
      background: #eef2ff;
      color: #4f46e5;
      font-weight: 700;
      border: 1px solid #c7d2fe;
    }

    /* 标题栏操作微按钮 */
    .ai-header-actions {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .ai-panel-toggle,
    .ai-panel-close {
      width: 22px;
      height: 22px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      color: #64748b;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .ai-panel-toggle:hover {
      background: #e2e8f0;
      color: #0f172a;
    }
    .ai-panel-close:hover {
      background: #fee2e2 !important;
      border-color: #fca5a5 !important;
      color: #dc2626 !important;
    }

    /* 主体滚动区 */
    .ai-panel-body {
      padding: 10px 12px;
      overflow-y: auto;
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .ai-panel-body::-webkit-scrollbar,
    .ai-scan-log::-webkit-scrollbar,
    .ai-scan-recommended::-webkit-scrollbar {
      width: 4px;
    }
    .ai-panel-body::-webkit-scrollbar-thumb,
    .ai-scan-log::-webkit-scrollbar-thumb,
    .ai-scan-recommended::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 4px;
    }

    /* Bento 卡片基础 */
    .ai-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 11px;
      padding: 8px 10px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
    }
    .ai-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .ai-card-title-small {
      font-size: 11px;
      font-weight: 700;
      color: #475569;
      letter-spacing: 0.2px;
    }
    .ai-badge-soft {
      font-size: 10px;
      font-weight: 600;
      color: #059669;
      background: #ecfdf5;
      padding: 1px 5px;
      border-radius: 9999px;
      border: 1px solid #a7f3d0;
    }

    /* 简历卡片 */
    .ai-resume-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 6px 8px;
      gap: 8px;
    }
    .ai-resume-info {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
      flex: 1;
    }
    .ai-resume-file-icon {
      font-size: 13px;
      flex-shrink: 0;
    }
    .ai-resume-name {
      font-size: 11.5px;
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
      padding: 1px 5px;
      border-radius: 9999px;
      font-weight: 600;
      border: 1px solid #a7f3d0;
    }
    .ai-btn-upload {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      color: #475569;
      font-size: 10.5px;
      padding: 2px 7px;
      border-radius: 5px;
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

    /* iOS 风格分段控制器 (Segmented Control) */
    .ai-preset-tabs {
      display: flex;
      background: #e2e8f0;
      padding: 2.5px;
      border-radius: 7px;
      gap: 2px;
      margin-bottom: 5px;
    }
    .ai-preset-tab {
      flex: 1;
      padding: 4px 0;
      border: none;
      border-radius: 5px;
      background: transparent;
      color: #64748b;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      text-align: center;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .ai-preset-tab:hover {
      color: #1e293b;
    }
    .ai-preset-tab.active {
      background: #ffffff;
      color: #2563eb;
      font-weight: 700;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    .ai-preset-desc {
      font-size: 10.5px;
      color: #64748b;
      margin-bottom: 6px;
      line-height: 1.35;
      min-height: 14px;
      padding: 0 2px;
    }

    /* 参数网格配置区 */
    .ai-scan-config {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px 8px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 6px 8px;
      margin-bottom: 8px;
    }
    .ai-scan-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 4px;
    }
    .ai-scan-label {
      font-size: 11px;
      color: #64748b;
      font-weight: 500;
      white-space: nowrap;
    }
    .ai-scan-input-group {
      display: flex;
      align-items: center;
      gap: 3px;
    }
    .ai-scan-input {
      width: 44px;
      height: 25px;
      padding: 0 4px;
      border: 1px solid #cbd5e1;
      border-radius: 5px;
      font-size: 11.5px;
      font-weight: 600;
      text-align: center;
      color: #1e293b;
      background: #fff;
      -moz-appearance: textfield;
      transition: all 0.2s;
    }
    .ai-scan-input::-webkit-outer-spin-button,
    .ai-scan-input::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    .ai-scan-input:focus,
    .ai-scan-select:focus {
      outline: none;
      border-color: #6366f1;
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
    }
    .ai-delay-input {
      width: 34px !important;
    }
    .ai-scan-select {
      height: 25px;
      padding: 0 18px 0 6px;
      border: 1px solid #cbd5e1;
      border-radius: 5px;
      font-size: 11px;
      color: #1e293b;
      background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E") no-repeat right 4px center;
      background-size: 10px;
      appearance: none;
      -webkit-appearance: none;
      font-weight: 500;
      cursor: pointer;
    }
    .ai-scan-unit {
      font-size: 10.5px;
      color: #94a3b8;
    }
    .ai-scan-switch-row {
      grid-column: span 2;
      border-top: 1px dashed #e2e8f0;
      padding-top: 5px;
      margin-top: 2px;
    }
    .ai-scan-switch {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      font-weight: 500;
      color: #475569;
      cursor: pointer;
    }

    /* 现代主次控制坞 */
    .ai-scan-actions-wrap {
      display: flex;
      flex-direction: column;
      gap: 5px;
      margin-bottom: 6px;
    }
    .ai-scan-btn-start {
      width: 100%;
      height: 34px;
      border: none;
      border-radius: 7px;
      background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%);
      color: #fff;
      font-size: 12.5px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(79, 70, 229, 0.28);
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .ai-scan-btn-start:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.38);
    }
    .ai-btn-play-icon {
      font-size: 10px;
    }
    .ai-scan-sub-btns {
      display: flex;
      gap: 4px;
    }
    .ai-scan-sub-btns .ai-scan-btn {
      flex: 1;
      height: 26px;
      border-radius: 5px;
      font-size: 10.5px;
      font-weight: 600;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #475569;
      cursor: pointer;
      transition: all 0.2s;
    }
    .ai-scan-sub-btns .ai-scan-btn:hover:not(:disabled) {
      border-color: #94a3b8;
      background: #f1f5f9;
      color: #0f172a;
    }
    .ai-scan-sub-btns .ai-scan-btn-pause:not(:disabled) {
      color: #d97706;
      border-color: #fcd34d;
      background: #fffbeb;
    }
    .ai-scan-sub-btns .ai-scan-btn-continue:not(:disabled) {
      color: #059669;
      border-color: #a7f3d0;
      background: #ecfdf5;
    }
    .ai-scan-sub-btns .ai-scan-btn-stop:not(:disabled) {
      color: #dc2626;
      border-color: #fca5a5;
      background: #fef2f2;
    }
    .ai-scan-sub-btns .ai-scan-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      background: #f8fafc;
    }

    .ai-scan-resume-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }
    .ai-scan-btn-reset {
      padding: 1px 7px;
      border: 1px solid #e2e8f0;
      border-radius: 5px;
      background: #fff;
      color: #64748b;
      font-size: 10.5px;
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
      margin-top: 6px;
      padding: 8px 10px;
      background: #0f172a;
      border-radius: 8px;
      color: #e2e8f0;
    }
    .ai-scan-stats {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 12px;
      font-size: 10.5px;
      color: #94a3b8;
      margin-bottom: 6px;
    }
    .ai-scan-stats b {
      color: #38bdf8;
      font-weight: 700;
    }
    .ai-scan-log {
      max-height: 100px;
      overflow-y: auto;
      padding: 6px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 5px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 10.5px;
      line-height: 1.5;
      border: 1px solid rgba(255, 255, 255, 0.08);
      margin-bottom: 6px;
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
      max-height: 140px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .ai-scan-rec-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 5px 8px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 5px;
      font-size: 10.5px;
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
      gap: 5px;
      margin-left: 6px;
    }
    .ai-scan-rec-num {
      font-weight: 800;
      font-size: 12px;
      color: #34d399;
    }
    .ai-scan-rec-btn {
      padding: 2px 7px;
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

    /* 当前岗位即时诊断卡片 */
    .ai-capture-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
      border: 1px solid #c7d2fe;
      padding: 8px 10px;
    }
    .ai-capture-info {
      flex: 1;
      min-width: 0;
    }
    .ai-capture-title {
      font-size: 11.5px;
      font-weight: 700;
      color: #1e1b4b;
      line-height: 1.2;
    }
    .ai-capture-desc {
      font-size: 10px;
      color: #6366f1;
      margin-top: 2px;
      line-height: 1.3;
      white-space: normal;
    }
    .ai-capture-card .ai-panel-btn {
      width: auto;
      padding: 6px 11px;
      border: none;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 600;
      background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%);
      color: #ffffff;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
      box-shadow: 0 2px 6px rgba(79, 70, 229, 0.25);
      transition: all 0.2s ease;
    }
    .ai-capture-card .ai-panel-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 10px rgba(79, 70, 229, 0.35);
    }
    .ai-btn-icon {
      font-size: 11px;
    }

    /* 分析结果卡片 */
    .ai-result {
      margin-top: 8px;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px;
      box-shadow: 0 3px 10px rgba(0, 0, 0, 0.04);
    }
    .ai-score-section {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }
    .ai-score-circle {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      border: 3px solid #10b981;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      line-height: 1;
      flex-shrink: 0;
      background: #f0fdf4;
      box-shadow: 0 0 14px rgba(16, 185, 129, 0.15);
    }
    .ai-score-num {
      font-size: 20px;
      font-weight: 800;
      color: #065f46;
    }
    .ai-score-label {
      font-size: 9.5px;
      color: #047857;
      font-weight: 600;
      margin-top: 1px;
    }
    .ai-score-info {
      display: flex;
      flex-direction: column;
      gap: 3px;
      flex: 1;
    }
    .ai-score-level {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
    }
    .ai-status-badge {
      font-size: 10.5px;
      padding: 1px 7px;
      border-radius: 5px;
      font-weight: 600;
      display: inline-block;
      width: fit-content;
    }
    .ai-status-captured { background: #eff6ff; color: #3b82f6; }
    .ai-status-analyzed { background: #f1f5f9; color: #64748b; }
    .ai-status-recommended { background: #f0fdf4; color: #10b981; border: 1px solid #bbf7d0; }
    .ai-status-applied, .ai-status-interview { background: #fffbeb; color: #f59e0b; border: 1px solid #fde68a; }

    .ai-recommendation {
      font-size: 11.5px;
      color: #475569;
      line-height: 1.55;
      margin: 6px 0;
      background: #f8fafc;
      padding: 7px 9px;
      border-radius: 7px;
      border-left: 3px solid #3b82f6;
    }
    .ai-hr-info {
      display: flex;
      align-items: center;
      gap: 5px;
      margin: 5px 0;
      font-size: 11.5px;
    }
    .ai-hr-label { color: #94a3b8; }
    .ai-hr-name { font-weight: 600; color: #334155; }
    .ai-composite {
      font-size: 10.5px;
      color: #4f46e5;
      background: #eef2ff;
      padding: 1px 6px;
      border-radius: 5px;
      font-weight: 600;
    }
    .ai-job-tags {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px;
      margin-top: 6px;
    }
    .ai-tags-label { color: #94a3b8; font-size: 10.5px; }
    .ai-job-tag {
      background: #ecfdf5;
      color: #059669;
      border: 1px solid #a7f3d0;
      padding: 1px 6px;
      border-radius: 5px;
      font-size: 10.5px;
      font-weight: 500;
    }

    .ai-btn-success {
      width: 100%;
      padding: 8px 12px;
      border: none;
      border-radius: 7px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      background: linear-gradient(135deg, #10b981, #059669);
      color: #fff;
      margin-top: 6px;
      box-shadow: 0 3px 10px rgba(16, 185, 129, 0.25);
      transition: all 0.2s;
    }
    .ai-btn-success:hover {
      box-shadow: 0 5px 14px rgba(16, 185, 129, 0.35);
      transform: translateY(-1px);
    }

    /* 底部标注栏 */
    .ai-panel-footer {
      padding: 6px 14px 8px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10.5px;
      color: #94a3b8;
      border-top: 1px solid #f1f5f9;
      background: rgba(255, 255, 255, 0.7);
    }
    .ai-panel-link {
      color: #6366f1;
      text-decoration: none;
      font-weight: 600;
    }
    .ai-panel-link:hover {
      text-decoration: underline;
    }
  `;
}
