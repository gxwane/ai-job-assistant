<template>
  <!-- 分析结果页 - 现代 Bento Grid 仪表盘风格 -->
  <div class="result-page">
    <el-steps :active="3" align-center class="result-steps">
      <el-step title="上传简历" />
      <el-step title="岗位分析" />
      <el-step title="查看结果" />
    </el-steps>

    <div v-if="result" class="result-bento-layout">
      <!-- ================= 左侧：核心概览与操作坞 (Sticky Overview) ================= -->
      <aside class="result-sidebar">
        <!-- 1. 总分仪表盘卡片 -->
        <div class="bento-card score-hero-card score-dashboard">
          <div class="score-ring-container">
            <el-progress
              type="dashboard"
              :percentage="result.result_json.match_score"
              :color="scoreColor"
              :stroke-width="12"
              :width="150"
            >
              <template #default="{ percentage }">
                <div class="score-text-inner">
                  <span class="score-val">{{ percentage }}</span>
                  <span class="score-unit">分</span>
                </div>
              </template>
            </el-progress>
          </div>

          <div class="score-meta-panel">
            <div class="score-badge-wrap">
              <el-tag
                :type="scoreLevelType"
                size="large"
                effect="dark"
                round
                class="score-status-badge"
              >
                {{ result.result_json.score_level || scoreLabel }}
              </el-tag>
            </div>
            <p class="score-summary-advice">
              {{ result.result_json.recommendation || scoreLabel }}
            </p>
            <div class="job-target-chip">
              <el-icon><Briefcase /></el-icon>
              <span class="job-title-text">{{ result.job_title }}</span>
            </div>
          </div>
        </div>

        <!-- 2. 岗位方向匹配卡片 -->
        <div class="bento-card direction-card">
          <div class="bento-header">
            <div class="bento-title-icon icon-blue">
              <el-icon><Guide /></el-icon>
            </div>
            <span class="bento-title">方向对齐判定</span>
          </div>

          <div class="direction-grid">
            <div class="direction-cell">
              <span class="dir-k">候选人画像</span>
              <span class="dir-v dir-v-primary">{{ result.result_json.resume_category || '通用/未识别' }}</span>
            </div>
            <div class="direction-cell">
              <span class="dir-k">岗位定位</span>
              <span class="dir-v dir-v-warning">{{ result.result_json.job_category || '通用/未识别' }}</span>
            </div>
          </div>

          <div class="direction-verdict-row">
            <span class="verdict-label">匹配结论</span>
            <span class="verdict-tag" :class="result.result_json.category_match ? 'tag-match' : 'tag-mismatch'">
              {{ result.result_json.category_match ? '✓ 方向一致' : '✕ 跨方向/偏离' }}
            </span>
          </div>
          <p v-if="result.result_json.category_reason" class="verdict-reason">
            {{ result.result_json.category_reason }}
          </p>
        </div>

        <!-- 3. 核心技能命中率卡片 -->
        <div class="bento-card hit-rate-card">
          <div class="bento-header">
            <div class="bento-title-icon icon-purple">
              <el-icon><Aim /></el-icon>
            </div>
            <span class="bento-title">核心技能命中率</span>
          </div>

          <div class="hit-rate-bar-wrap">
            <el-progress
              :percentage="Math.round((result.result_json.core_skill_hit_rate || 0) * 100)"
              :color="hitRateColor"
              :stroke-width="12"
            />
          </div>

          <div class="hit-rate-counts">
            <div class="hit-count-pill pill-success">
              <span class="pill-dot dot-green"></span>
              <span>命中 {{ (result.result_json.matched_core_skills || []).length }} 项</span>
            </div>
            <div class="hit-count-pill pill-danger">
              <span class="pill-dot dot-red"></span>
              <span>待补 {{ (result.result_json.missing_core_skills || []).length }} 项</span>
            </div>
          </div>
        </div>

        <!-- 4. 快捷操作坞 (Action Dock) -->
        <div class="bento-card action-dock-card">
          <el-button type="primary" class="dock-btn-primary" @click="$router.push('/upload')">
            <el-icon><Refresh /></el-icon> 分析新岗位
          </el-button>
          <el-button class="dock-btn-secondary" @click="$router.push('/history')">
            <el-icon><Clock /></el-icon> 查看历史
          </el-button>
        </div>
      </aside>

      <!-- ================= 右侧：多维能力画像与深度矩阵 (Detailed Matrix) ================= -->
      <main class="result-main-col">
        <!-- 风险提示与封顶警告（如有） -->
        <div v-if="result.result_json.risk_warnings && result.result_json.risk_warnings.length > 0" class="alert-block">
          <el-alert
            title="投递前风险提示"
            type="warning"
            :closable="false"
            show-icon
          >
            <ul class="alert-list">
              <li v-for="(w, i) in result.result_json.risk_warnings" :key="i">{{ w }}</li>
            </ul>
          </el-alert>
        </div>

        <div v-if="result.result_json.score_cap_reason" class="alert-block">
          <el-alert
            title="规则封顶约束说明"
            type="info"
            :closable="false"
            show-icon
          >
            <p>{{ result.result_json.score_cap_reason }}</p>
          </el-alert>
        </div>

        <!-- 1. 四维能力分项打分矩阵 -->
        <div class="bento-card">
          <div class="bento-header">
            <div class="bento-title-icon icon-emerald">
              <el-icon><DataAnalysis /></el-icon>
            </div>
            <div>
              <h3 class="bento-title">分项能力维度拆解</h3>
              <p class="bento-subtitle">基于大语言模型结构化评估的四维评分模型</p>
            </div>
          </div>

          <div class="sub-score-grid">
            <div class="sub-score-card">
              <div class="sub-score-top">
                <span class="sub-k">技能匹配度</span>
                <span class="sub-v-badge badge-blue">{{ scoreBreakdown.skill_score }} <small>/ 40</small></span>
              </div>
              <el-progress
                :percentage="(scoreBreakdown.skill_score / 40) * 100"
                :color="progressColor(scoreBreakdown.skill_score, 40)"
                :stroke-width="8"
                :show-text="false"
              />
            </div>

            <div class="sub-score-card">
              <div class="sub-score-top">
                <span class="sub-k">实战项目经验</span>
                <span class="sub-v-badge badge-emerald">{{ scoreBreakdown.project_score }} <small>/ 30</small></span>
              </div>
              <el-progress
                :percentage="(scoreBreakdown.project_score / 30) * 100"
                :color="progressColor(scoreBreakdown.project_score, 30)"
                :stroke-width="8"
                :show-text="false"
              />
            </div>

            <div class="sub-score-card">
              <div class="sub-score-top">
                <span class="sub-k">学历与资历背景</span>
                <span class="sub-v-badge badge-amber">{{ scoreBreakdown.education_score }} <small>/ 15</small></span>
              </div>
              <el-progress
                :percentage="(scoreBreakdown.education_score / 15) * 100"
                :color="progressColor(scoreBreakdown.education_score, 15)"
                :stroke-width="8"
                :show-text="false"
              />
            </div>

            <div class="sub-score-card">
              <div class="sub-score-top">
                <span class="sub-k">岗位发展潜力</span>
                <span class="sub-v-badge badge-purple">{{ scoreBreakdown.potential_score }} <small>/ 15</small></span>
              </div>
              <el-progress
                :percentage="(scoreBreakdown.potential_score / 15) * 100"
                :color="progressColor(scoreBreakdown.potential_score, 15)"
                :stroke-width="8"
                :show-text="false"
              />
            </div>
          </div>

          <div v-if="scoreBreakdown.final_cap != null" class="cap-notice-strip">
            <el-icon color="#E6A23C"><WarningFilled /></el-icon>
            <span>原始得分 {{ scoreBreakdown.raw_total }} 分，触发规则硬性封顶，最终有效得分为 {{ scoreBreakdown.final_score }} 分</span>
          </div>
        </div>

        <!-- 2. 核心技能对比天平 -->
        <div class="bento-card">
          <div class="bento-header">
            <div class="bento-title-icon icon-indigo">
              <el-icon><Aim /></el-icon>
            </div>
            <div>
              <h3 class="bento-title">技能天平对照</h3>
              <p class="bento-subtitle">对比岗位硬性 JD 提取的关键技术栈命中情况</p>
            </div>
          </div>

          <div class="skills-balance-grid">
            <div class="skill-balance-box box-matched">
              <div class="balance-box-head">
                <el-icon color="#10b981"><CircleCheckFilled /></el-icon>
                <span>已匹配技术技能 ({{ (result.result_json.matched_core_skills || []).length }})</span>
              </div>
              <SkillTagList
                :items="result.result_json.matched_core_skills || []"
                type="success"
                effect="plain"
                size="default"
              />
            </div>

            <div class="skill-balance-box box-missing">
              <div class="balance-box-head">
                <el-icon color="#ef4444"><CircleCloseFilled /></el-icon>
                <span>缺失或未提及技能 ({{ (result.result_json.missing_core_skills || []).length }})</span>
              </div>
              <SkillTagList
                :items="result.result_json.missing_core_skills || []"
                type="danger"
                effect="plain"
                size="default"
              />
            </div>
          </div>

          <!-- 附加优势点与补充技能 -->
          <div v-if="(result.result_json.matched_points || []).length > 0" class="sub-tags-row">
            <div class="sub-tags-label">匹配亮点：</div>
            <SkillTagList
              :items="result.result_json.matched_points || []"
              type="success"
              effect="plain"
              size="small"
            />
          </div>
        </div>

        <!-- 3. AI 深度诊断与优化建议 -->
        <div class="bento-card">
          <div class="bento-header">
            <div class="bento-title-icon icon-blue">
              <el-icon><InfoFilled /></el-icon>
            </div>
            <div>
              <h3 class="bento-title">AI 综合诊断与改写建议</h3>
              <p class="bento-subtitle">针对当前岗位的针对性简历调优策略</p>
            </div>
          </div>

          <!-- 总体评价引言块 -->
          <div class="summary-quote-box">
            <p class="summary-quote-text">{{ result.result_json.summary }}</p>
          </div>

          <!-- 优化建议列表 -->
          <div v-if="(result.result_json.resume_suggestions || []).length > 0" class="suggestions-wrapper">
            <h4 class="suggestions-subtitle">
              <el-icon color="#6366f1"><Edit /></el-icon>
              <span>关键改写发力点</span>
            </h4>
            <div class="suggestion-cards-list">
              <div
                v-for="(item, index) in result.result_json.resume_suggestions"
                :key="index"
                class="suggestion-item-card"
              >
                <div class="sugg-index">{{ index + 1 }}</div>
                <div class="sugg-content">{{ item }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 4. 为您定制的 20 道高频面试真题 -->
        <div class="bento-card interview-section-card">
          <div class="bento-header">
            <div class="bento-title-icon icon-purple">
              <el-icon><ChatLineSquare /></el-icon>
            </div>
            <div>
              <h3 class="bento-title">定制专属高频面试真题</h3>
              <p class="bento-subtitle">针对您的背景与目标岗位生成的深度技术与业务追问及参考答法</p>
            </div>
          </div>

          <el-collapse accordion class="modern-collapse">
            <el-collapse-item
              v-for="(item, index) in result.result_json.interview_questions"
              :key="index"
              :name="index"
              class="modern-collapse-item"
            >
              <template #title>
                <div class="collapse-title-row">
                  <span class="q-badge">Q{{ index + 1 }}</span>
                  <span class="q-text">{{ item.question }}</span>
                </div>
              </template>
              <div class="modern-answer-box">
                <div class="answer-badge">
                  <span>💡 推荐作答要点与思路</span>
                </div>
                <p class="answer-desc">{{ item.answer }}</p>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>
      </main>
    </div>

    <!-- 加载状态 -->
    <div v-else-if="loading" class="state-container">
      <el-result icon="loading" title="正在生成深度匹配画像..." sub-title="多维雷达图与建议正在计算中，请稍候" />
    </div>

    <!-- 错误状态 -->
    <div v-else class="state-container">
      <el-result icon="error" title="未找到有效分析报告" sub-title="未检测到当前岗位的分析数据，请重新上传简历发起分析">
        <template #extra>
          <el-button type="primary" class="dock-btn-primary" @click="$router.push('/upload')">
            立即开始新分析
          </el-button>
        </template>
      </el-result>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAnalysisStore } from '../stores/analysis'
import { getHistoryDetail } from '../api/request'
import SkillTagList from '../components/SkillTagList.vue'

const route = useRoute()
const store = useAnalysisStore()
const result = ref(null)
const loading = ref(true)

onMounted(async () => {
  // 优先使用 store 中的数据
  if (store.currentResult && store.currentResult.id == route.params.id) {
    result.value = store.currentResult
    loading.value = false
    return
  }

  // 否则从 API 获取
  try {
    result.value = await getHistoryDetail(route.params.id)
  } catch {
    // 加载失败
  } finally {
    loading.value = false
  }
})

/** 评分对应的颜色 */
const scoreColor = computed(() => {
  const score = result.value?.result_json?.match_score || 0
  if (score >= 80) return '#10b981'
  if (score >= 60) return '#3b82f6'
  if (score >= 40) return '#f59e0b'
  return '#ef4444'
})

/** 评分标签 */
const scoreLabel = computed(() => {
  const score = result.value?.result_json?.match_score || 0
  if (score >= 80) return '匹配度高，强烈推荐投递！'
  if (score >= 60) return '匹配度良好，推荐投递'
  if (score >= 40) return '匹配度中等，建议针对性优化'
  return '匹配度偏低，需谨慎投递'
})

/** 评分等级标签类型 */
const scoreLevelType = computed(() => {
  const level = result.value?.result_json?.score_level || ''
  if (level.includes('推荐') || level === '高度匹配' || level === '良好匹配') return 'success'
  if (level === '部分匹配') return 'warning'
  if (level === '勉强匹配') return 'danger'
  return 'primary'
})

/** 分项评分数据 */
const scoreBreakdown = computed(() => {
  return result.value?.result_json?.score_breakdown || {
    skill_score: 0,
    project_score: 0,
    education_score: 0,
    potential_score: 0,
    raw_total: 0,
    final_cap: null,
    final_score: 0,
  }
})

/** 核心技能命中率颜色 */
const hitRateColor = computed(() => {
  const rate = (result.value?.result_json?.core_skill_hit_rate || 0) * 100
  if (rate >= 70) return '#10b981'
  if (rate >= 40) return '#3b82f6'
  return '#f59e0b'
})

/** 进度条颜色 */
function progressColor(score, max) {
  const rate = score / max
  if (rate >= 0.75) return '#10b981'
  if (rate >= 0.5) return '#3b82f6'
  if (rate >= 0.3) return '#f59e0b'
  return '#ef4444'
}
</script>

<style scoped>
.result-page {
  padding: 6px 0 40px;
}

.result-steps {
  max-width: 650px;
  margin: 0 auto 28px;
}

/* Bento 双栏总布局 */
.result-bento-layout {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 24px;
  align-items: start;
}

/* 通用现代化 Bento 卡片 */
.bento-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 20px 22px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.bento-card:hover {
  box-shadow: 0 4px 16px -2px rgba(0, 0, 0, 0.05);
}

.bento-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.bento-title-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.icon-blue { background: #eff6ff; color: #2563eb; }
.icon-purple { background: #f5f3ff; color: #7c3aed; }
.icon-emerald { background: #ecfdf5; color: #059669; }
.icon-indigo { background: #eef2ff; color: #4f46e5; }

.bento-title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.2px;
}

.bento-subtitle {
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
}

/* ================= 左栏：Sticky 概览 ================= */
.result-sidebar {
  position: sticky;
  top: 84px;
  display: flex;
  flex-direction: column;
}

.score-hero-card {
  text-align: center;
  padding: 28px 20px 24px;
}

.score-ring-container {
  display: flex;
  justify-content: center;
  margin-bottom: 12px;
}

.score-text-inner {
  display: flex;
  align-items: baseline;
  justify-content: center;
}

.score-val {
  font-size: 42px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -1px;
}

.score-unit {
  font-size: 14px;
  color: #64748b;
  font-weight: 600;
  margin-left: 2px;
}

.score-badge-wrap {
  margin-bottom: 10px;
}

.score-status-badge {
  font-size: 13px;
  padding: 4px 16px;
  font-weight: 600;
}

.score-summary-advice {
  font-size: 13px;
  color: #475569;
  line-height: 1.55;
  margin-bottom: 16px;
}

.job-target-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  color: #334155;
  font-weight: 600;
  max-width: 100%;
}

.job-title-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 岗位方向对齐 */
.direction-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 14px;
}

.direction-cell {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dir-k {
  font-size: 11px;
  color: #64748b;
  font-weight: 500;
}

.dir-v {
  font-size: 13px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dir-v-primary { color: #2563eb; }
.dir-v-warning { color: #d97706; }

.direction-verdict-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 10px;
  border-top: 1px dashed #e2e8f0;
}

.verdict-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.verdict-tag {
  font-size: 12px;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: 6px;
}

.tag-match {
  background: #ecfdf5;
  color: #059669;
  border: 1px solid #a7f3d0;
}

.tag-mismatch {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.verdict-reason {
  margin-top: 8px;
  font-size: 11px;
  color: #64748b;
  line-height: 1.5;
}

/* 命中率卡片 */
.hit-rate-bar-wrap {
  margin: 12px 0 16px;
}

.hit-rate-counts {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.hit-count-pill {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 10px;
  border-radius: 8px;
}

.pill-success {
  background: #ecfdf5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}

.pill-danger {
  background: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.pill-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.dot-green { background: #10b981; }
.dot-red { background: #ef4444; }

/* 快捷操作坞 */
.action-dock-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
}

.dock-btn-primary {
  width: 100%;
  height: 40px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  background: linear-gradient(135deg, #4f46e5 0%, #2563eb 100%) !important;
  border: none !important;
  color: #fff !important;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
  margin-left: 0 !important;
}

.dock-btn-secondary {
  width: 100%;
  height: 40px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  background: #f8fafc !important;
  border: 1px solid #e2e8f0 !important;
  color: #334155 !important;
  margin-left: 0 !important;
}

.dock-btn-secondary:hover {
  background: #f1f5f9 !important;
  color: #0f172a !important;
}

/* ================= 右侧：多维能力画像与深度矩阵 ================= */
.result-main-col {
  min-width: 0;
}

.alert-block {
  margin-bottom: 20px;
}

.alert-list {
  padding-left: 18px;
  margin: 4px 0;
  font-size: 13px;
  line-height: 1.6;
}

/* 分项评分网格 */
.sub-score-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.sub-score-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sub-score-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sub-k {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.sub-v-badge {
  font-size: 13px;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 6px;
}

.badge-blue { background: #eff6ff; color: #2563eb; }
.badge-emerald { background: #ecfdf5; color: #059669; }
.badge-amber { background: #fffbeb; color: #d97706; }
.badge-purple { background: #f5f3ff; color: #7c3aed; }

.cap-notice-strip {
  margin-top: 14px;
  padding: 10px 14px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 10px;
  font-size: 12px;
  color: #b45309;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 技能天平对照 */
.skills-balance-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 14px;
}

.skill-balance-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 14px;
}

.balance-box-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 12px;
}

.sub-tags-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px dashed #e2e8f0;
  font-size: 12px;
  color: #64748b;
}

.sub-tags-label {
  white-space: nowrap;
  font-weight: 600;
}

/* AI 综合诊断与改写建议 */
.summary-quote-box {
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  border-left: 4px solid #3b82f6;
  border-radius: 0 12px 12px 0;
  padding: 14px 18px;
  margin-bottom: 20px;
}

.summary-quote-text {
  font-size: 14px;
  line-height: 1.75;
  color: #334155;
}

.suggestions-subtitle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 12px;
}

.suggestion-cards-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.suggestion-item-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 12px 14px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
}

.sugg-index {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}

.sugg-content {
  font-size: 13px;
  line-height: 1.6;
  color: #334155;
}

/* 定制面试题现代折叠面板 */
.modern-collapse {
  border: none;
}

:deep(.el-collapse-item__header) {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  padding: 14px 12px;
  border-bottom: 1px solid #f1f5f9;
  border-radius: 8px;
  transition: all 0.2s;
}

:deep(.el-collapse-item__header:hover) {
  background: #f8fafc;
}

:deep(.el-collapse-item__wrap) {
  border-bottom: none;
}

.collapse-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.q-badge {
  font-size: 12px;
  font-weight: 800;
  color: #7c3aed;
  background: #f5f3ff;
  border: 1px solid #ddd6fe;
  padding: 2px 7px;
  border-radius: 6px;
  flex-shrink: 0;
}

.q-text {
  font-weight: 600;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
}

.modern-answer-box {
  padding: 14px 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  margin: 8px 0 12px;
}

.answer-badge {
  font-size: 11px;
  font-weight: 700;
  color: #2563eb;
  margin-bottom: 8px;
}

.answer-desc {
  font-size: 13px;
  line-height: 1.7;
  color: #334155;
  white-space: pre-line;
}

.state-container {
  padding: 60px 0;
}

@media (max-width: 960px) {
  .result-bento-layout {
    grid-template-columns: 1fr;
  }
  .result-sidebar {
    position: static;
  }
}
</style>
