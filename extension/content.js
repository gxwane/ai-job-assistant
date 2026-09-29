(function(){"use strict";const v="ai-job-assistant-panel",B="http://127.0.0.1:8000/api",ie={在线:"#67C23A",刚刚活跃:"#67C23A",今日活跃:"#67C23A","3日内活跃":"#E6A23C",本周活跃:"#E6A23C",本月活跃:"#F56C6C",两周内活跃:"#F56C6C",两月内活跃:"#F56C6C","3月内活跃":"#F56C6C",半年前活跃:"#909399"},J={online:["在线","刚刚活跃"],"3days":["在线","刚刚活跃","今日活跃","3日内活跃"],week:["在线","刚刚活跃","今日活跃","3日内活跃","本周活跃"],month:["在线","刚刚活跃","今日活跃","3日内活跃","本周活跃","本月活跃"],unlimited:null},se={online:"仅在线","3days":"3日内活跃",week:"本周内活跃",month:"本月内活跃",unlimited:"不限制"},j={minDelayFloor:5,maxDelayFloor:10,dailyLimitCeiling:50,maxScanCeiling:100,maxCommCeiling:30},A={safe:{id:"safe",name:"稳健防封",icon:"🛡️",description:"新号/敏感期推荐，高拟人长延时，严苛HR过滤",minDelay:20,maxDelay:50,threshold:85,maxScanCount:15,maxAutoCommunicateCount:2,dailyLimit:15,autoCommunicate:!1,hrRequirement:"3days"},standard:{id:"standard",name:"标准平衡",icon:"⚖️",description:"日常求职推荐，拟人化时延与适度沟通",minDelay:12,maxDelay:30,threshold:80,maxScanCount:30,maxAutoCommunicateCount:5,dailyLimit:25,autoCommunicate:!1,hrRequirement:"week"},fast:{id:"fast",name:"快速初筛",icon:"⚡",description:"仅批量打分推荐，强制关闭沟通，快速遍历",minDelay:5,maxDelay:12,threshold:75,maxScanCount:50,maxAutoCommunicateCount:0,dailyLimit:0,autoCommunicate:!1,hrRequirement:"unlimited"},custom:{id:"custom",name:"自定义",icon:"⚙️",description:"在安全底线内自由微调各项参数"}},g={mode:"expanded",left:null,top:null,dragging:!1,dragStartX:0,dragStartY:0,startLeft:0,startTop:0},o={status:"idle",currentIndex:0,totalCards:0,analyzedCount:0,recommendedCount:0,communicatedCount:0,failedCount:0,presetMode:"standard",threshold:80,maxScanCount:30,maxAutoCommunicateCount:5,dailyLimit:25,autoCommunicate:!1,hrRequirement:"week",hrStatusAllowed:["在线","刚刚活跃","今日活跃","3日内活跃","本周活跃"],minDelay:12,maxDelay:30,results:[],stopRequested:!1,pauseRequested:!1,sessionId:null,seenKeys:new Set,pageKey:"",resumeFromLast:!0,pageDone:!1,scrollCount:0,controlVersion:0,activeAbortController:null,pausedAtStep:null};function R(e={}){let t=Math.max(j.minDelayFloor,Number(e.minDelay)||12),a=Math.max(j.maxDelayFloor,Number(e.maxDelay)||30);a<t&&(a=t+3);const n=Math.max(0,Math.min(100,Number(e.threshold)||80)),i=Math.max(1,Math.min(j.maxScanCeiling,Number(e.maxScanCount)||30)),s=Math.max(0,Math.min(j.maxCommCeiling,Number(e.maxAutoCommunicateCount)??5)),r=Math.max(0,Math.min(j.dailyLimitCeiling,Number(e.dailyLimit)??25)),c=!!e.autoCommunicate,d=e.hrRequirement in J?e.hrRequirement:"week",l=J[d];return{presetMode:e.presetMode||"standard",minDelay:t,maxDelay:a,threshold:n,maxScanCount:i,maxAutoCommunicateCount:s,dailyLimit:r,autoCommunicate:c,hrRequirement:d,hrStatusAllowed:l}}async function $(){const e={scanConfig:{presetMode:o.presetMode,minDelay:o.minDelay,maxDelay:o.maxDelay,threshold:o.threshold,maxScanCount:o.maxScanCount,maxAutoCommunicateCount:o.maxAutoCommunicateCount,dailyLimit:o.dailyLimit,autoCommunicate:o.autoCommunicate,hrRequirement:o.hrRequirement}};try{typeof chrome<"u"&&chrome.storage&&chrome.storage.local?await chrome.storage.local.set(e):localStorage.setItem("ai_job_scan_config",JSON.stringify(e.scanConfig))}catch{}}async function re(){let e=null;try{if(typeof chrome<"u"&&chrome.storage&&chrome.storage.local)e=(await chrome.storage.local.get(["scanConfig"])).scanConfig;else{const t=localStorage.getItem("ai_job_scan_config");t&&(e=JSON.parse(t))}}catch{}if(e){const t=R(e);Object.assign(o,t)}return o}const m={currentJobRecordId:null,currentResume:null,fieldSources:{},ocrDebug:{}};function ce(){o.status="idle",o.currentIndex=0,o.totalCards=0,o.analyzedCount=0,o.recommendedCount=0,o.communicatedCount=0,o.failedCount=0,o.results=[],o.stopRequested=!1,o.pauseRequested=!1,o.sessionId=null,o.seenKeys=new Set,o.pageKey="",o.scrollCount=0,o.activeAbortController=null,o.pausedAtStep=null}function le(){return`
    #${v} {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
      line-height: 1.45;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    #${v},
    #${v} * {
      box-sizing: border-box;
    }
    #${v} p,
    #${v} h1,
    #${v} h2,
    #${v} h3,
    #${v} ul,
    #${v} ol {
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
  `}async function de(){try{const e=await fetch(`${B}/resume/default`);if(e.ok){const t=await e.json();if(t.resume_id)return{id:t.resume_id,filename:t.filename||"已上传简历"}}}catch{}return null}async function ue(e){const t=new FormData;t.append("file",e);const a=await fetch(`${B}/resume/upload`,{method:"POST",body:t});if(!a.ok){const i=await a.json().catch(()=>({}));throw new Error(i.detail||`上传失败 (${a.status})`)}const n=await a.json();return{id:n.resume_id,filename:n.filename}}async function pe(e,t=6e4,a=1500,n=null){const i=Date.now();for(;Date.now()-i<t;){if(n&&n.aborted)throw new DOMException("Aborted","AbortError");await new Promise(s=>setTimeout(s,a));try{const s=await fetch(`${B}/job-records/${e}`,{method:"GET",headers:{"Content-Type":"application/json"},signal:n||void 0});if(!s.ok)continue;const r=await s.json();if(r.analysis_status==="done")return r.job_record_id=r.id,r.should_recommend=r.status==="recommended"||r.match_score!=null&&r.match_score>=70,r;if(r.analysis_status==="failed")throw new Error("AI 后台分析失败，请检查服务日志")}catch(s){if(s.name==="AbortError")throw s;console.warn("[AI求职助手] 轮询岗位分析状态出现非阻断异常:",s)}}throw new Error("AI 分析轮询超时（60秒），可在后台历史记录中查看")}async function K(e,t=null){const a=await fetch(`${B}/plugin/job-capture`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e),signal:t||void 0});if(!a.ok){const i=await a.json().catch(()=>({}));throw new Error(i.detail||`HTTP ${a.status}`)}let n=await a.json();return(n.analysis_status==="pending"||n.analysis_status==="running")&&(n=await pe(n.job_record_id,6e4,1500,t)),n}async function V(e){const t=await fetch(`${B}/plugin/job-records/${e}/communicated`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({})});if(!t.ok){const a=await t.json().catch(()=>({}));throw new Error(a.detail||`HTTP ${t.status}`)}return await t.json()}function me(e={}){var s,r,c,d,l,u,p,f,w,N;if(document.getElementById(v))return;const t=document.createElement("div");t.id=v,t.innerHTML=`
    <div class="ai-panel-container">
      <div class="ai-panel-header" id="ai-panel-header">
        <div class="ai-panel-header-left">
          <div class="ai-panel-logo">✦</div>
          <div class="ai-panel-title-wrap">
            <span class="ai-panel-title">AI 求职助手</span>
            <span class="ai-panel-badge">PRO</span>
          </div>
        </div>
        <div class="ai-header-actions">
          <button class="ai-panel-toggle" id="ai-panel-toggle" title="折叠/展开">−</button>
          <button class="ai-panel-close" id="ai-panel-close" title="关闭">&times;</button>
        </div>
      </div>
      <div class="ai-panel-body ai-panel-expandable" id="ai-panel-body">
        <!-- 简历区域 Bento Card -->
        <div class="ai-card ai-resume-card-wrap">
          <div class="ai-card-header">
            <span class="ai-card-title-small">匹配基准简历</span>
            <span class="ai-resume-status" id="ai-resume-status">已就绪</span>
          </div>
          <div class="ai-resume-card">
            <div class="ai-resume-info">
              <span class="ai-resume-file-icon">📄</span>
              <span class="ai-resume-name" id="ai-resume-name">未选择简历</span>
            </div>
            <input type="file" id="ai-resume-file" accept=".pdf,.docx,.doc,.txt" style="display:none;">
            <button class="ai-btn-upload" id="ai-btn-upload" title="上传或更换匹配简历">更换</button>
          </div>
        </div>

        <!-- 自动筛选区域 Bento Card -->
        <div class="ai-card ai-scan-card-wrap">
          <div class="ai-card-header">
            <span class="ai-card-title-small">本页自动初筛策略</span>
            <span class="ai-badge-soft">智能防封</span>
          </div>

          <!-- 预设选择器 -->
          <div class="ai-preset-tabs" id="ai-scan-presets">
            <button type="button" class="ai-preset-tab" data-preset="safe">🛡️稳健</button>
            <button type="button" class="ai-preset-tab active" data-preset="standard">⚖️标准</button>
            <button type="button" class="ai-preset-tab" data-preset="fast">⚡初筛</button>
            <button type="button" class="ai-preset-tab" data-preset="custom">⚙️自定义</button>
          </div>
          <div class="ai-preset-desc" id="ai-preset-desc">日常求职推荐，拟人化时延与适度沟通</div>

          <div class="ai-scan-config">
            <div class="ai-scan-row">
              <label class="ai-scan-label">匹配阈值</label>
              <div class="ai-scan-input-group">
                <input type="number" class="ai-scan-input" id="ai-scan-threshold" value="80" min="0" max="100">
                <span class="ai-scan-unit">分</span>
              </div>
            </div>
            <div class="ai-scan-row">
              <label class="ai-scan-label">扫描上限</label>
              <div class="ai-scan-input-group">
                <input type="number" class="ai-scan-input" id="ai-scan-max-scan" value="30" min="1" max="100" placeholder="1-100">
                <span class="ai-scan-unit">个</span>
              </div>
            </div>
            <div class="ai-scan-row">
              <label class="ai-scan-label">本次沟通</label>
              <div class="ai-scan-input-group">
                <input type="number" class="ai-scan-input" id="ai-scan-max-comm" value="5" min="0" max="30" placeholder="0-30">
                <span class="ai-scan-unit">个</span>
              </div>
            </div>
            <div class="ai-scan-row">
              <label class="ai-scan-label">单日上限</label>
              <div class="ai-scan-input-group">
                <input type="number" class="ai-scan-input" id="ai-scan-daily-limit" value="25" min="1" max="50" placeholder="1-50" title="单日自动沟通硬上限，达到自动熔断">
                <span class="ai-scan-unit">次</span>
              </div>
            </div>
            <div class="ai-scan-row">
              <label class="ai-scan-label">时延抖动</label>
              <div class="ai-scan-input-group">
                <input type="number" class="ai-scan-input ai-delay-input" id="ai-scan-min-delay" value="12" min="5" max="120" title="最小拟人延时(秒)">
                <span class="ai-scan-unit">-</span>
                <input type="number" class="ai-scan-input ai-delay-input" id="ai-scan-max-delay" value="30" min="10" max="300" title="最大拟人延时(秒)">
                <span class="ai-scan-unit">秒</span>
              </div>
            </div>
            <div class="ai-scan-row ai-scan-switch-row">
              <label class="ai-scan-switch">
                <input type="checkbox" id="ai-scan-auto-comm">
                <span class="ai-switch-text">自动初次沟通 / 打招呼</span>
              </label>
            </div>
            <div class="ai-scan-row">
              <label class="ai-scan-label">HR 活跃要求</label>
              <select class="ai-scan-select" id="ai-scan-hr-req">
                <option value="online">仅在线</option>
                <option value="3days">3日内活跃</option>
                <option value="week" selected>本周内活跃</option>
                <option value="month">本月内活跃</option>
                <option value="unlimited">不限制</option>
              </select>
            </div>
          </div>

          <!-- 现代主次控制坞 -->
          <div class="ai-scan-actions-wrap">
            <button class="ai-scan-btn ai-scan-btn-start" id="ai-start-auto-scan">
              <span class="ai-btn-play-icon">▶</span> 开始自动筛选
            </button>
            <div class="ai-scan-sub-btns">
              <button class="ai-scan-btn ai-scan-btn-pause" id="ai-btn-scan-pause" disabled>⏸ 暂停</button>
              <button class="ai-scan-btn ai-scan-btn-continue" id="ai-btn-scan-continue" disabled>▶ 继续</button>
              <button class="ai-scan-btn ai-scan-btn-stop" id="ai-btn-scan-stop" disabled>⏹ 停止</button>
            </div>
          </div>
          <div class="ai-scan-resume-row">
            <label class="ai-scan-switch">
              <input type="checkbox" id="ai-scan-resume-check" checked>
              <span>继续上次进度</span>
            </label>
            <button class="ai-scan-btn-reset" id="ai-btn-scan-reset">重置进度</button>
          </div>

          <div class="ai-scan-status" id="ai-scan-status" style="display:none;">
            <div class="ai-scan-stats">
              <span>进度: <b id="ai-scan-progress">0/0</b></span>
              <span>已分析: <b id="ai-scan-analyzed">0</b></span>
              <span>推荐: <b id="ai-scan-recommended">0</b></span>
              <span>已沟通: <b id="ai-scan-communicated">0</b></span>
              <span>失败: <b id="ai-scan-failed">0</b></span>
            </div>
            <div class="ai-scan-log" id="ai-scan-log"></div>
            <div class="ai-scan-recommended" id="ai-scan-recommended-list"></div>
          </div>
        </div>

        <!-- 当前打开岗位即时诊断卡片 -->
        <div class="ai-card ai-capture-card">
          <div class="ai-capture-info">
            <div class="ai-capture-title">当前岗位即时诊断</div>
            <div class="ai-capture-desc">一键将当前职位发送至 AI 深度画像</div>
          </div>
          <button class="ai-panel-btn ai-btn-primary" id="ai-btn-capture">
            <span class="ai-btn-icon">⚡</span> 即时诊断
          </button>
        </div>
        <div id="ai-panel-result" style="display:none;"></div>
      </div>
      <div class="ai-panel-footer">
        <span class="ai-panel-version">AI求职助手 · 智能伴侣</span>
        <a href="http://127.0.0.1:8000" target="_blank" class="ai-panel-link">打开控制台 ↗</a>
      </div>
    </div>
  `;const a=document.createElement("style");a.textContent=le(),document.head.appendChild(a),document.body.appendChild(t),be(t),he(t),(s=document.getElementById("ai-panel-toggle"))==null||s.addEventListener("click",h=>{h.stopPropagation(),ge(t)}),(r=document.getElementById("ai-panel-close"))==null||r.addEventListener("click",()=>{t.style.display="none"}),(c=document.getElementById("ai-btn-upload"))==null||c.addEventListener("click",()=>{var h;(h=document.getElementById("ai-resume-file"))==null||h.click()}),(d=document.getElementById("ai-resume-file"))==null||d.addEventListener("change",async h=>{const y=h.target.files[0];if(!y)return;const x=document.getElementById("ai-resume-status");x&&(x.textContent="正在上传简历...",x.className="ai-resume-status");try{const E=await ue(y);m.currentResume=E,await chrome.storage.local.set({resumeId:E.id,resumeFilename:E.filename}),U()}catch(E){x&&(x.textContent="上传失败: "+E.message,x.className="ai-resume-status error")}h.target.value=""}),re().then(h=>{T(h)});const n=document.getElementById("ai-scan-presets");n==null||n.addEventListener("click",h=>{const y=h.target.closest(".ai-preset-tab");if(!y)return;const x=y.dataset.preset;if(x)if(x in A&&x!=="custom"){const E=A[x],Pe=R({...E,presetMode:x});Object.assign(o,Pe),T(o),$()}else x==="custom"&&(o.presetMode="custom",W("custom"),$())}),["ai-scan-threshold","ai-scan-max-scan","ai-scan-max-comm","ai-scan-daily-limit","ai-scan-min-delay","ai-scan-max-delay","ai-scan-auto-comm","ai-scan-hr-req"].forEach(h=>{const y=document.getElementById(h);y&&y.addEventListener("change",()=>{fe("custom")})}),typeof chrome<"u"&&chrome.storage&&chrome.storage.onChanged&&chrome.storage.onChanged.addListener((h,y)=>{if(y==="local"&&h.scanConfig&&h.scanConfig.newValue){const x=R(h.scanConfig.newValue);Object.assign(o,x),T(o)}}),e.onCapture&&((l=document.getElementById("ai-btn-capture"))==null||l.addEventListener("click",e.onCapture)),e.onStartScan&&((u=document.getElementById("ai-start-auto-scan"))==null||u.addEventListener("click",e.onStartScan)),e.onPauseScan&&((p=document.getElementById("ai-btn-scan-pause"))==null||p.addEventListener("click",e.onPauseScan)),e.onContinueScan&&((f=document.getElementById("ai-btn-scan-continue"))==null||f.addEventListener("click",e.onContinueScan)),e.onStopScan&&((w=document.getElementById("ai-btn-scan-stop"))==null||w.addEventListener("click",e.onStopScan)),e.onResetProgress&&((N=document.getElementById("ai-btn-scan-reset"))==null||N.addEventListener("click",e.onResetProgress))}function W(e){document.querySelectorAll("#ai-scan-presets .ai-preset-tab").forEach(n=>{n.dataset.preset===e?n.classList.add("active"):n.classList.remove("active")});const a=document.getElementById("ai-preset-desc");if(a){const n=A[e]||A.custom;a.textContent=n?n.description:""}}function T(e){const t=document.getElementById("ai-scan-threshold"),a=document.getElementById("ai-scan-max-scan"),n=document.getElementById("ai-scan-max-comm"),i=document.getElementById("ai-scan-daily-limit"),s=document.getElementById("ai-scan-min-delay"),r=document.getElementById("ai-scan-max-delay"),c=document.getElementById("ai-scan-auto-comm"),d=document.getElementById("ai-scan-hr-req");t&&(t.value=e.threshold),a&&(a.value=e.maxScanCount),n&&(n.value=e.maxAutoCommunicateCount),i&&(i.value=e.dailyLimit),s&&(s.value=e.minDelay),r&&(r.value=e.maxDelay),c&&(c.checked=!!e.autoCommunicate),d&&(d.value=e.hrRequirement),W(e.presetMode||"standard")}function fe(e="custom"){const t=document.getElementById("ai-scan-threshold"),a=document.getElementById("ai-scan-max-scan"),n=document.getElementById("ai-scan-max-comm"),i=document.getElementById("ai-scan-daily-limit"),s=document.getElementById("ai-scan-min-delay"),r=document.getElementById("ai-scan-max-delay"),c=document.getElementById("ai-scan-auto-comm"),d=document.getElementById("ai-scan-hr-req"),l=R({presetMode:e,threshold:t?Number(t.value):o.threshold,maxScanCount:a?Number(a.value):o.maxScanCount,maxAutoCommunicateCount:n?Number(n.value):o.maxAutoCommunicateCount,dailyLimit:i?Number(i.value):o.dailyLimit,minDelay:s?Number(s.value):o.minDelay,maxDelay:r?Number(r.value):o.maxDelay,autoCommunicate:c?c.checked:o.autoCommunicate,hrRequirement:d?d.value:o.hrRequirement});Object.assign(o,l),T(o),$()}function U(){const e=document.getElementById("ai-resume-name"),t=document.getElementById("ai-resume-status");!e||!t||(m.currentResume?(e.textContent=m.currentResume.filename,e.className="ai-resume-name ok",t.textContent="已作为默认匹配简历",t.className="ai-resume-status ok"):(e.textContent="未上传",e.className="ai-resume-name empty",t.textContent="请先上传简历，上传后可自动进行岗位匹配分析",t.className="ai-resume-status empty"))}function be(e){const t=e.querySelector("#ai-panel-header");t&&(t.style.cursor="move",t.addEventListener("mousedown",a=>{if(a.target.tagName==="BUTTON")return;g.dragging=!0,g.dragStartX=a.clientX,g.dragStartY=a.clientY;const n=e.getBoundingClientRect();g.startLeft=n.left,g.startTop=n.top,document.body.style.userSelect="none"}),document.addEventListener("mousemove",a=>{if(!g.dragging)return;const n=a.clientX-g.dragStartX,i=a.clientY-g.dragStartY;let s=g.startLeft+n,r=g.startTop+i;const c=e.offsetWidth,d=e.offsetHeight;s=Math.max(0,Math.min(s,window.innerWidth-c)),r=Math.max(0,Math.min(r,window.innerHeight-d)),e.style.right="auto",e.style.bottom="auto",e.style.left=s+"px",e.style.top=r+"px"}),document.addEventListener("mouseup",()=>{g.dragging&&(g.dragging=!1,document.body.style.userSelect="",g.left=parseInt(e.style.left)||e.getBoundingClientRect().left,g.top=parseInt(e.style.top)||e.getBoundingClientRect().top,Y())}))}function ge(e){const t=e.querySelector("#ai-panel-body"),a=e.querySelector("#ai-panel-toggle");g.mode==="compact"?(e.classList.remove("ai-compact"),e.classList.add("ai-expanded"),t&&(t.style.display=""),a&&(a.innerHTML="&#8722;",a.title="缩小"),g.mode="expanded"):(e.classList.add("ai-compact"),e.classList.remove("ai-expanded"),t&&(t.style.display="none"),a&&(a.innerHTML="&#9744;",a.title="放大"),g.mode="compact"),Y()}async function Y(){try{await chrome.storage.local.set({panelState:{mode:g.mode,left:g.left,top:g.top}})}catch{}}async function he(e){try{const t=await chrome.storage.local.get("panelState");t&&t.panelState&&(g.mode=t.panelState.mode||"expanded",g.left=t.panelState.left,g.top=t.panelState.top)}catch{}if(g.left!=null&&g.top!=null){const t=Math.max(0,Math.min(g.left,window.innerWidth-e.offsetWidth)),a=Math.max(0,Math.min(g.top,window.innerHeight-e.offsetHeight));e.style.right="auto",e.style.bottom="auto",e.style.left=t+"px",e.style.top=a+"px"}if(g.mode==="compact"){e.classList.add("ai-compact");const t=e.querySelector("#ai-panel-body");t&&(t.style.display="none");const a=e.querySelector("#ai-panel-toggle");a&&(a.innerHTML="&#9744;",a.title="放大")}}function I(e){const t=document.createElement("div");return t.textContent=e||"",t.innerHTML}function xe(e){return{captured:"已保存",analyzed:"已分析",recommended:"推荐投递",applied:"已投递",interview:"面试中"}[e]||e||"未分析"}function X(e){return ie[e]||"#909399"}function k(){try{const e=(t,a)=>{const n=document.getElementById(t);n&&(n.textContent=a)};e("ai-scan-progress",`${o.currentIndex}/${o.totalCards}`),e("ai-scan-analyzed",o.analyzedCount),e("ai-scan-recommended",o.recommendedCount),e("ai-scan-communicated",o.communicatedCount),e("ai-scan-failed",o.failedCount)}catch(e){console.error("[updateScanStatus]",e)}}function b(e){console.log("[AI求职助手]",e);try{const t=document.getElementById("ai-scan-log");if(!t)return;for(;t.children.length>=300;)t.removeChild(t.firstChild);const a=new Date().toLocaleTimeString("zh-CN",{hour12:!1}),n=document.createElement("div");n.className="ai-scan-log-entry",n.textContent=`[${a}] ${e}`,t.appendChild(n),t.scrollTop=t.scrollHeight}catch{}}function G(e){b(e)}function ye(e,t){const a=document.getElementById("ai-scan-recommended-list");if(!a)return;const n=document.createElement("div");n.className="ai-scan-rec-item";const i=t?"已沟通":"建议沟通",s=t?"ai-scan-rec-comm":"ai-scan-rec-rec",r=X(e.hr_status);n.innerHTML=`
    <div class="ai-scan-rec-info">
      <span class="ai-scan-rec-title">${I(e.job_title||"-")}</span>
      <span class="ai-scan-rec-company">${I(e.company||"-")}</span>
    </div>
    <div class="ai-scan-rec-score">
      ${e.hr_status?`<span class="ai-scan-rec-hr" style="color:${r}">${I(e.hr_status)}</span>`:""}
      <span class="ai-scan-rec-num">${e.match_score??"--"}</span>分
      <span class="ai-scan-rec-status ${s}">${i}</span>
    </div>
  `,a.appendChild(n)}function we(e){const t=document.getElementById("ai-panel-result");if(!t)return;const a=e.match_score>=70?"#67C23A":e.match_score>=50?"#E6A23C":"#F56C6C",n=X(e.hr_status);let i=`
    <div class="ai-result">
      <div class="ai-score-section">
        <div class="ai-score-circle" style="border-color: ${a}; color: ${a};">
          <span class="ai-score-num">${e.match_score??"--"}</span>
          <span class="ai-score-label">分</span>
        </div>
        <div class="ai-score-info">
          <span class="ai-score-level" style="color: ${a};">${e.score_level||"未分析"}</span>
          <span class="ai-status-badge ai-status-${e.status}">${xe(e.status)}</span>
        </div>
      </div>
      <p class="ai-recommendation">${e.recommendation||e.message||""}</p>
  `;if((e.hr_name||e.hr_status)&&(i+=`
      <div class="ai-hr-info">
        <span class="ai-hr-label">HR：</span>
        ${e.hr_name?`<span class="ai-hr-name">${I(e.hr_name)}</span>`:""}
        ${e.hr_status?`<span class="ai-hr-status" style="color:${n}; background:${n}22; border:1px solid ${n}; padding:2px 8px; border-radius:4px; font-size:11px;">${I(e.hr_status)}</span>`:""}
        ${e.composite_score!=null?`<span class="ai-composite">综合 ${e.composite_score}</span>`:""}
      </div>
    `),e.job_tags&&e.job_tags.length>0){const r=e.job_tags.map(c=>`<span class="ai-job-tag">${I(c)}</span>`).join("");i+=`<div class="ai-job-tags"><span class="ai-tags-label">标签：</span>${r}</div>`}e.should_recommend&&e.job_record_id?i+=`
      <button class="ai-panel-btn ai-btn-success" id="ai-btn-communicate">
        一键沟通
      </button>
    `:!e.should_recommend&&e.job_record_id&&e.match_score!=null&&(i+=`
      <button class="ai-panel-btn ai-btn-outline" id="ai-btn-communicate">
        仍要沟通（手动确认）
      </button>
    `),i+="</div>",t.innerHTML=i;const s=document.getElementById("ai-btn-communicate");s&&s.addEventListener("click",ve)}async function ve(){if(!m.currentJobRecordId)return;const e=document.querySelector(".btn-startchat, .btn-chat, .chat-btn, .op-btn.chat, .btn-immediately");if(e)try{e.click(),console.log("[AI求职助手] 已点击立即沟通按钮")}catch(t){console.warn("[AI求职助手] 点击按钮异常:",t)}try{await V(m.currentJobRecordId);const t=document.querySelector(".ai-status-badge");t&&(t.className="ai-status-badge ai-status-communicated",t.textContent="已沟通");const a=document.getElementById("ai-btn-communicate");a&&(a.disabled=!0,a.textContent="已沟通")}catch(t){console.error("[AI求职助手] 标记沟通失败:",t)}}function O(e){return e?["btn","button","badge","tag","nav","tab","menu","icon","search","filter","sort","page","footer","header-user","dialog","modal","popup","dropdown","user-info"].some(a=>e.includes(a)):!1}function S(e){return!(!e||e.length<2||e.length>50||/^[\d\s\-_]+$/.test(e)||["未找到","未知","公司","企业","招聘","BOSS"].includes(e)||/^[\d.]+k$/i.test(e))}function Q(e){return!e||e.length<2?!1:!!(/^\d+[Kk]?-\d+[Kk]?/.test(e)&&/[Kk元天薪月年]/.test(e)||e==="面议"||/^\d{4,5}-\d{4,5}$/.test(e))}function Ce(e){if(!e)return"";const t=document.createTreeWalker(e,NodeFilter.SHOW_TEXT,{acceptNode:function(i){const s=i.parentElement;if(!s)return NodeFilter.FILTER_REJECT;const r=window.getComputedStyle(s);return r.display==="none"||r.visibility==="hidden"||r.opacity==="0"?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT}});let a="",n;for(;n=t.nextNode();)a+=n.textContent.trim()+" ";return a.trim()}function Se(e){var a,n,i,s,r,c;if(e==="salary"){const d=document.querySelector("h1, .job-title, .name h1, .detail-title h1");if(d){const p=d.closest(".job-detail-header, .job-primary, .job-info, .detail-header")||((a=d.parentElement)==null?void 0:a.parentElement)||d.parentElement;if(p){const f=d.getBoundingClientRect().top,w=[],N=p.querySelectorAll("*");for(const h of N){if(h===d||d.contains(h)||O((n=h.className)==null?void 0:n.toString().toLowerCase()))continue;const y=((i=h.innerText)==null?void 0:i.trim())||((s=h.textContent)==null?void 0:s.trim())||"",x=h.getBoundingClientRect();if(x.width<40||x.height<10||x.top<f-10||x.top>f+60)continue;(/元\/[天日]/.test(y)||/\d+[Kk]/.test(y)||/薪/.test(y)||/[□]{2,}/.test(y)||/面议/.test(y))&&w.push({el:h,rect:x,text:y.substring(0,30)})}if(w.length>0)return w.sort((h,y)=>y.rect.right-h.rect.right),w[0].rect}}const l=document.querySelector('.job-card-wrapper.active, .job-card-wrapper.selected, [class*="job-card"][class*="active"], [class*="job-card"][class*="selected"], .selected .job-card, .active .job-card');if(l){const p=l.getBoundingClientRect();return{left:p.right-220,top:p.top+15,width:200,height:50}}const u=document.querySelectorAll("span, div, p, b, strong");for(const p of u){const f=((r=p.innerText)==null?void 0:r.trim())||"";if(/元\/[天日]/.test(f)&&f.length<30){const w=p.getBoundingClientRect();if(w.width>40&&w.top<500)return w}}return null}if(e==="company"){const d=document.querySelectorAll('div, section, [class*="boss"], [class*="company"], [class*="info"], [class*="sider"], [class*="card-view"], [class*="recruiter"]');for(const u of d){if(u.closest(".job-detail-body, .job-detail-box")||O((c=u.className)==null?void 0:c.toString().toLowerCase()))continue;const p=Ce(u);if(p.length>10&&p.length<200&&(p.includes("HR")||p.includes("在线"))&&(p.includes("·")||p.includes("."))&&!p.includes("职位描述")&&!p.includes("岗位职责")){const f=u.getBoundingClientRect();if(f.width>100&&f.height>20&&f.top<800)return f}}const l=document.querySelector('a[href*="/gongsi/"], a[href*="company"]');if(l){const u=l.getBoundingClientRect();if(u.width>30&&u.height>10)return u}}const t=document.querySelector("h1, .job-title, .name h1");if(t){const d=t.getBoundingClientRect();if(e==="company")return{left:d.left,top:d.bottom+5,width:Math.min(350,d.width),height:40}}return null}async function Z(e){m.ocrDebug[e]=m.ocrDebug[e]||{};const t=m.ocrDebug[e];t.steps=[],t.fieldType=e;try{t.steps.push("start");const a=Se(e);if(!a){const f="未找到截图区域rect";return t.steps.push(f),{value:"",reason:f}}const n=window.devicePixelRatio||1;t.rect={left:Math.round(a.left),top:Math.round(a.top),width:Math.round(a.width),height:Math.round(a.height),dpr:n};const i=30,s=20,r={x:Math.max(0,a.left-i),y:Math.max(0,a.top-s),width:a.width+i*2,height:a.height+s*2,dpr:n},c=await chrome.runtime.sendMessage({action:"captureArea",rect:r,tabId:null});if(!c||!c.success){const f="截图失败: "+((c==null?void 0:c.error)||"unknown");return t.steps.push(f),{value:"",reason:f}}t.cropImageBase64=c.imageBase64,t.cropSize=`${r.width}x${r.height} (DPR=${n})`;const d=await chrome.runtime.sendMessage({action:"ocrField",imageBase64:c.imageBase64,fieldType:e});if(!d||!d.success||!d.data){const f="后端OCR失败: "+((d==null?void 0:d.error)||"无响应");return t.steps.push(f),{value:"",reason:f}}const l=d.data;if(t.ocrRawText=l.rawText||"",t.ocrCleanedText=l.cleanedText||"",t.ocrValid=l.valid,t.ocrReason=l.reason||"",!l.valid){const f=l.reason||"OCR校验不通过";return t.steps.push(f),{value:"",reason:f}}const u=l.text;if(e==="company"&&S(u))return t.steps.push("前端校验通过"),{value:u,reason:""};if(e==="salary"&&Q(u))return t.steps.push("前端校验通过"),{value:u,reason:""};const p=`前端校验失败: "${u}"`;return t.steps.push(p),{value:"",reason:p}}catch(a){const n="异常: "+a.message;return t.steps=t.steps||[],t.steps.push(n),{value:"",reason:n}}}function Ee(e){if(!e||e.nodeType!==1)return!0;const t=e.tagName.toLowerCase();if(["style","script","noscript","svg","path","meta","link"].includes(t)||e.hidden||e.getAttribute("aria-hidden")==="true")return!1;try{const a=window.getComputedStyle(e);if(a.display==="none"||a.visibility==="hidden"||parseFloat(a.opacity)===0||parseFloat(a.fontSize)===0)return!1}catch{}return!0}function C(e){if(!e)return"";let t=[];function a(n){if(n.nodeType===Node.ELEMENT_NODE){if(!Ee(n))return;for(const i of n.childNodes)a(i)}else if(n.nodeType===Node.TEXT_NODE){const i=n.nodeValue.replace(/\s+/g," ").trim();i&&t.push(i)}}return a(e),t.join(`
`).replace(/\n{3,}/g,`

`).trim()}function M(e){if(!e)return"";e=e.replace(/[□\uE000-\uF8FF\u200b\u200c\u200d\u200e\u200f\ufeff]/g,""),e=e.replace(/\.[\w-]+\s*\{[^}]*\}/g,""),e=e.replace(/来自BOSS直聘/g,""),e=e.replace(/BOSS直聘/g,""),e=e.replace(/\bkanzhun\b/gi,""),e=e.replace(/岗boss位/gi,"岗位"),e=e.replace(/岗kanzhun位/gi,"岗位"),e=e.replace(/\b(boss|kanzhun)\b/gi,"");const t=["去App与BOSS随时沟通","前往App与BOSS随时沟通","工作地址","点击查看地图","刘女士","王先生","张女士","李女士","赵女士","陈女士","在线 积木","· HR","·HR"];for(const n of t){const i=e.indexOf(n);if(i>50){e=e.substring(0,i);break}}const a=["收藏","立即沟通","举报","微信扫码分享","分享"];for(const n of a)e=e.replace(new RegExp(n,"g"),"");return e=e.split(`
`).map(n=>n.trim()).filter(n=>!(n.length===0||/^[{};:#.\s]+$/.test(n)||/^@[\w-]/.test(n))).join(`
`),e=e.replace(/[\t ]+/g," ").replace(/\n{3,}/g,`

`).trim(),e}function ke(e){if(!e||e.length<80)return!1;const t=["求职类型","薪资待遇","经验要求","学历要求","公司规模","融资阶段","行业筛选","地图搜索","3K以下","5-10K","10-20K","50K以上","职位类型","工作性质","发布时间"];let a=0;for(const d of t)e.includes(d)&&a++;if(a>=2)return!1;const n=["首页","消息","简历new","AI简历","智能简历","个人中心","升级VIP","尊享","投递状态","在线简历","BOSS直聘","岗位筛选","所在城市","薪资范围","求职期望"];let i=0;for(const d of n)e.includes(d)&&i++;if(i>=3)return!1;const s=["岗位职责","任职要求","职位描述","工作内容","岗位要求","岗位描述","技能要求","加分项","优先考虑"];let r=0;for(const d of s)e.includes(d)&&(r+=3);const c=["负责","经验","熟练","掌握","熟悉","了解","具备","项目","开发","设计","能力","团队","技术","产品","本科","专科","硕士","相关专业","计算机","框架","数据库","前端","后端","算法","架构","优化","维护","实现","完成","参与","独立"];for(const d of c)e.includes(d)&&(r+=1);return r>=6||r>=3&&e.length>300}function ee(){var n;const e=["北京","上海","广州","深圳","杭州","成都","武汉","南京","西安","重庆","苏州","天津","长沙","郑州","济南","青岛","合肥","福州","厦门","东莞","佛山","无锡","宁波","大连","沈阳","哈尔滨","长春","昆明","贵阳","南宁","海口","拉萨","银川","西宁","兰州","呼和浩特","乌鲁木齐","石家庄","太原"],t=document.querySelectorAll('.job-location, .location-address, .address-text, .job-area, .detail-location, .location, .city-name, .current-city, [class*="address"], [class*="location"]');for(const i of t){const s=((n=i.innerText)==null?void 0:n.trim())||"";for(const r of e)if(s.includes(r))return r}const a=document.body.innerText||"";for(const i of e){const s=a.indexOf(i);if(s!==-1&&s<5e3)return i}return null}function _(e){if(!e)return!1;const t=e.trim();return!(["职位描述","岗位职责","任职要求","岗位要求","工作地址","公司介绍","工作内容","职位要求","岗位描述","技能要求"].includes(t)||["刚刚活跃","先生","女士","HR","人事","招聘者","主管","经理","在线","活跃","离线"].some(s=>t.includes(s))||/^[\u4e00-\u9fa5]{1,4}(先生|女士)(.+(活跃|在线))?$/.test(t)||/^(先生|女士|在线|活跃|HR|人事|招聘)/.test(t)||["收藏","立即沟通","举报","分享","微信扫码","工作地址","点击查看"].some(s=>t.includes(s))||t.length<3||t.length>80)}function q(e){const t=e.search(/[□\uE000-\uF8FF\u200b\u200c\u200d\u200e\u200f\ufeff\u00A0]/);return t>0&&(e=e.substring(0,t)),e.replace(/\d+[-~—–]\d+元\/[天日]/g,"").replace(/\d+[-~—–]\d+[Kk]([·\u00b7]\d+薪)?/g,"").replace(/职位描述|岗位职责|任职要求|工作地址|岗位要求|工作内容/g,"").replace(/\s+/g," ").trim()}function _e(e){const a=[...(e||document).querySelectorAll("h1")];for(const i of a){const s=C(i).trim();if(_(s))return q(s)}if(e){const i=e.querySelector('[class*="boss"], [class*="recruiter"], [class*="contact"]'),s=e.querySelectorAll('.job-title, .name:not(.boss-name), [class*="title"]:not([class*="boss"])');for(const r of s){if(i&&i.contains(r))continue;const c=C(r).trim();if(_(c)&&c.length>5)return q(c)}}const n=[...document.querySelectorAll("h1")];for(const i of n){if(i.getBoundingClientRect().left<window.innerWidth*.3)continue;const r=C(i).trim();if(_(r))return q(r)}return""}function Ie(){const t=[...document.querySelectorAll("h2, h3, h4, div, span, p, strong, b")].find(s=>{const r=s.innerText?s.innerText.trim():s.textContent.trim();return r==="工作地址"&&r.length===4});if(!t)return"";let a=t.parentElement;for(let s=0;s<5&&a;s++){const r=a.innerText?a.innerText.trim():C(a),c=D(r);if(c&&c.length>=4)return c;a=a.parentElement}let n=t.nextElementSibling,i=[];for(;n;){const s=n.innerText?n.innerText.trim():C(n);s&&!/点击查看地图|查看地图|职位描述|岗位职责/.test(s)&&i.push(s),n=n.nextElementSibling}return D(i.join(""))}function D(e){if(!e)return"";const t=e.search(/[□\uE000-\uF8FF\u200b\u200c\u200d\ufeff]/);return t>0&&(e=e.substring(0,t)),e.replace(/工作地址/g,"").replace(/点击查看地图/g,"").replace(/查看地图/g,"").replace(/职位描述|岗位职责|任职要求/g,"").replace(/\s+/g,"").trim()}function Be(){const e=[".job-detail-box",".job-detail",".detail-box",".job-main",'[class*="job-detail"]',".detail-content-wrapper"];for(const t of e)try{const a=document.querySelector(t);if(a&&a.getBoundingClientRect().left>window.innerWidth*.3)return a}catch{}return null}function je(){const e=['[class*="job-card"][class*="active"]','[class*="job-card"][class*="selected"]','[class*="job-card"][class*="cur"]','[class*="selected"] [class*="job-card"]',".job-card-wrapper.active"];for(const t of e)try{const a=document.querySelector(t);if(a)return a}catch{}return null}function te(e){const t=e.querySelectorAll('[class*="boss"], [class*="company"], [class*="recruiter"], [class*="info-block"], div');for(const a of t){const n=C(a);if(n.length<5||n.length>200)continue;const i=n.match(/在线\s+(.+?)(?:\s*[·.]\s*HR|\s*·\s*HR)/);if(i&&S(i[1].trim()))return{value:i[1].trim(),source:"DOM(详情)"};const s=a.querySelector('a[href*="/gongsi/"]');if(s&&S(s.textContent.trim()))return{value:s.textContent.trim(),source:"DOM(链接)"}}return{value:"",source:"DOM"}}function Re(){const e=De();if(e){let i=[],s=e.nextElementSibling;const r=["H1","H2","H3","H4","H5"],c=["工作地址","点击查看地图","去App与BOSS随时沟通","前往App与BOSS随时沟通"];for(;s&&!r.includes(s.tagName);){const l=s.tagName,u=(s.className||"").toString().toLowerCase();if(["UL","P","DIV"].includes(l)&&!O(u)){const p=s.innerText?s.innerText.trim():"";if(c.some(w=>p.includes(w)))break;const f=C(s);f.length>0&&i.push(f)}s=s.nextElementSibling}let d=M(i.join(`
`));if(d.length>=80)return d}if(e)for(const i of["job-detail-body","job-detail-box"]){const s=e.closest("."+i);if(s){let r=M(C(s));if(r.length>=80)return r}}const t=[".job-detail-body",".job-detail-box",'[class*="job-detail"]',".detail-content"];for(const i of t)try{const s=document.querySelector(i);if(s){let r=M(C(s));if(r.length>=80)return r}}catch{}let a="";const n=document.querySelectorAll("div, section, article");for(const i of n){let s=M(C(i));s.length>a.length&&s.length>80&&s.length<8e3&&ke(s)&&(a=s)}return a}function De(){const e=["职位描述","岗位职责","任职要求","工作内容","职位要求","岗位要求","岗位描述"],t=document.querySelectorAll("h1, h2, h3, h4, h5, strong, b, div, span");for(const a of t){const n=a.innerText?a.innerText.trim():"";if(e.some(i=>n===i||n.includes(i)&&n.length<20))return a}return null}async function ae(){m.fieldSources={},m.ocrDebug={};const e=window.location.href,t=Be(),a=je();let n=_e(t);if(!n&&a){const l=a.querySelector('.job-name, .name, [class*="title"], a');if(l){const u=l.textContent.trim();_(u)&&(n=q(u))}}if(n||(n="-"),m.fieldSources.jobTitle=n!=="-"?"DOM":"失败",!_(n)||n==="-"){const l=document.title.replace(/[-|].*$/,"").trim();_(l)&&l.length>3?(n=l,m.fieldSources.jobTitle="DOM(页面标题)"):(n="-",m.fieldSources.jobTitle="失败(无效标题)")}let i="";if(a){const l=a.querySelector('a[href*="/gongsi/"], a[href*="company"], [class*="company"] a, [class*="company"]');if(l){const u=l.textContent.trim();S(u)&&(i=u,m.fieldSources.company="DOM(卡片)")}}if(!S(i)&&t){let{value:l,source:u}=te(t);i=l,S(i)&&(m.fieldSources.company=u)}if(!S(i)){let{value:l,source:u}=te(document.body);i=l,S(i)&&(m.fieldSources.company=u)}if(!S(i)){const l=await Z("company");l.value?(i=l.value,m.fieldSources.company="OCR"):(i="-",m.fieldSources.company="失败")}let s="",r="";if(t){const l=t.querySelectorAll('[class*="salary"], [class*="pay"], span, div');for(const u of l){const p=u.textContent.trim();if(/元\/[天日]/.test(p)||/\d+[Kk]/.test(p)||/面议/.test(p)||/□/.test(p)){r=p;break}}}if(Q(r))s=r,m.fieldSources.salary="DOM";else{const l=await Z("salary");l.value?(s=l.value,m.fieldSources.salary="OCR"):(s="-",m.fieldSources.salary="失败")}let c=Ie();if(c)m.fieldSources.location="DOM(工作地址)";else{if(t){const l=t.querySelector('[class*="location"], [class*="address"], [class*="area"]');l&&(c=D(l.textContent.trim()).substring(0,15))}if(c)m.fieldSources.location="DOM(顶部)";else if(a){const l=a.querySelector('[class*="location"], [class*="address"], [class*="area"]');l&&(c=D(l.textContent.trim()).substring(0,15)),m.fieldSources.location=c?"DOM(卡片)":"失败"}c||(c=ee(),m.fieldSources.location=c?"DOM兜底":"失败")}c=D(c||"");let d=Re();return m.fieldSources.jobDescription=d?"DOM":"失败",(!_(n)||n==="职位描述")&&(n="-"),(!c||c==="-"||c.length<2)&&(c=ee()||"-"),{jobTitle:n,company:i,salary:s,location:c,jobDescription:d,jobUrl:e}}function Ae(e=15,t=45){const a=Math.max(Math.random(),1e-7),n=Math.random(),i=Math.sqrt(-2*Math.log(a))*Math.cos(2*Math.PI*n),s=(e+t)/2,r=(t-e)/6,c=Math.round(s+i*r);return Math.max(e,Math.min(t,c))}function ne(){const e=new Date,t=e.getFullYear(),a=String(e.getMonth()+1).padStart(2,"0"),n=String(e.getDate()).padStart(2,"0");return`daily_comm_${t}-${a}-${n}`}async function F(){const e=ne();try{return typeof chrome<"u"&&chrome.storage&&chrome.storage.local?(await chrome.storage.local.get([e]))[e]||0:parseInt(localStorage.getItem(e)||"0",10)}catch{return parseInt(localStorage.getItem(e)||"0",10)}}async function $e(){const e=ne(),a=await F()+1;try{typeof chrome<"u"&&chrome.storage&&chrome.storage.local?await chrome.storage.local.set({[e]:a}):localStorage.setItem(e,String(a))}catch{localStorage.setItem(e,String(a))}return a}function H(){const e=[".geetest_holder",".geetest_popup",".geetest_radar_tip",'[class*="geetest"]',"#captcha",'[class*="captcha"]','[class*="verify-wrap"]','[class*="security-dialog"]',".dialog-wrap.verify-dialog"];for(const a of e)try{const n=document.querySelector(a);if(n&&n.offsetParent!==null)return{detected:!0,reason:`匹配到风控元素: ${a}`}}catch{}const t=document.querySelectorAll('.dialog-container, .dialog-wrap, .boss-popup, .modal-content, [role="dialog"]');for(const a of t)if(a.offsetParent!==null){const n=a.innerText||"";if(/操作过于频繁|操作频繁|系统检测到异常|安全验证|安全校验|请完成验证/.test(n))return{detected:!0,reason:`检测到风控提示文本: "${n.substring(0,30)}"`}}return{detected:!1}}function L(e){if(o.stopRequested)throw new Error("__SCAN_STOPPED__");if(o.pauseRequested)throw o.pausedAtStep=e||"未知",new Error("__SCAN_PAUSED__")}async function z(e,t){const n=o.controlVersion;for(let i=0;i<e;i+=100)o.controlVersion!==n&&L(t||"sleep"),await new Promise(s=>setTimeout(s,Math.min(100,e-i)))}function Te(){if(o.status!=="running")return;if(o.pauseRequested=!0,o.status="paused",o.controlVersion++,o.activeAbortController){try{o.activeAbortController.abort()}catch{}o.activeAbortController=null}b("已请求立即暂停：当前请求已中断，扫描进度已保存"),k();const e=document.getElementById("ai-btn-scan-pause"),t=document.getElementById("ai-btn-scan-continue");e&&(e.disabled=!0),t&&(t.disabled=!1)}function Me(){if(o.stopRequested=!0,o.pauseRequested=!1,o.status="stopped",o.controlVersion++,o.activeAbortController){try{o.activeAbortController.abort()}catch{}o.activeAbortController=null}b("已请求立即停止：当前请求已中断，扫描进度已保存"),k(),P("done")}function qe(){if(o.status!=="paused")return;o.pauseRequested=!1,o.stopRequested=!1,o.status="running",o.controlVersion++,b("=== 从暂停处继续扫描 ===");const e=document.getElementById("ai-btn-scan-pause"),t=document.getElementById("ai-btn-scan-continue");e&&(e.disabled=!1),t&&(t.disabled=!0)}function P(e){const t=document.getElementById("ai-start-auto-scan"),a=document.getElementById("ai-btn-scan-pause"),n=document.getElementById("ai-btn-scan-continue"),i=document.getElementById("ai-btn-scan-stop");t&&(e==="running"?(t.disabled=!0,a&&(a.disabled=!1),n&&(n.disabled=!0),i&&(i.disabled=!1)):e==="done"&&(t.disabled=!1,a&&(a.disabled=!0),n&&(n.disabled=!0),i&&(i.disabled=!0)))}async function Le(e,t){var i;L("before sendJobForScan"),G("已发送AI分析...");let a=((i=m.currentResume)==null?void 0:i.id)||null;if(!a)try{a=(await chrome.storage.local.get(["resumeId"])).resumeId||null}catch{try{const r=localStorage.getItem("ai_resume_id");a=r?parseInt(r):null}catch{a=null}}const n=new AbortController;o.activeAbortController=n;try{return await K({resume_id:a,job_title:e.jobTitle,company:e.company||null,salary:e.salary||null,location:e.location||null,job_url:e.jobUrl,job_description:e.jobDescription,captured_page_url:window.location.href,card_index:t,job_unique_key:e._uniqueKey,scan_session_id:o.sessionId},n.signal)}catch(s){throw s.name==="AbortError"&&(b("AI分析请求已被中断"),L("after abort")),s}finally{o.activeAbortController===n&&(o.activeAbortController=null)}}async function ze(){if(b("=== 开始自动筛选 ==="),typeof window<"u"&&document.getElementById("ai-scan-threshold")){const a=document.getElementById("ai-scan-threshold"),n=document.getElementById("ai-scan-max-scan"),i=document.getElementById("ai-scan-max-comm"),s=document.getElementById("ai-scan-auto-comm"),r=document.getElementById("ai-scan-hr-req"),c=document.getElementById("ai-scan-min-delay"),d=document.getElementById("ai-scan-max-delay"),l=document.getElementById("ai-scan-daily-limit"),u={presetMode:o.presetMode,threshold:a?Number(a.value):o.threshold,maxScanCount:n?Number(n.value):o.maxScanCount,maxAutoCommunicateCount:i?Number(i.value):o.maxAutoCommunicateCount,autoCommunicate:s?s.checked:o.autoCommunicate,hrRequirement:r?r.value:o.hrRequirement,minDelay:c?Number(c.value):o.minDelay,maxDelay:d?Number(d.value):o.maxDelay,dailyLimit:l?Number(l.value):o.dailyLimit},p=R(u);Object.assign(o,p),await $();const f=document.getElementById("ai-scan-resume-check");f&&!f.checked&&(o.currentIndex=0,o.analyzedCount=0,o.recommendedCount=0,o.communicatedCount=0,o.failedCount=0,o.results=[],b("已取消“继续上次进度”，从头开始扫描"))}const e=document.querySelectorAll('.job-card-wrapper, .job-card-box, [class*="job-card"]');o.totalCards=e.length,o.status="running",o.sessionId="scan_"+Date.now(),P("running"),k();const t=document.getElementById("ai-scan-status");t&&(t.style.display="block");try{for(let a=o.currentIndex;a<e.length;a++){L(`card ${a}`);const n=H();if(n.detected){b(`🚨 [风控熔断] 页面出现安全验证（${n.reason}），已紧急停止自动扫描保护账号！`),o.stopRequested=!0;break}if(o.analyzedCount>=o.maxScanCount){b(`已达单次最大扫描数 (${o.maxScanCount})，停止扫描`);break}const i=e[a];i.scrollIntoView({behavior:"smooth",block:"center"}),await z(Math.floor(500+Math.random()*400),"scroll");try{i.click()}catch{}await z(Math.floor(900+Math.random()*600),"after card click");const s=await ae();await Ne(s,a,i);const r=Ae(o.minDelay,o.maxDelay);G(`高斯拟人等待 ${r} 秒 (${o.minDelay}-${o.maxDelay}s)...`),await z(r*1e3,"between jobs")}b("=== 自动筛选结束 ===")}catch(a){a.message==="__SCAN_STOPPED__"?b("扫描已由用户终止"):a.message==="__SCAN_PAUSED__"?b(`扫描已在步骤 [${o.pausedAtStep}] 暂停`):b(`扫描异常终止: ${a.message}`)}finally{o.status!=="paused"&&(o.status="idle",P("done"))}}async function Ne(e,t,a){if(!e.jobDescription||e.jobDescription.length<80){o.failedCount++,o.currentIndex=t+1,k(),b(`JD过短(${e.jobDescription?e.jobDescription.length:0}字)，已跳过`);return}b(`提取成功：${e.jobTitle||"-"} / ${e.company||"-"}`);const n=`${e.jobTitle}_${e.company}_${e.salary}`;if(o.seenKeys.has(n)){o.currentIndex=t+1,b("该岗位已在本次扫描记录中，已跳过");return}o.seenKeys.add(n),e._uniqueKey=n;let i;try{i=await Le(e,t)}catch(s){o.failedCount++,o.currentIndex=t+1,k(),b(`分析请求失败: ${s.message}`);return}if(o.analyzedCount++,o.currentIndex=t+1,k(),i.match_score>=o.threshold){o.recommendedCount++,b(`匹配度 ${i.match_score} → 达到推荐阈值(${o.threshold})`);let s=!1;if(o.autoCommunicate)if(o.communicatedCount>=o.maxAutoCommunicateCount)b(`已达单次最大沟通数 (${o.maxAutoCommunicateCount})，本次跳过自动打招呼`);else{const r=i.hr_status||"未知";!o.hrStatusAllowed||o.hrStatusAllowed.includes(r)?s=await Oe(i):b(`HR活跃度 [${r}] 不满足要求 [${se[o.hrRequirement]||o.hrRequirement}]，跳过自动沟通`)}ye({job_title:e.jobTitle,company:e.company,match_score:i.match_score,job_record_id:i.job_record_id,hr_status:i.hr_status},s)}else b(`匹配度 ${i.match_score} 低于阈值 ${o.threshold}，跳过`)}async function Oe(e){const t=H();if(t.detected)return b(`🚨 [风控熔断] ${t.reason}！已紧急停止自动化操作！`),o.stopRequested=!0,!1;const a=await F(),n=o.dailyLimit||20;if(a>=n)return b(`⚠️ [风控拦截] 今日自动沟通已达上限（${a}/${n}次），已强制停止沟通保护账号！`),o.stopRequested=!0,!1;const i=document.querySelector(".btn-startchat, .btn-chat, .chat-btn, .op-btn.chat, .btn-immediately");if(!i)return b('未找到"立即沟通"按钮'),!1;b('正在点击"立即沟通"');try{i.click()}catch{return b("点击按钮失败"),!1}await z(1e3,"after chat click");const s=H();if(s.detected)return b(`🚨 [风控熔断] 点击后触发安全验证（${s.reason}），已紧急熔断停止！`),o.stopRequested=!0,!1;try{await V(e.job_record_id),o.communicatedCount++,await $e();const r=await F();return b(`沟通成功（今日累计沟通 ${r}/${n} 次）`),k(),!0}catch{return!1}}async function Fe(){var a;const e=document.getElementById("ai-btn-capture"),t=document.getElementById("ai-panel-result");if(!(!e||!t)){e.disabled=!0,e.textContent="分析中...",t.style.display="block",t.innerHTML='<p class="ai-loading">正在提取岗位信息并发送匹配分析...</p>';try{const n=await ae();if(!n.jobTitle||!n.jobDescription||n.jobTitle==="-")throw new Error("未能在当前页面有效提取到岗位标题或JD内容");let i=((a=m.currentResume)==null?void 0:a.id)||null;i||(i=(await chrome.storage.local.get(["resumeId"])).resumeId||null);const s=await K({resume_id:i,job_title:n.jobTitle,company:n.company||null,salary:n.salary||null,location:n.location||null,job_url:n.jobUrl,job_description:n.jobDescription,captured_page_url:window.location.href});m.currentJobRecordId=s.job_record_id,we(s)}catch(n){t.innerHTML=`
      <div class="ai-error">
        <p>分析失败：${n.message}</p>
        <p class="ai-hint">请确认后端服务已在 http://127.0.0.1:8000 正常运行。</p>
      </div>
    `}finally{e.disabled=!1,e.textContent="重新发送分析"}}}async function He(){try{const e=await de();if(e)m.currentResume=e,await chrome.storage.local.set({resumeId:e.id,resumeFilename:e.filename});else{const t=await chrome.storage.local.get(["resumeId","resumeFilename"]);t.resumeId&&(m.currentResume={id:t.resumeId,filename:t.resumeFilename||"已上传简历"})}}catch{}U()}function oe(){document.getElementById(v)||setTimeout(()=>{me({onCapture:Fe,onStartScan:ze,onPauseScan:Te,onContinueScan:qe,onStopScan:Me,onResetProgress:()=>{ce(),b("扫描状态已重置")}}),He()},1200)}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",oe):oe()})();
