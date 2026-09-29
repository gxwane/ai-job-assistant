(function(){"use strict";const j="ai-job-assistant-panel",B="http://127.0.0.1:8000/api",ce={在线:"#67C23A",刚刚活跃:"#67C23A",今日活跃:"#67C23A","3日内活跃":"#E6A23C",本周活跃:"#E6A23C",本月活跃:"#F56C6C",两周内活跃:"#F56C6C",两月内活跃:"#F56C6C","3月内活跃":"#F56C6C",半年前活跃:"#909399"},W={online:["在线","刚刚活跃"],"3days":["在线","刚刚活跃","今日活跃","3日内活跃"],week:["在线","刚刚活跃","今日活跃","3日内活跃","本周活跃"],month:["在线","刚刚活跃","今日活跃","3日内活跃","本周活跃","本月活跃"],unlimited:null},re={online:"仅在线","3days":"3日内活跃",week:"本周内活跃",month:"本月内活跃",unlimited:"不限制"},R={minDelayFloor:5,maxDelayFloor:10,dailyLimitCeiling:50,maxScanCeiling:100,maxCommCeiling:30},T={safe:{id:"safe",name:"稳健防封",icon:"🛡️",description:"新号/敏感期推荐，高拟人长延时，严苛HR过滤",minDelay:20,maxDelay:50,threshold:85,maxScanCount:15,maxAutoCommunicateCount:2,dailyLimit:15,autoCommunicate:!1,hrRequirement:"3days"},standard:{id:"standard",name:"标准平衡",icon:"⚖️",description:"日常求职推荐，拟人化时延与适度沟通",minDelay:12,maxDelay:30,threshold:80,maxScanCount:30,maxAutoCommunicateCount:5,dailyLimit:25,autoCommunicate:!1,hrRequirement:"week"},fast:{id:"fast",name:"快速初筛",icon:"⚡",description:"仅批量打分推荐，强制关闭沟通，快速遍历",minDelay:5,maxDelay:12,threshold:75,maxScanCount:50,maxAutoCommunicateCount:0,dailyLimit:0,autoCommunicate:!1,hrRequirement:"unlimited"},custom:{id:"custom",name:"自定义",icon:"⚙️",description:"在安全底线内自由微调各项参数"}},f={mode:"expanded",left:null,top:null,dragging:!1,dragStartX:0,dragStartY:0,startLeft:0,startTop:0},s={status:"idle",currentIndex:0,totalCards:0,analyzedCount:0,recommendedCount:0,communicatedCount:0,failedCount:0,presetMode:"standard",threshold:80,maxScanCount:30,maxAutoCommunicateCount:5,dailyLimit:25,autoCommunicate:!1,hrRequirement:"week",hrStatusAllowed:["在线","刚刚活跃","今日活跃","3日内活跃","本周活跃"],minDelay:12,maxDelay:30,results:[],stopRequested:!1,pauseRequested:!1,sessionId:null,seenKeys:new Set,pageKey:"",resumeFromLast:!0,pageDone:!1,scrollCount:0,controlVersion:0,activeAbortController:null,pausedAtStep:null};function L(e={}){let t=Math.max(R.minDelayFloor,Number(e.minDelay)||12),n=Math.max(R.maxDelayFloor,Number(e.maxDelay)||30);n<t&&(n=t+3);const a=Math.max(0,Math.min(100,Number(e.threshold)||80)),o=Math.max(1,Math.min(R.maxScanCeiling,Number(e.maxScanCount)||30)),i=Math.max(0,Math.min(R.maxCommCeiling,Number(e.maxAutoCommunicateCount)??5)),c=Math.max(0,Math.min(R.dailyLimitCeiling,Number(e.dailyLimit)??25)),r=!!e.autoCommunicate,d=e.hrRequirement in W?e.hrRequirement:"week",l=W[d];return{presetMode:e.presetMode||"standard",minDelay:t,maxDelay:n,threshold:a,maxScanCount:o,maxAutoCommunicateCount:i,dailyLimit:c,autoCommunicate:r,hrRequirement:d,hrStatusAllowed:l}}async function $(){const e={scanConfig:{presetMode:s.presetMode,minDelay:s.minDelay,maxDelay:s.maxDelay,threshold:s.threshold,maxScanCount:s.maxScanCount,maxAutoCommunicateCount:s.maxAutoCommunicateCount,dailyLimit:s.dailyLimit,autoCommunicate:s.autoCommunicate,hrRequirement:s.hrRequirement}};try{typeof chrome<"u"&&chrome.storage&&chrome.storage.local?await chrome.storage.local.set(e):localStorage.setItem("ai_job_scan_config",JSON.stringify(e.scanConfig))}catch{}}async function le(){let e=null;try{if(typeof chrome<"u"&&chrome.storage&&chrome.storage.local)e=(await chrome.storage.local.get(["scanConfig"])).scanConfig;else{const t=localStorage.getItem("ai_job_scan_config");t&&(e=JSON.parse(t))}}catch{}if(e){const t=L(e);Object.assign(s,t)}return s}const p={currentJobRecordId:null,currentResume:null,fieldSources:{},ocrDebug:{}};function de(){s.status="idle",s.currentIndex=0,s.totalCards=0,s.analyzedCount=0,s.recommendedCount=0,s.communicatedCount=0,s.failedCount=0,s.results=[],s.stopRequested=!1,s.pauseRequested=!1,s.sessionId=null,s.seenKeys=new Set,s.pageKey="",s.scrollCount=0,s.activeAbortController=null,s.pausedAtStep=null}function ue(){return`
    #${j} {
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
    .ai-scan-title { font-size: 14px; font-weight: 600; color: #333; margin-bottom: 8px; }
    .ai-preset-tabs { display: flex; gap: 4px; margin-bottom: 6px; }
    .ai-preset-tab {
      flex: 1; padding: 4px 0; border: 1px solid #dcdfe6; border-radius: 4px;
      background: #f5f7fa; color: #606266; font-size: 11px; font-weight: 500;
      cursor: pointer; text-align: center; transition: all 0.2s;
    }
    .ai-preset-tab:hover { border-color: #409EFF; color: #409EFF; }
    .ai-preset-tab.active { background: #409EFF; border-color: #409EFF; color: #fff; font-weight: 600; }
    .ai-preset-desc { font-size: 11px; color: #909399; margin-bottom: 8px; line-height: 1.4; min-height: 16px; }
    .ai-scan-config { display: flex; flex-wrap: wrap; gap: 6px 12px; margin-bottom: 10px; }
    .ai-scan-row { display: flex; align-items: center; gap: 4px; }
    .ai-scan-label { font-size: 12px; color: #666; white-space: nowrap; }
    .ai-scan-input { width: 44px; height: 22px; padding: 0 4px; border: 1px solid #dcdfe6; border-radius: 4px; font-size: 12px; text-align: center; }
    .ai-delay-input { width: 36px !important; }
    .ai-scan-select { width: 95px; height: 24px; padding: 0 4px; border: 1px solid #dcdfe6; border-radius: 4px; font-size: 12px; background: #fff; }
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
  `}async function me(){try{const e=await fetch(`${B}/resume/default`);if(e.ok){const t=await e.json();if(t.resume_id)return{id:t.resume_id,filename:t.filename||"已上传简历"}}}catch{}return null}async function pe(e){const t=new FormData;t.append("file",e);const n=await fetch(`${B}/resume/upload`,{method:"POST",body:t});if(!n.ok){const o=await n.json().catch(()=>({}));throw new Error(o.detail||`上传失败 (${n.status})`)}const a=await n.json();return{id:a.resume_id,filename:a.filename}}async function fe(e,t=6e4,n=1500,a=null){const o=Date.now();for(;Date.now()-o<t;){if(a&&a.aborted)throw new DOMException("Aborted","AbortError");await new Promise(i=>setTimeout(i,n));try{const i=await fetch(`${B}/job-records/${e}`,{method:"GET",headers:{"Content-Type":"application/json"},signal:a||void 0});if(!i.ok)continue;const c=await i.json();if(c.analysis_status==="done")return c.job_record_id=c.id,c.should_recommend=c.status==="recommended"||c.match_score!=null&&c.match_score>=70,c;if(c.analysis_status==="failed")throw new Error("AI 后台分析失败，请检查服务日志")}catch(i){if(i.name==="AbortError")throw i;console.warn("[AI求职助手] 轮询岗位分析状态出现非阻断异常:",i)}}throw new Error("AI 分析轮询超时（60秒），可在后台历史记录中查看")}async function V(e,t=null){const n=await fetch(`${B}/plugin/job-capture`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e),signal:t||void 0});if(!n.ok){const o=await n.json().catch(()=>({}));throw new Error(o.detail||`HTTP ${n.status}`)}let a=await n.json();return(a.analysis_status==="pending"||a.analysis_status==="running")&&(a=await fe(a.job_record_id,6e4,1500,t)),a}async function U(e){const t=await fetch(`${B}/plugin/job-records/${e}/communicated`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({})});if(!t.ok){const n=await t.json().catch(()=>({}));throw new Error(n.detail||`HTTP ${t.status}`)}return await t.json()}function ge(e={}){var i,c,r,d,l,u,m,b,y,z,C,w;if(document.getElementById(j))return;const t=document.createElement("div");t.id=j,t.innerHTML=`
    <div class="ai-panel-container">
      <div class="ai-panel-header" id="ai-panel-header">
        <span class="ai-panel-logo">AI</span>
        <span class="ai-panel-title">AI求职助手</span>
        <button class="ai-panel-toggle" id="ai-panel-toggle" title="缩小">−</button>
        <button class="ai-panel-close" id="ai-panel-close">&times;</button>
      </div>
      <div class="ai-panel-body ai-panel-expandable" id="ai-panel-body">
        <!-- 简历区域 -->
        <div class="ai-resume-section">
          <div class="ai-resume-header">用于岗位匹配的简历</div>
          <div class="ai-resume-row">
            <span class="ai-resume-name" id="ai-resume-name">加载中...</span>
          </div>
          <div class="ai-resume-status" id="ai-resume-status">加载中...</div>
          <div class="ai-resume-actions">
            <input type="file" id="ai-resume-file" accept=".pdf,.docx,.doc,.txt" style="display:none;">
            <button class="ai-panel-btn ai-btn-upload" id="ai-btn-upload">上传简历</button>
          </div>
        </div>

        <!-- 岗位加载区域 -->
        <div class="ai-load-section">
          <div class="ai-scan-title">岗位加载</div>
          <div class="ai-load-status">
            当前检测岗位数：<b id="ai-load-count">-</b> &nbsp;
            状态：<b id="ai-load-status-text">未开始</b>
          </div>
          <div class="ai-load-btns">
            <button class="ai-scan-btn ai-scan-btn-start" id="ai-btn-load-more">加载更多岗位</button>
            <button class="ai-scan-btn ai-scan-btn-stop" id="ai-btn-load-stop" disabled>停止加载</button>
          </div>
        </div>

        <!-- 自动筛选区域 -->
        <div class="ai-scan-section">
          <div class="ai-scan-divider"></div>
          <div class="ai-scan-title">本页自动筛选岗位</div>

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
              <input type="number" class="ai-scan-input" id="ai-scan-threshold" value="80" min="0" max="100">
              <span class="ai-scan-unit">分</span>
            </div>
            <div class="ai-scan-row">
              <label class="ai-scan-label">扫描上限</label>
              <input type="number" class="ai-scan-input" id="ai-scan-max-scan" value="30" min="1" max="100" placeholder="1-100">
              <span class="ai-scan-unit">个</span>
            </div>
            <div class="ai-scan-row">
              <label class="ai-scan-label">本次沟通</label>
              <input type="number" class="ai-scan-input" id="ai-scan-max-comm" value="5" min="0" max="30" placeholder="0-30">
              <span class="ai-scan-unit">个</span>
            </div>
            <div class="ai-scan-row">
              <label class="ai-scan-label">单日上限</label>
              <input type="number" class="ai-scan-input" id="ai-scan-daily-limit" value="25" min="1" max="50" placeholder="1-50" title="单日自动沟通硬上限，达到自动熔断">
              <span class="ai-scan-unit">次</span>
            </div>
            <div class="ai-scan-row">
              <label class="ai-scan-label">时延抖动</label>
              <input type="number" class="ai-scan-input ai-delay-input" id="ai-scan-min-delay" value="12" min="5" max="120" title="最小拟人延时(秒)">
              <span class="ai-scan-unit">-</span>
              <input type="number" class="ai-scan-input ai-delay-input" id="ai-scan-max-delay" value="30" min="10" max="300" title="最大拟人延时(秒)">
              <span class="ai-scan-unit">秒</span>
            </div>
            <div class="ai-scan-row ai-scan-switch-row">
              <label class="ai-scan-switch">
                <input type="checkbox" id="ai-scan-auto-comm">
                自动沟通
              </label>
            </div>
            <div class="ai-scan-row">
              <label class="ai-scan-label">HR要求</label>
              <select class="ai-scan-select" id="ai-scan-hr-req">
                <option value="online">仅在线</option>
                <option value="3days">3日内活跃</option>
                <option value="week" selected>本周内活跃</option>
                <option value="month">本月内活跃</option>
                <option value="unlimited">不限制</option>
              </select>
            </div>
          </div>

          <div class="ai-scan-btns">
            <button class="ai-scan-btn ai-scan-btn-start" id="ai-start-auto-scan">开始自动筛选</button>
            <button class="ai-scan-btn ai-scan-btn-diag" id="ai-btn-scan-diag">诊断卡片</button>
            <button class="ai-scan-btn ai-scan-btn-pause" id="ai-btn-scan-pause" disabled>暂停</button>
            <button class="ai-scan-btn ai-scan-btn-continue" id="ai-btn-scan-continue" disabled>继续</button>
            <button class="ai-scan-btn ai-scan-btn-stop" id="ai-btn-scan-stop" disabled>停止</button>
          </div>
          <div class="ai-scan-resume-row">
            <label class="ai-scan-switch">
              <input type="checkbox" id="ai-scan-resume-check" checked>
              继续上次进度
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

        <p class="ai-panel-hint">点击下方按钮，将此岗位发送到AI求职助手进行匹配分析</p>
        <button class="ai-panel-btn ai-btn-primary" id="ai-btn-capture">
          发送到AI求职助手
        </button>
        <div id="ai-panel-result" style="display:none;"></div>
      </div>
      <div class="ai-panel-footer">
        <span class="ai-panel-version">v2.0 (模块化)</span>
      </div>
    </div>
  `;const n=document.createElement("style");n.textContent=ue(),document.head.appendChild(n),document.body.appendChild(t),he(t),xe(t),(i=document.getElementById("ai-panel-toggle"))==null||i.addEventListener("click",h=>{h.stopPropagation(),ye(t)}),(c=document.getElementById("ai-panel-close"))==null||c.addEventListener("click",()=>{t.style.display="none"}),(r=document.getElementById("ai-btn-upload"))==null||r.addEventListener("click",()=>{var h;(h=document.getElementById("ai-resume-file"))==null||h.click()}),(d=document.getElementById("ai-resume-file"))==null||d.addEventListener("change",async h=>{const E=h.target.files[0];if(!E)return;const x=document.getElementById("ai-resume-status");x&&(x.textContent="正在上传简历...",x.className="ai-resume-status");try{const A=await pe(E);p.currentResume=A,await chrome.storage.local.set({resumeId:A.id,resumeFilename:A.filename}),Y()}catch(A){x&&(x.textContent="上传失败: "+A.message,x.className="ai-resume-status error")}h.target.value=""}),le().then(h=>{O(h)});const a=document.getElementById("ai-scan-presets");a==null||a.addEventListener("click",h=>{const E=h.target.closest(".ai-preset-tab");if(!E)return;const x=E.dataset.preset;if(x)if(x in T&&x!=="custom"){const A=T[x],Ke=L({...A,presetMode:x});Object.assign(s,Ke),O(s),$()}else x==="custom"&&(s.presetMode="custom",X("custom"),$())}),["ai-scan-threshold","ai-scan-max-scan","ai-scan-max-comm","ai-scan-daily-limit","ai-scan-min-delay","ai-scan-max-delay","ai-scan-auto-comm","ai-scan-hr-req"].forEach(h=>{const E=document.getElementById(h);E&&E.addEventListener("change",()=>{be("custom")})}),e.onCapture&&((l=document.getElementById("ai-btn-capture"))==null||l.addEventListener("click",e.onCapture)),e.onStartScan&&((u=document.getElementById("ai-start-auto-scan"))==null||u.addEventListener("click",e.onStartScan)),e.onPauseScan&&((m=document.getElementById("ai-btn-scan-pause"))==null||m.addEventListener("click",e.onPauseScan)),e.onContinueScan&&((b=document.getElementById("ai-btn-scan-continue"))==null||b.addEventListener("click",e.onContinueScan)),e.onStopScan&&((y=document.getElementById("ai-btn-scan-stop"))==null||y.addEventListener("click",e.onStopScan)),e.onLoadMore&&((z=document.getElementById("ai-btn-load-more"))==null||z.addEventListener("click",e.onLoadMore)),e.onStopLoad&&((C=document.getElementById("ai-btn-load-stop"))==null||C.addEventListener("click",e.onStopLoad)),e.onResetProgress&&((w=document.getElementById("ai-btn-scan-reset"))==null||w.addEventListener("click",e.onResetProgress))}function X(e){document.querySelectorAll("#ai-scan-presets .ai-preset-tab").forEach(a=>{a.dataset.preset===e?a.classList.add("active"):a.classList.remove("active")});const n=document.getElementById("ai-preset-desc");if(n){const a=T[e]||T.custom;n.textContent=a?a.description:""}}function O(e){const t=document.getElementById("ai-scan-threshold"),n=document.getElementById("ai-scan-max-scan"),a=document.getElementById("ai-scan-max-comm"),o=document.getElementById("ai-scan-daily-limit"),i=document.getElementById("ai-scan-min-delay"),c=document.getElementById("ai-scan-max-delay"),r=document.getElementById("ai-scan-auto-comm"),d=document.getElementById("ai-scan-hr-req");t&&(t.value=e.threshold),n&&(n.value=e.maxScanCount),a&&(a.value=e.maxAutoCommunicateCount),o&&(o.value=e.dailyLimit),i&&(i.value=e.minDelay),c&&(c.value=e.maxDelay),r&&(r.checked=!!e.autoCommunicate),d&&(d.value=e.hrRequirement),X(e.presetMode||"standard")}function be(e="custom"){const t=document.getElementById("ai-scan-threshold"),n=document.getElementById("ai-scan-max-scan"),a=document.getElementById("ai-scan-max-comm"),o=document.getElementById("ai-scan-daily-limit"),i=document.getElementById("ai-scan-min-delay"),c=document.getElementById("ai-scan-max-delay"),r=document.getElementById("ai-scan-auto-comm"),d=document.getElementById("ai-scan-hr-req"),l=L({presetMode:e,threshold:t?Number(t.value):s.threshold,maxScanCount:n?Number(n.value):s.maxScanCount,maxAutoCommunicateCount:a?Number(a.value):s.maxAutoCommunicateCount,dailyLimit:o?Number(o.value):s.dailyLimit,minDelay:i?Number(i.value):s.minDelay,maxDelay:c?Number(c.value):s.maxDelay,autoCommunicate:r?r.checked:s.autoCommunicate,hrRequirement:d?d.value:s.hrRequirement});Object.assign(s,l),O(s),$()}function Y(){const e=document.getElementById("ai-resume-name"),t=document.getElementById("ai-resume-status");!e||!t||(p.currentResume?(e.textContent=p.currentResume.filename,e.className="ai-resume-name ok",t.textContent="已作为默认匹配简历",t.className="ai-resume-status ok"):(e.textContent="未上传",e.className="ai-resume-name empty",t.textContent="请先上传简历，上传后可自动进行岗位匹配分析",t.className="ai-resume-status empty"))}function he(e){const t=e.querySelector("#ai-panel-header");t&&(t.style.cursor="move",t.addEventListener("mousedown",n=>{if(n.target.tagName==="BUTTON")return;f.dragging=!0,f.dragStartX=n.clientX,f.dragStartY=n.clientY;const a=e.getBoundingClientRect();f.startLeft=a.left,f.startTop=a.top,document.body.style.userSelect="none"}),document.addEventListener("mousemove",n=>{if(!f.dragging)return;const a=n.clientX-f.dragStartX,o=n.clientY-f.dragStartY;let i=f.startLeft+a,c=f.startTop+o;const r=e.offsetWidth,d=e.offsetHeight;i=Math.max(0,Math.min(i,window.innerWidth-r)),c=Math.max(0,Math.min(c,window.innerHeight-d)),e.style.right="auto",e.style.bottom="auto",e.style.left=i+"px",e.style.top=c+"px"}),document.addEventListener("mouseup",()=>{f.dragging&&(f.dragging=!1,document.body.style.userSelect="",f.left=parseInt(e.style.left)||e.getBoundingClientRect().left,f.top=parseInt(e.style.top)||e.getBoundingClientRect().top,G())}))}function ye(e){const t=e.querySelector("#ai-panel-body"),n=e.querySelector("#ai-panel-toggle");f.mode==="compact"?(e.classList.remove("ai-compact"),e.classList.add("ai-expanded"),t&&(t.style.display=""),n&&(n.innerHTML="&#8722;",n.title="缩小"),f.mode="expanded"):(e.classList.add("ai-compact"),e.classList.remove("ai-expanded"),t&&(t.style.display="none"),n&&(n.innerHTML="&#9744;",n.title="放大"),f.mode="compact"),G()}async function G(){try{await chrome.storage.local.set({panelState:{mode:f.mode,left:f.left,top:f.top}})}catch{}}async function xe(e){try{const t=await chrome.storage.local.get("panelState");t&&t.panelState&&(f.mode=t.panelState.mode||"expanded",f.left=t.panelState.left,f.top=t.panelState.top)}catch{}if(f.left!=null&&f.top!=null){const t=Math.max(0,Math.min(f.left,window.innerWidth-e.offsetWidth)),n=Math.max(0,Math.min(f.top,window.innerHeight-e.offsetHeight));e.style.right="auto",e.style.bottom="auto",e.style.left=t+"px",e.style.top=n+"px"}if(f.mode==="compact"){e.classList.add("ai-compact");const t=e.querySelector("#ai-panel-body");t&&(t.style.display="none");const n=e.querySelector("#ai-panel-toggle");n&&(n.innerHTML="&#9744;",n.title="放大")}}function k(e){const t=document.createElement("div");return t.textContent=e||"",t.innerHTML}function Ce(e){return{captured:"已保存",analyzed:"已分析",recommended:"推荐投递",applied:"已投递",interview:"面试中"}[e]||e||"未分析"}function Q(e){return ce[e]||"#909399"}function _(){try{const e=(t,n)=>{const a=document.getElementById(t);a&&(a.textContent=n)};e("ai-scan-progress",`${s.currentIndex}/${s.totalCards}`),e("ai-scan-analyzed",s.analyzedCount),e("ai-scan-recommended",s.recommendedCount),e("ai-scan-communicated",s.communicatedCount),e("ai-scan-failed",s.failedCount)}catch(e){console.error("[updateScanStatus]",e)}}function g(e){console.log("[AI求职助手]",e);try{const t=document.getElementById("ai-scan-log");if(!t)return;for(;t.children.length>=300;)t.removeChild(t.firstChild);const n=new Date().toLocaleTimeString("zh-CN",{hour12:!1}),a=document.createElement("div");a.className="ai-scan-log-entry",a.textContent=`[${n}] ${e}`,t.appendChild(a),t.scrollTop=t.scrollHeight}catch{}}function Z(e){g(e)}function we(e,t){const n=document.getElementById("ai-scan-recommended-list");if(!n)return;const a=document.createElement("div");a.className="ai-scan-rec-item";const o=t?"已沟通":"建议沟通",i=t?"ai-scan-rec-comm":"ai-scan-rec-rec",c=Q(e.hr_status);a.innerHTML=`
    <div class="ai-scan-rec-info">
      <span class="ai-scan-rec-title">${k(e.job_title||"-")}</span>
      <span class="ai-scan-rec-company">${k(e.company||"-")}</span>
    </div>
    <div class="ai-scan-rec-score">
      ${e.hr_status?`<span class="ai-scan-rec-hr" style="color:${c}">${k(e.hr_status)}</span>`:""}
      <span class="ai-scan-rec-num">${e.match_score??"--"}</span>分
      <span class="ai-scan-rec-status ${i}">${o}</span>
    </div>
  `,n.appendChild(a)}function ve(e){const t=document.getElementById("ai-panel-result");if(!t)return;const n=e.match_score>=70?"#67C23A":e.match_score>=50?"#E6A23C":"#F56C6C",a=Q(e.hr_status);let o=`
    <div class="ai-result">
      <div class="ai-score-section">
        <div class="ai-score-circle" style="border-color: ${n}; color: ${n};">
          <span class="ai-score-num">${e.match_score??"--"}</span>
          <span class="ai-score-label">分</span>
        </div>
        <div class="ai-score-info">
          <span class="ai-score-level" style="color: ${n};">${e.score_level||"未分析"}</span>
          <span class="ai-status-badge ai-status-${e.status}">${Ce(e.status)}</span>
        </div>
      </div>
      <p class="ai-recommendation">${e.recommendation||e.message||""}</p>
  `;if((e.hr_name||e.hr_status)&&(o+=`
      <div class="ai-hr-info">
        <span class="ai-hr-label">HR：</span>
        ${e.hr_name?`<span class="ai-hr-name">${k(e.hr_name)}</span>`:""}
        ${e.hr_status?`<span class="ai-hr-status" style="color:${a}; background:${a}22; border:1px solid ${a}; padding:2px 8px; border-radius:4px; font-size:11px;">${k(e.hr_status)}</span>`:""}
        ${e.composite_score!=null?`<span class="ai-composite">综合 ${e.composite_score}</span>`:""}
      </div>
    `),e.job_tags&&e.job_tags.length>0){const c=e.job_tags.map(r=>`<span class="ai-job-tag">${k(r)}</span>`).join("");o+=`<div class="ai-job-tags"><span class="ai-tags-label">标签：</span>${c}</div>`}e.should_recommend&&e.job_record_id?o+=`
      <button class="ai-panel-btn ai-btn-success" id="ai-btn-communicate">
        一键沟通
      </button>
    `:!e.should_recommend&&e.job_record_id&&e.match_score!=null&&(o+=`
      <button class="ai-panel-btn ai-btn-outline" id="ai-btn-communicate">
        仍要沟通（手动确认）
      </button>
    `),o+="</div>",t.innerHTML=o;const i=document.getElementById("ai-btn-communicate");i&&i.addEventListener("click",Se)}async function Se(){if(!p.currentJobRecordId)return;const e=document.querySelector(".btn-startchat, .btn-chat, .chat-btn, .op-btn.chat, .btn-immediately");if(e)try{e.click(),console.log("[AI求职助手] 已点击立即沟通按钮")}catch(t){console.warn("[AI求职助手] 点击按钮异常:",t)}try{await U(p.currentJobRecordId);const t=document.querySelector(".ai-status-badge");t&&(t.className="ai-status-badge ai-status-communicated",t.textContent="已沟通");const n=document.getElementById("ai-btn-communicate");n&&(n.disabled=!0,n.textContent="已沟通")}catch(t){console.error("[AI求职助手] 标记沟通失败:",t)}}function H(e){return e?["btn","button","badge","tag","nav","tab","menu","icon","search","filter","sort","page","footer","header-user","dialog","modal","popup","dropdown","user-info"].some(n=>e.includes(n)):!1}function S(e){return!(!e||e.length<2||e.length>50||/^[\d\s\-_]+$/.test(e)||["未找到","未知","公司","企业","招聘","BOSS"].includes(e)||/^[\d.]+k$/i.test(e))}function ee(e){return!e||e.length<2?!1:!!(/^\d+[Kk]?-\d+[Kk]?/.test(e)&&/[Kk元天薪月年]/.test(e)||e==="面议"||/^\d{4,5}-\d{4,5}$/.test(e))}function Ee(e){if(!e)return"";const t=document.createTreeWalker(e,NodeFilter.SHOW_TEXT,{acceptNode:function(o){const i=o.parentElement;if(!i)return NodeFilter.FILTER_REJECT;const c=window.getComputedStyle(i);return c.display==="none"||c.visibility==="hidden"||c.opacity==="0"?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT}});let n="",a;for(;a=t.nextNode();)n+=a.textContent.trim()+" ";return n.trim()}function _e(e){var n,a,o,i,c,r;if(e==="salary"){const d=document.querySelector("h1, .job-title, .name h1, .detail-title h1");if(d){const m=d.closest(".job-detail-header, .job-primary, .job-info, .detail-header")||((n=d.parentElement)==null?void 0:n.parentElement)||d.parentElement;if(m){const b=d.getBoundingClientRect().top,y=[],z=m.querySelectorAll("*");for(const C of z){if(C===d||d.contains(C)||H((a=C.className)==null?void 0:a.toString().toLowerCase()))continue;const w=((o=C.innerText)==null?void 0:o.trim())||((i=C.textContent)==null?void 0:i.trim())||"",h=C.getBoundingClientRect();if(h.width<40||h.height<10||h.top<b-10||h.top>b+60)continue;(/元\/[天日]/.test(w)||/\d+[Kk]/.test(w)||/薪/.test(w)||/[□]{2,}/.test(w)||/面议/.test(w))&&y.push({el:C,rect:h,text:w.substring(0,30)})}if(y.length>0)return y.sort((C,w)=>w.rect.right-C.rect.right),y[0].rect}}const l=document.querySelector('.job-card-wrapper.active, .job-card-wrapper.selected, [class*="job-card"][class*="active"], [class*="job-card"][class*="selected"], .selected .job-card, .active .job-card');if(l){const m=l.getBoundingClientRect();return{left:m.right-220,top:m.top+15,width:200,height:50}}const u=document.querySelectorAll("span, div, p, b, strong");for(const m of u){const b=((c=m.innerText)==null?void 0:c.trim())||"";if(/元\/[天日]/.test(b)&&b.length<30){const y=m.getBoundingClientRect();if(y.width>40&&y.top<500)return y}}return null}if(e==="company"){const d=document.querySelectorAll('div, section, [class*="boss"], [class*="company"], [class*="info"], [class*="sider"], [class*="card-view"], [class*="recruiter"]');for(const u of d){if(u.closest(".job-detail-body, .job-detail-box")||H((r=u.className)==null?void 0:r.toString().toLowerCase()))continue;const m=Ee(u);if(m.length>10&&m.length<200&&(m.includes("HR")||m.includes("在线"))&&(m.includes("·")||m.includes("."))&&!m.includes("职位描述")&&!m.includes("岗位职责")){const b=u.getBoundingClientRect();if(b.width>100&&b.height>20&&b.top<800)return b}}const l=document.querySelector('a[href*="/gongsi/"], a[href*="company"]');if(l){const u=l.getBoundingClientRect();if(u.width>30&&u.height>10)return u}}const t=document.querySelector("h1, .job-title, .name h1");if(t){const d=t.getBoundingClientRect();if(e==="company")return{left:d.left,top:d.bottom+5,width:Math.min(350,d.width),height:40}}return null}async function te(e){p.ocrDebug[e]=p.ocrDebug[e]||{};const t=p.ocrDebug[e];t.steps=[],t.fieldType=e;try{t.steps.push("start");const n=_e(e);if(!n){const b="未找到截图区域rect";return t.steps.push(b),{value:"",reason:b}}const a=window.devicePixelRatio||1;t.rect={left:Math.round(n.left),top:Math.round(n.top),width:Math.round(n.width),height:Math.round(n.height),dpr:a};const o=30,i=20,c={x:Math.max(0,n.left-o),y:Math.max(0,n.top-i),width:n.width+o*2,height:n.height+i*2,dpr:a},r=await chrome.runtime.sendMessage({action:"captureArea",rect:c,tabId:null});if(!r||!r.success){const b="截图失败: "+((r==null?void 0:r.error)||"unknown");return t.steps.push(b),{value:"",reason:b}}t.cropImageBase64=r.imageBase64,t.cropSize=`${c.width}x${c.height} (DPR=${a})`;const d=await chrome.runtime.sendMessage({action:"ocrField",imageBase64:r.imageBase64,fieldType:e});if(!d||!d.success||!d.data){const b="后端OCR失败: "+((d==null?void 0:d.error)||"无响应");return t.steps.push(b),{value:"",reason:b}}const l=d.data;if(t.ocrRawText=l.rawText||"",t.ocrCleanedText=l.cleanedText||"",t.ocrValid=l.valid,t.ocrReason=l.reason||"",!l.valid){const b=l.reason||"OCR校验不通过";return t.steps.push(b),{value:"",reason:b}}const u=l.text;if(e==="company"&&S(u))return t.steps.push("前端校验通过"),{value:u,reason:""};if(e==="salary"&&ee(u))return t.steps.push("前端校验通过"),{value:u,reason:""};const m=`前端校验失败: "${u}"`;return t.steps.push(m),{value:"",reason:m}}catch(n){const a="异常: "+n.message;return t.steps=t.steps||[],t.steps.push(a),{value:"",reason:a}}}function Ie(e){if(!e||e.nodeType!==1)return!0;const t=e.tagName.toLowerCase();if(["style","script","noscript","svg","path","meta","link"].includes(t)||e.hidden||e.getAttribute("aria-hidden")==="true")return!1;try{const n=window.getComputedStyle(e);if(n.display==="none"||n.visibility==="hidden"||parseFloat(n.opacity)===0||parseFloat(n.fontSize)===0)return!1}catch{}return!0}function v(e){if(!e)return"";let t=[];function n(a){if(a.nodeType===Node.ELEMENT_NODE){if(!Ie(a))return;for(const o of a.childNodes)n(o)}else if(a.nodeType===Node.TEXT_NODE){const o=a.nodeValue.replace(/\s+/g," ").trim();o&&t.push(o)}}return n(e),t.join(`
`).replace(/\n{3,}/g,`

`).trim()}function M(e){if(!e)return"";e=e.replace(/[□\uE000-\uF8FF\u200b\u200c\u200d\u200e\u200f\ufeff]/g,""),e=e.replace(/\.[\w-]+\s*\{[^}]*\}/g,""),e=e.replace(/来自BOSS直聘/g,""),e=e.replace(/BOSS直聘/g,""),e=e.replace(/\bkanzhun\b/gi,""),e=e.replace(/岗boss位/gi,"岗位"),e=e.replace(/岗kanzhun位/gi,"岗位"),e=e.replace(/\b(boss|kanzhun)\b/gi,"");const t=["去App与BOSS随时沟通","前往App与BOSS随时沟通","工作地址","点击查看地图","刘女士","王先生","张女士","李女士","赵女士","陈女士","在线 积木","· HR","·HR"];for(const a of t){const o=e.indexOf(a);if(o>50){e=e.substring(0,o);break}}const n=["收藏","立即沟通","举报","微信扫码分享","分享"];for(const a of n)e=e.replace(new RegExp(a,"g"),"");return e=e.split(`
`).map(a=>a.trim()).filter(a=>!(a.length===0||/^[{};:#.\s]+$/.test(a)||/^@[\w-]/.test(a))).join(`
`),e=e.replace(/[\t ]+/g," ").replace(/\n{3,}/g,`

`).trim(),e}function Ae(e){if(!e||e.length<80)return!1;const t=["求职类型","薪资待遇","经验要求","学历要求","公司规模","融资阶段","行业筛选","地图搜索","3K以下","5-10K","10-20K","50K以上","职位类型","工作性质","发布时间"];let n=0;for(const d of t)e.includes(d)&&n++;if(n>=2)return!1;const a=["首页","消息","简历new","AI简历","智能简历","个人中心","升级VIP","尊享","投递状态","在线简历","BOSS直聘","岗位筛选","所在城市","薪资范围","求职期望"];let o=0;for(const d of a)e.includes(d)&&o++;if(o>=3)return!1;const i=["岗位职责","任职要求","职位描述","工作内容","岗位要求","岗位描述","技能要求","加分项","优先考虑"];let c=0;for(const d of i)e.includes(d)&&(c+=3);const r=["负责","经验","熟练","掌握","熟悉","了解","具备","项目","开发","设计","能力","团队","技术","产品","本科","专科","硕士","相关专业","计算机","框架","数据库","前端","后端","算法","架构","优化","维护","实现","完成","参与","独立"];for(const d of r)e.includes(d)&&(c+=1);return c>=6||c>=3&&e.length>300}function ne(){var a;const e=["北京","上海","广州","深圳","杭州","成都","武汉","南京","西安","重庆","苏州","天津","长沙","郑州","济南","青岛","合肥","福州","厦门","东莞","佛山","无锡","宁波","大连","沈阳","哈尔滨","长春","昆明","贵阳","南宁","海口","拉萨","银川","西宁","兰州","呼和浩特","乌鲁木齐","石家庄","太原"],t=document.querySelectorAll('.job-location, .location-address, .address-text, .job-area, .detail-location, .location, .city-name, .current-city, [class*="address"], [class*="location"]');for(const o of t){const i=((a=o.innerText)==null?void 0:a.trim())||"";for(const c of e)if(i.includes(c))return c}const n=document.body.innerText||"";for(const o of e){const i=n.indexOf(o);if(i!==-1&&i<5e3)return o}return null}function I(e){if(!e)return!1;const t=e.trim();return!(["职位描述","岗位职责","任职要求","岗位要求","工作地址","公司介绍","工作内容","职位要求","岗位描述","技能要求"].includes(t)||["刚刚活跃","先生","女士","HR","人事","招聘者","主管","经理","在线","活跃","离线"].some(i=>t.includes(i))||/^[\u4e00-\u9fa5]{1,4}(先生|女士)(.+(活跃|在线))?$/.test(t)||/^(先生|女士|在线|活跃|HR|人事|招聘)/.test(t)||["收藏","立即沟通","举报","分享","微信扫码","工作地址","点击查看"].some(i=>t.includes(i))||t.length<3||t.length>80)}function q(e){const t=e.search(/[□\uE000-\uF8FF\u200b\u200c\u200d\u200e\u200f\ufeff\u00A0]/);return t>0&&(e=e.substring(0,t)),e.replace(/\d+[-~—–]\d+元\/[天日]/g,"").replace(/\d+[-~—–]\d+[Kk]([·\u00b7]\d+薪)?/g,"").replace(/职位描述|岗位职责|任职要求|工作地址|岗位要求|工作内容/g,"").replace(/\s+/g," ").trim()}function ke(e){const n=[...(e||document).querySelectorAll("h1")];for(const o of n){const i=v(o).trim();if(I(i))return q(i)}if(e){const o=e.querySelector('[class*="boss"], [class*="recruiter"], [class*="contact"]'),i=e.querySelectorAll('.job-title, .name:not(.boss-name), [class*="title"]:not([class*="boss"])');for(const c of i){if(o&&o.contains(c))continue;const r=v(c).trim();if(I(r)&&r.length>5)return q(r)}}const a=[...document.querySelectorAll("h1")];for(const o of a){if(o.getBoundingClientRect().left<window.innerWidth*.3)continue;const c=v(o).trim();if(I(c))return q(c)}return""}function Be(){const t=[...document.querySelectorAll("h2, h3, h4, div, span, p, strong, b")].find(i=>{const c=i.innerText?i.innerText.trim():i.textContent.trim();return c==="工作地址"&&c.length===4});if(!t)return"";let n=t.parentElement;for(let i=0;i<5&&n;i++){const c=n.innerText?n.innerText.trim():v(n),r=D(c);if(r&&r.length>=4)return r;n=n.parentElement}let a=t.nextElementSibling,o=[];for(;a;){const i=a.innerText?a.innerText.trim():v(a);i&&!/点击查看地图|查看地图|职位描述|岗位职责/.test(i)&&o.push(i),a=a.nextElementSibling}return D(o.join(""))}function D(e){if(!e)return"";const t=e.search(/[□\uE000-\uF8FF\u200b\u200c\u200d\ufeff]/);return t>0&&(e=e.substring(0,t)),e.replace(/工作地址/g,"").replace(/点击查看地图/g,"").replace(/查看地图/g,"").replace(/职位描述|岗位职责|任职要求/g,"").replace(/\s+/g,"").trim()}function Re(){const e=[".job-detail-box",".job-detail",".detail-box",".job-main",'[class*="job-detail"]',".detail-content-wrapper"];for(const t of e)try{const n=document.querySelector(t);if(n&&n.getBoundingClientRect().left>window.innerWidth*.3)return n}catch{}return null}function De(){const e=['[class*="job-card"][class*="active"]','[class*="job-card"][class*="selected"]','[class*="job-card"][class*="cur"]','[class*="selected"] [class*="job-card"]',".job-card-wrapper.active"];for(const t of e)try{const n=document.querySelector(t);if(n)return n}catch{}return null}function ae(e){const t=e.querySelectorAll('[class*="boss"], [class*="company"], [class*="recruiter"], [class*="info-block"], div');for(const n of t){const a=v(n);if(a.length<5||a.length>200)continue;const o=a.match(/在线\s+(.+?)(?:\s*[·.]\s*HR|\s*·\s*HR)/);if(o&&S(o[1].trim()))return{value:o[1].trim(),source:"DOM(详情)"};const i=n.querySelector('a[href*="/gongsi/"]');if(i&&S(i.textContent.trim()))return{value:i.textContent.trim(),source:"DOM(链接)"}}return{value:"",source:"DOM"}}function je(){const e=Te();if(e){let o=[],i=e.nextElementSibling;const c=["H1","H2","H3","H4","H5"],r=["工作地址","点击查看地图","去App与BOSS随时沟通","前往App与BOSS随时沟通"];for(;i&&!c.includes(i.tagName);){const l=i.tagName,u=(i.className||"").toString().toLowerCase();if(["UL","P","DIV"].includes(l)&&!H(u)){const m=i.innerText?i.innerText.trim():"";if(r.some(y=>m.includes(y)))break;const b=v(i);b.length>0&&o.push(b)}i=i.nextElementSibling}let d=M(o.join(`
`));if(d.length>=80)return d}if(e)for(const o of["job-detail-body","job-detail-box"]){const i=e.closest("."+o);if(i){let c=M(v(i));if(c.length>=80)return c}}const t=[".job-detail-body",".job-detail-box",'[class*="job-detail"]',".detail-content"];for(const o of t)try{const i=document.querySelector(o);if(i){let c=M(v(i));if(c.length>=80)return c}}catch{}let n="";const a=document.querySelectorAll("div, section, article");for(const o of a){let i=M(v(o));i.length>n.length&&i.length>80&&i.length<8e3&&Ae(i)&&(n=i)}return n}function Te(){const e=["职位描述","岗位职责","任职要求","工作内容","职位要求","岗位要求","岗位描述"],t=document.querySelectorAll("h1, h2, h3, h4, h5, strong, b, div, span");for(const n of t){const a=n.innerText?n.innerText.trim():"";if(e.some(o=>a===o||a.includes(o)&&a.length<20))return n}return null}async function oe(){p.fieldSources={},p.ocrDebug={};const e=window.location.href,t=Re(),n=De();let a=ke(t);if(!a&&n){const l=n.querySelector('.job-name, .name, [class*="title"], a');if(l){const u=l.textContent.trim();I(u)&&(a=q(u))}}if(a||(a="-"),p.fieldSources.jobTitle=a!=="-"?"DOM":"失败",!I(a)||a==="-"){const l=document.title.replace(/[-|].*$/,"").trim();I(l)&&l.length>3?(a=l,p.fieldSources.jobTitle="DOM(页面标题)"):(a="-",p.fieldSources.jobTitle="失败(无效标题)")}let o="";if(n){const l=n.querySelector('a[href*="/gongsi/"], a[href*="company"], [class*="company"] a, [class*="company"]');if(l){const u=l.textContent.trim();S(u)&&(o=u,p.fieldSources.company="DOM(卡片)")}}if(!S(o)&&t){let{value:l,source:u}=ae(t);o=l,S(o)&&(p.fieldSources.company=u)}if(!S(o)){let{value:l,source:u}=ae(document.body);o=l,S(o)&&(p.fieldSources.company=u)}if(!S(o)){const l=await te("company");l.value?(o=l.value,p.fieldSources.company="OCR"):(o="-",p.fieldSources.company="失败")}let i="",c="";if(t){const l=t.querySelectorAll('[class*="salary"], [class*="pay"], span, div');for(const u of l){const m=u.textContent.trim();if(/元\/[天日]/.test(m)||/\d+[Kk]/.test(m)||/面议/.test(m)||/□/.test(m)){c=m;break}}}if(ee(c))i=c,p.fieldSources.salary="DOM";else{const l=await te("salary");l.value?(i=l.value,p.fieldSources.salary="OCR"):(i="-",p.fieldSources.salary="失败")}let r=Be();if(r)p.fieldSources.location="DOM(工作地址)";else{if(t){const l=t.querySelector('[class*="location"], [class*="address"], [class*="area"]');l&&(r=D(l.textContent.trim()).substring(0,15))}if(r)p.fieldSources.location="DOM(顶部)";else if(n){const l=n.querySelector('[class*="location"], [class*="address"], [class*="area"]');l&&(r=D(l.textContent.trim()).substring(0,15)),p.fieldSources.location=r?"DOM(卡片)":"失败"}r||(r=ne(),p.fieldSources.location=r?"DOM兜底":"失败")}r=D(r||"");let d=je();return p.fieldSources.jobDescription=d?"DOM":"失败",(!I(a)||a==="职位描述")&&(a="-"),(!r||r==="-"||r.length<2)&&(r=ne()||"-"),{jobTitle:a,company:o,salary:i,location:r,jobDescription:d,jobUrl:e}}function Le(e=15,t=45){const n=Math.max(Math.random(),1e-7),a=Math.random(),o=Math.sqrt(-2*Math.log(n))*Math.cos(2*Math.PI*a),i=(e+t)/2,c=(t-e)/6,r=Math.round(i+o*c);return Math.max(e,Math.min(t,r))}function se(){const e=new Date,t=e.getFullYear(),n=String(e.getMonth()+1).padStart(2,"0"),a=String(e.getDate()).padStart(2,"0");return`daily_comm_${t}-${n}-${a}`}async function P(){const e=se();try{return typeof chrome<"u"&&chrome.storage&&chrome.storage.local?(await chrome.storage.local.get([e]))[e]||0:parseInt(localStorage.getItem(e)||"0",10)}catch{return parseInt(localStorage.getItem(e)||"0",10)}}async function $e(){const e=se(),n=await P()+1;try{typeof chrome<"u"&&chrome.storage&&chrome.storage.local?await chrome.storage.local.set({[e]:n}):localStorage.setItem(e,String(n))}catch{localStorage.setItem(e,String(n))}return n}function J(){const e=[".geetest_holder",".geetest_popup",".geetest_radar_tip",'[class*="geetest"]',"#captcha",'[class*="captcha"]','[class*="verify-wrap"]','[class*="security-dialog"]',".dialog-wrap.verify-dialog"];for(const n of e)try{const a=document.querySelector(n);if(a&&a.offsetParent!==null)return{detected:!0,reason:`匹配到风控元素: ${n}`}}catch{}const t=document.querySelectorAll('.dialog-container, .dialog-wrap, .boss-popup, .modal-content, [role="dialog"]');for(const n of t)if(n.offsetParent!==null){const a=n.innerText||"";if(/操作过于频繁|操作频繁|系统检测到异常|安全验证|安全校验|请完成验证/.test(a))return{detected:!0,reason:`检测到风控提示文本: "${a.substring(0,30)}"`}}return{detected:!1}}function F(e){if(s.stopRequested)throw new Error("__SCAN_STOPPED__");if(s.pauseRequested)throw s.pausedAtStep=e||"未知",new Error("__SCAN_PAUSED__")}async function N(e,t){const a=s.controlVersion;for(let o=0;o<e;o+=100)s.controlVersion!==a&&F(t||"sleep"),await new Promise(i=>setTimeout(i,Math.min(100,e-o)))}function Me(){if(s.status!=="running")return;if(s.pauseRequested=!0,s.status="paused",s.controlVersion++,s.activeAbortController){try{s.activeAbortController.abort()}catch{}s.activeAbortController=null}g("已请求立即暂停：当前请求已中断，扫描进度已保存"),_();const e=document.getElementById("ai-btn-scan-pause"),t=document.getElementById("ai-btn-scan-continue");e&&(e.disabled=!0),t&&(t.disabled=!1)}function qe(){if(s.stopRequested=!0,s.pauseRequested=!1,s.status="stopped",s.controlVersion++,s.activeAbortController){try{s.activeAbortController.abort()}catch{}s.activeAbortController=null}g("已请求立即停止：当前请求已中断，扫描进度已保存"),_(),K("done")}function Fe(){if(s.status!=="paused")return;s.pauseRequested=!1,s.stopRequested=!1,s.status="running",s.controlVersion++,g("=== 从暂停处继续扫描 ===");const e=document.getElementById("ai-btn-scan-pause"),t=document.getElementById("ai-btn-scan-continue");e&&(e.disabled=!1),t&&(t.disabled=!0)}function K(e){const t=document.getElementById("ai-start-auto-scan"),n=document.getElementById("ai-btn-scan-pause"),a=document.getElementById("ai-btn-scan-continue"),o=document.getElementById("ai-btn-scan-stop");t&&(e==="running"?(t.disabled=!0,n&&(n.disabled=!1),a&&(a.disabled=!0),o&&(o.disabled=!1)):e==="done"&&(t.disabled=!1,n&&(n.disabled=!0),a&&(a.disabled=!0),o&&(o.disabled=!0)))}async function Ne(e,t){var o;F("before sendJobForScan"),Z("已发送AI分析...");let n=((o=p.currentResume)==null?void 0:o.id)||null;if(!n)try{n=(await chrome.storage.local.get(["resumeId"])).resumeId||null}catch{try{const c=localStorage.getItem("ai_resume_id");n=c?parseInt(c):null}catch{n=null}}const a=new AbortController;s.activeAbortController=a;try{return await V({resume_id:n,job_title:e.jobTitle,company:e.company||null,salary:e.salary||null,location:e.location||null,job_url:e.jobUrl,job_description:e.jobDescription,captured_page_url:window.location.href,card_index:t,job_unique_key:e._uniqueKey,scan_session_id:s.sessionId},a.signal)}catch(i){throw i.name==="AbortError"&&(g("AI分析请求已被中断"),F("after abort")),i}finally{s.activeAbortController===a&&(s.activeAbortController=null)}}async function ze(){if(g("=== 开始自动筛选 ==="),typeof window<"u"&&document.getElementById("ai-scan-threshold")){const n=document.getElementById("ai-scan-threshold"),a=document.getElementById("ai-scan-max-scan"),o=document.getElementById("ai-scan-max-comm"),i=document.getElementById("ai-scan-auto-comm"),c=document.getElementById("ai-scan-hr-req"),r=document.getElementById("ai-scan-min-delay"),d=document.getElementById("ai-scan-max-delay"),l=document.getElementById("ai-scan-daily-limit"),u={presetMode:s.presetMode,threshold:n?Number(n.value):s.threshold,maxScanCount:a?Number(a.value):s.maxScanCount,maxAutoCommunicateCount:o?Number(o.value):s.maxAutoCommunicateCount,autoCommunicate:i?i.checked:s.autoCommunicate,hrRequirement:c?c.value:s.hrRequirement,minDelay:r?Number(r.value):s.minDelay,maxDelay:d?Number(d.value):s.maxDelay,dailyLimit:l?Number(l.value):s.dailyLimit},m=L(u);Object.assign(s,m),await $()}const e=document.querySelectorAll('.job-card-wrapper, .job-card-box, [class*="job-card"]');s.totalCards=e.length,s.status="running",s.sessionId="scan_"+Date.now(),K("running"),_();const t=document.getElementById("ai-scan-status");t&&(t.style.display="block");try{for(let n=s.currentIndex;n<e.length;n++){F(`card ${n}`);const a=J();if(a.detected){g(`🚨 [风控熔断] 页面出现安全验证（${a.reason}），已紧急停止自动扫描保护账号！`),s.stopRequested=!0;break}if(s.analyzedCount>=s.maxScanCount){g(`已达单次最大扫描数 (${s.maxScanCount})，停止扫描`);break}const o=e[n];o.scrollIntoView({behavior:"smooth",block:"center"}),await N(Math.floor(500+Math.random()*400),"scroll");try{o.click()}catch{}await N(Math.floor(900+Math.random()*600),"after card click");const i=await oe();await Oe(i,n,o);const c=Le(s.minDelay,s.maxDelay);Z(`高斯拟人等待 ${c} 秒 (${s.minDelay}-${s.maxDelay}s)...`),await N(c*1e3,"between jobs")}g("=== 自动筛选结束 ===")}catch(n){n.message==="__SCAN_STOPPED__"?g("扫描已由用户终止"):n.message==="__SCAN_PAUSED__"?g(`扫描已在步骤 [${s.pausedAtStep}] 暂停`):g(`扫描异常终止: ${n.message}`)}finally{s.status!=="paused"&&(s.status="idle",K("done"))}}async function Oe(e,t,n){if(!e.jobDescription||e.jobDescription.length<80){s.failedCount++,s.currentIndex=t+1,_(),g(`JD过短(${e.jobDescription?e.jobDescription.length:0}字)，已跳过`);return}g(`提取成功：${e.jobTitle||"-"} / ${e.company||"-"}`);const a=`${e.jobTitle}_${e.company}_${e.salary}`;if(s.seenKeys.has(a)){s.currentIndex=t+1,g("该岗位已在本次扫描记录中，已跳过");return}s.seenKeys.add(a),e._uniqueKey=a;let o;try{o=await Ne(e,t)}catch(i){s.failedCount++,s.currentIndex=t+1,_(),g(`分析请求失败: ${i.message}`);return}if(s.analyzedCount++,s.currentIndex=t+1,_(),o.match_score>=s.threshold){s.recommendedCount++,g(`匹配度 ${o.match_score} → 达到推荐阈值(${s.threshold})`);let i=!1;if(s.autoCommunicate)if(s.communicatedCount>=s.maxAutoCommunicateCount)g(`已达单次最大沟通数 (${s.maxAutoCommunicateCount})，本次跳过自动打招呼`);else{const c=o.hr_status||"未知";!s.hrStatusAllowed||s.hrStatusAllowed.includes(c)?i=await He(o):g(`HR活跃度 [${c}] 不满足要求 [${re[s.hrRequirement]||s.hrRequirement}]，跳过自动沟通`)}we({job_title:e.jobTitle,company:e.company,match_score:o.match_score,job_record_id:o.job_record_id,hr_status:o.hr_status},i)}else g(`匹配度 ${o.match_score} 低于阈值 ${s.threshold}，跳过`)}async function He(e){const t=J();if(t.detected)return g(`🚨 [风控熔断] ${t.reason}！已紧急停止自动化操作！`),s.stopRequested=!0,!1;const n=await P(),a=s.dailyLimit||20;if(n>=a)return g(`⚠️ [风控拦截] 今日自动沟通已达上限（${n}/${a}次），已强制停止沟通保护账号！`),s.stopRequested=!0,!1;const o=document.querySelector(".btn-startchat, .btn-chat, .chat-btn, .op-btn.chat, .btn-immediately");if(!o)return g('未找到"立即沟通"按钮'),!1;g('正在点击"立即沟通"');try{o.click()}catch{return g("点击按钮失败"),!1}await N(1e3,"after chat click");const i=J();if(i.detected)return g(`🚨 [风控熔断] 点击后触发安全验证（${i.reason}），已紧急熔断停止！`),s.stopRequested=!0,!1;try{await U(e.job_record_id),s.communicatedCount++,await $e();const c=await P();return g(`沟通成功（今日累计沟通 ${c}/${a} 次）`),_(),!0}catch{return!1}}async function Pe(){var n;const e=document.getElementById("ai-btn-capture"),t=document.getElementById("ai-panel-result");if(!(!e||!t)){e.disabled=!0,e.textContent="分析中...",t.style.display="block",t.innerHTML='<p class="ai-loading">正在提取岗位信息并发送匹配分析...</p>';try{const a=await oe();if(!a.jobTitle||!a.jobDescription||a.jobTitle==="-")throw new Error("未能在当前页面有效提取到岗位标题或JD内容");let o=((n=p.currentResume)==null?void 0:n.id)||null;o||(o=(await chrome.storage.local.get(["resumeId"])).resumeId||null);const i=await V({resume_id:o,job_title:a.jobTitle,company:a.company||null,salary:a.salary||null,location:a.location||null,job_url:a.jobUrl,job_description:a.jobDescription,captured_page_url:window.location.href});p.currentJobRecordId=i.job_record_id,ve(i)}catch(a){t.innerHTML=`
      <div class="ai-error">
        <p>分析失败：${a.message}</p>
        <p class="ai-hint">请确认后端服务已在 http://127.0.0.1:8000 正常运行。</p>
      </div>
    `}finally{e.disabled=!1,e.textContent="重新发送分析"}}}async function Je(){try{const e=await me();if(e)p.currentResume=e,await chrome.storage.local.set({resumeId:e.id,resumeFilename:e.filename});else{const t=await chrome.storage.local.get(["resumeId","resumeFilename"]);t.resumeId&&(p.currentResume={id:t.resumeId,filename:t.resumeFilename||"已上传简历"})}}catch{}Y()}function ie(){document.getElementById(j)||setTimeout(()=>{ge({onCapture:Pe,onStartScan:ze,onPauseScan:Me,onContinueScan:Fe,onStopScan:qe,onResetProgress:()=>{de(),g("扫描状态已重置")}}),Je()},1200)}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",ie):ie()})();
