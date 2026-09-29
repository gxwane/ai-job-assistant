<template>
  <!-- 首页 - 现代 SaaS 质感产品展台 -->
  <div class="home-page">
    <!-- Hero 视觉展台 -->
    <section class="hero-section">
      <!-- 顶部告示小胶囊 -->
      <div class="hero-pill-badge">
        <span class="pill-sparkle">✨</span>
        <span class="pill-text">AI 智能求职驱动 · 专为职场人打造的深度匹配引擎</span>
      </div>

      <!-- 主标题与渐变大字 -->
      <h1 class="hero-title">
        精准匹配心仪岗位<br>
        <span class="hero-title-gradient">让求职每一次投递都心中有数</span>
      </h1>

      <p class="hero-subtitle">
        上传简历一键提取结构化能力画像，多维比对职位 JD，输出专业雷达图打分、改写优化建议与独家面试真题。
      </p>

      <!-- 核心亮点 Chips 矩阵 -->
      <div class="hero-features-chips">
        <div class="feature-chip">
          <span class="chip-indicator dot-blue"></span>
          <span>简历智能结构化解析</span>
        </div>
        <div class="feature-chip">
          <span class="chip-indicator dot-indigo"></span>
          <span>JD 胜任力雷达图打分</span>
        </div>
        <div class="feature-chip">
          <span class="chip-indicator dot-purple"></span>
          <span>针对性改写优化建议</span>
        </div>
        <div class="feature-chip">
          <span class="chip-indicator dot-emerald"></span>
          <span>独家岗位定制面试题库</span>
        </div>
      </div>

      <!-- 核心行动按钮组 (CTA) -->
      <div class="hero-actions">
        <el-button type="primary" class="hero-btn-primary" @click="$router.push('/upload')">
          <el-icon :size="18"><UploadFilled /></el-icon>
          <span>立即开始分析</span>
        </el-button>
        <el-button class="hero-btn-secondary" @click="$router.push('/history')">
          <el-icon :size="16"><Clock /></el-icon>
          <span>查看历史记录</span>
        </el-button>
      </div>
    </section>

    <!-- 4 步极速使用流程矩阵 -->
    <section class="steps-section">
      <div class="steps-header">
        <h2 class="steps-main-title">4 步开启求职智能化闭环</h2>
        <p class="steps-sub-title">从简历多维解析到定向面试准备，极速顺畅的全流程驱动</p>
      </div>

      <div class="steps-grid">
        <div
          v-for="(step, index) in steps"
          :key="index"
          class="step-card"
        >
          <div class="step-card-header">
            <div class="step-icon-wrap" :style="{ backgroundColor: step.bg, color: step.color }">
              <component :is="step.icon" />
            </div>
            <span class="step-counter">{{ step.stepNum }}</span>
          </div>
          <h3 class="step-title">{{ step.title }}</h3>
          <p class="step-desc">{{ step.desc }}</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
const steps = [
  {
    stepNum: '01',
    icon: 'UploadFilled',
    color: '#2563eb',
    bg: '#eff6ff',
    title: '上传简历',
    desc: '支持 PDF 与 Word 格式，本地极速解析，数据完全隐私隔离',
  },
  {
    stepNum: '02',
    icon: 'Document',
    color: '#059669',
    bg: '#ecfdf5',
    title: '录入岗位 JD',
    desc: '支持手动粘贴或使用浏览器插件在招聘页面一键捕获',
  },
  {
    stepNum: '03',
    icon: 'Cpu',
    color: '#d97706',
    bg: '#fffbeb',
    title: 'AI 深度画像',
    desc: '多维雷达图打分、胜任力比对、硬伤预警与薪资对齐',
  },
  {
    stepNum: '04',
    icon: 'DataAnalysis',
    color: '#7c3aed',
    bg: '#f5f3ff',
    title: '备战与优化',
    desc: '获取针对性改写建议、定制高频面试真题与导出 PDF 报告',
  },
]
</script>

<style scoped>
.home-page {
  padding: 8px 0 40px;
}

/* Hero 展台容器 */
.hero-section {
  text-align: center;
  padding: 56px 24px 50px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  margin-bottom: 44px;
  box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.03);
  position: relative;
  overflow: hidden;
}

/* 顶部微高光背景装饰 */
.hero-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 700px;
  height: 220px;
  background: radial-gradient(50% 50% at 50% 0%, rgba(99, 102, 241, 0.08) 0%, transparent 100%);
  pointer-events: none;
}

/* 顶部微胶囊告示 */
.hero-pill-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 5px 14px;
  border-radius: 20px;
  margin-bottom: 24px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
}

.pill-sparkle {
  font-size: 14px;
}

.pill-text {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  letter-spacing: 0.2px;
}

/* 主标题 */
.hero-title {
  font-size: 44px;
  font-weight: 800;
  line-height: 1.25;
  color: #0f172a;
  letter-spacing: -1px;
  margin-bottom: 18px;
}

.hero-title-gradient {
  background: linear-gradient(135deg, #4f46e5 0%, #2563eb 50%, #06b6d4 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: 17px;
  color: #64748b;
  max-width: 680px;
  margin: 0 auto 32px;
  line-height: 1.65;
}

/* 特性胶囊 Chips */
.hero-features-chips {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  margin-bottom: 38px;
  flex-wrap: wrap;
}

.feature-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  color: #475569;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.feature-chip:hover {
  background: #ffffff;
  border-color: #cbd5e1;
  color: #0f172a;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
}

.chip-indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.dot-blue { background-color: #3b82f6; }
.dot-indigo { background-color: #6366f1; }
.dot-purple { background-color: #8b5cf6; }
.dot-emerald { background-color: #10b981; }

/* 行动号召按钮组 (CTA) */
.hero-actions {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
}

.hero-btn-primary {
  height: 48px;
  padding: 0 32px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  background: linear-gradient(135deg, #4f46e5 0%, #2563eb 100%) !important;
  border: none !important;
  color: #ffffff !important;
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.28);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.hero-btn-primary:hover {
  box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4);
  transform: translateY(-1px);
}

.hero-btn-secondary {
  height: 48px;
  padding: 0 26px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  background: #ffffff !important;
  border: 1px solid #cbd5e1 !important;
  color: #334155 !important;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.hero-btn-secondary:hover {
  background: #f8fafc !important;
  border-color: #94a3b8 !important;
  color: #0f172a !important;
  transform: translateY(-1px);
}

/* 4步流程区域 */
.steps-section {
  max-width: 1180px;
  margin: 0 auto;
}

.steps-header {
  text-align: center;
  margin-bottom: 28px;
}

.steps-main-title {
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.3px;
  margin-bottom: 6px;
}

.steps-sub-title {
  font-size: 14px;
  color: #64748b;
}

/* 卡片栅格 */
.steps-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.step-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 24px 20px;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
}

.step-card:hover {
  transform: translateY(-3px);
  border-color: #cbd5e1;
  box-shadow: 0 10px 24px -4px rgba(0, 0, 0, 0.05);
}

.step-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.step-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}

.step-counter {
  font-size: 14px;
  font-weight: 800;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: #cbd5e1;
  letter-spacing: 0.5px;
}

.step-title {
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 8px;
}

.step-desc {
  font-size: 13px;
  color: #64748b;
  line-height: 1.55;
}

@media (max-width: 900px) {
  .steps-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .hero-title {
    font-size: 34px;
  }
}
</style>
