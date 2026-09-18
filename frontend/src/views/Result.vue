<template>
  <!-- 分析结果页 - 商业化报告风格 -->
  <div class="result-page">
    <el-steps :active="3" align-center class="steps">
      <el-step title="上传简历" />
      <el-step title="岗位分析" />
      <el-step title="查看结果" />
    </el-steps>

    <div v-if="result" class="result-content">
      <!-- ========== 1. 分数仪表盘 + 等级 + 建议 ========== -->
      <el-card shadow="hover" class="score-dashboard">
        <div class="dashboard-body">
          <div class="dashboard-left">
            <el-progress
              type="dashboard"
              :percentage="result.result_json.match_score"
              :color="scoreColor"
              :stroke-width="14"
              :width="160"
            >
              <template #default="{ percentage }">
                <span class="score-number">{{ percentage }}</span>
                <span class="score-unit">分</span>
              </template>
            </el-progress>
          </div>
          <div class="dashboard-right">
            <div class="score-level-tag">
              <el-tag
                :type="scoreLevelType"
                size="large"
                effect="dark"
                round
              >
                {{ result.result_json.score_level || scoreLabel }}
              </el-tag>
            </div>
            <p class="recommendation-text">
              <el-icon><InfoFilled /></el-icon>
              {{ result.result_json.recommendation || scoreLabel }}
            </p>
            <div class="dashboard-meta">
              <span>岗位：{{ result.job_title }}</span>
            </div>
          </div>
        </div>
      </el-card>

      <!-- ========== 2. 风险提示 / 封顶原因 ========== -->
      <el-alert
        v-if="result.result_json.risk_warnings && result.result_json.risk_warnings.length > 0"
        title="风险提示"
        type="warning"
        :closable="false"
        show-icon
      >
        <ul class="alert-list">
          <li v-for="(w, i) in result.result_json.risk_warnings" :key="i">{{ w }}</li>
        </ul>
      </el-alert>

      <el-alert
        v-if="result.result_json.score_cap_reason"
        title="评分封顶说明"
        type="info"
        :closable="false"
        show-icon
      >
        <p>{{ result.result_json.score_cap_reason }}</p>
      </el-alert>

      <!-- ========== 3. 岗位方向判断 ========== -->
      <el-card shadow="hover" class="section-card">
        <template #header>
          <span class="section-title">
            <el-icon color="#409EFF"><Guide /></el-icon> 岗位方向分析
          </span>
        </template>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="候选人方向">
            <el-tag type="primary" effect="plain">{{ result.result_json.resume_category || '未知' }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="岗位方向">
            <el-tag type="warning" effect="plain">{{ result.result_json.job_category || '未知' }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="方向是否匹配">
            <el-tag :type="result.result_json.category_match ? 'success' : 'danger'">
              {{ result.result_json.category_match ? '匹配' : '不匹配' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="判断理由">
            {{ result.result_json.category_reason || '无' }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- ========== 4. 分项评分卡片 ========== -->
      <el-card shadow="hover" class="section-card">
        <template #header>
          <span class="section-title">
            <el-icon color="#67C23A"><DataAnalysis /></el-icon> 分项评分明细
          </span>
        </template>
        <div class="sub-score-grid">
          <div class="sub-score-item">
            <div class="sub-score-header">
              <span>技能匹配</span>
              <span class="sub-score-value">{{ scoreBreakdown.skill_score }}/40</span>
            </div>
            <el-progress
              :percentage="(scoreBreakdown.skill_score / 40) * 100"
              :color="progressColor(scoreBreakdown.skill_score, 40)"
              :stroke-width="10"
            />
          </div>
          <div class="sub-score-item">
            <div class="sub-score-header">
              <span>项目经验</span>
              <span class="sub-score-value">{{ scoreBreakdown.project_score }}/30</span>
            </div>
            <el-progress
              :percentage="(scoreBreakdown.project_score / 30) * 100"
              :color="progressColor(scoreBreakdown.project_score, 30)"
              :stroke-width="10"
            />
          </div>
          <div class="sub-score-item">
            <div class="sub-score-header">
              <span>学历背景</span>
              <span class="sub-score-value">{{ scoreBreakdown.education_score }}/15</span>
            </div>
            <el-progress
              :percentage="(scoreBreakdown.education_score / 15) * 100"
              :color="progressColor(scoreBreakdown.education_score, 15)"
              :stroke-width="10"
            />
          </div>
          <div class="sub-score-item">
            <div class="sub-score-header">
              <span>发展潜力</span>
              <span class="sub-score-value">{{ scoreBreakdown.potential_score }}/15</span>
            </div>
            <el-progress
              :percentage="(scoreBreakdown.potential_score / 15) * 100"
              :color="progressColor(scoreBreakdown.potential_score, 15)"
              :stroke-width="10"
            />
          </div>
        </div>

        <!-- 原始总分 vs 封顶提示 -->
        <div v-if="scoreBreakdown.final_cap != null" class="cap-notice">
          <el-icon color="#E6A23C"><WarningFilled /></el-icon>
          原始得分 {{ scoreBreakdown.raw_total }} 分 → 触发封顶规则，最终得分 {{ scoreBreakdown.final_score }} 分
        </div>
      </el-card>

      <!-- ========== 5. 核心技能命中率 ========== -->
      <el-card shadow="hover" class="section-card">
        <template #header>
          <span class="section-title">
            <el-icon color="#9B59B6"><Aim /></el-icon> 核心技能命中率
          </span>
        </template>
        <div class="hit-rate-section">
          <div class="hit-rate-bar">
            <el-progress
              :percentage="Math.round((result.result_json.core_skill_hit_rate || 0) * 100)"
              :color="hitRateColor"
              :stroke-width="16"
            >
              <template #default>
                <span class="hit-rate-text">
                  {{ Math.round((result.result_json.core_skill_hit_rate || 0) * 100) }}%
                </span>
              </template>
            </el-progress>
          </div>

          <div class="skill-compare">
            <div class="skill-col">
              <h4>
                <el-icon color="#67C23A"><CircleCheckFilled /></el-icon>
                已匹配核心技能（{{ (result.result_json.matched_core_skills || []).length }}）
              </h4>
              <div class="tag-list">
                <el-tag
                  v-for="(s, i) in result.result_json.matched_core_skills"
                  :key="i"
                  type="success"
                  effect="plain"
                  size="large"
                >{{ s }}</el-tag>
                <span v-if="!result.result_json.matched_core_skills?.length" class="empty-hint">无</span>
              </div>
            </div>
            <div class="skill-col">
              <h4>
                <el-icon color="#F56C6C"><CircleCloseFilled /></el-icon>
                缺失核心技能（{{ (result.result_json.missing_core_skills || []).length }}）
              </h4>
              <div class="tag-list">
                <el-tag
                  v-for="(s, i) in result.result_json.missing_core_skills"
                  :key="i"
                  type="danger"
                  effect="plain"
                  size="large"
                >{{ s }}</el-tag>
                <span v-if="!result.result_json.missing_core_skills?.length" class="empty-hint">无</span>
              </div>
            </div>
          </div>
        </div>
      </el-card>

      <!-- ========== 6. 总体评价 ========== -->
      <el-card shadow="hover" class="section-card">
        <template #header>
          <span class="section-title">
            <el-icon color="#409EFF"><InfoFilled /></el-icon> 总体评价
          </span>
        </template>
        <p class="summary-text">{{ result.result_json.summary }}</p>
      </el-card>

      <!-- ========== 7. 匹配优势 ========== -->
      <el-card shadow="hover" class="section-card">
        <template #header>
          <span class="section-title">
            <el-icon color="#67C23A"><CircleCheckFilled /></el-icon> 匹配优势
          </span>
        </template>
        <div class="tag-list">
          <el-tag
            v-for="(item, index) in result.result_json.matched_points"
            :key="index"
            type="success"
            effect="plain"
            size="large"
          >
            {{ item }}
          </el-tag>
        </div>
      </el-card>

      <!-- ========== 8. 缺失技能 ========== -->
      <el-card shadow="hover" class="section-card">
        <template #header>
          <span class="section-title">
            <el-icon color="#E6A23C"><WarningFilled /></el-icon> 缺失技能
          </span>
        </template>
        <div class="tag-list">
          <el-tag
            v-for="(item, index) in result.result_json.missing_skills"
            :key="index"
            type="warning"
            effect="plain"
            size="large"
          >
            {{ item }}
          </el-tag>
        </div>
      </el-card>

      <!-- ========== 9. 简历优化建议 ========== -->
      <el-card shadow="hover" class="section-card">
        <template #header>
          <span class="section-title">
            <el-icon color="#F56C6C"><Edit /></el-icon> 简历优化建议
          </span>
        </template>
        <ul class="suggestion-list">
          <li
            v-for="(item, index) in result.result_json.resume_suggestions"
            :key="index"
          >
            <el-icon color="#409EFF"><Star /></el-icon>
            {{ item }}
          </li>
        </ul>
      </el-card>

      <!-- ========== 10. 面试问题 ========== -->
      <el-card shadow="hover" class="section-card">
        <template #header>
          <span class="section-title">
            <el-icon color="#9B59B6"><ChatLineSquare /></el-icon> 为您定制的 20 个高频面试问题
          </span>
          <div class="section-subtitle">针对您的简历和所投职位，AI 精心准备的 20 道面试题及参考答案</div>
        </template>
        <el-collapse accordion>
          <el-collapse-item
            v-for="(item, index) in result.result_json.interview_questions"
            :key="index"
            :title="`Q${index + 1}. ${item.question}`"
            :name="index"
          >
            <div class="answer-box">
              <el-tag type="primary" size="small">参考答案</el-tag>
              <p>{{ item.answer }}</p>
            </div>
          </el-collapse-item>
        </el-collapse>
      </el-card>

      <!-- ========== 操作按钮 ========== -->
      <div class="result-actions">
        <el-button type="primary" size="large" @click="$router.push('/upload')">
          <el-icon><Refresh /></el-icon> 新的分析
        </el-button>
        <el-button size="large" @click="$router.push('/history')">
          <el-icon><Clock /></el-icon> 查看历史
        </el-button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-else-if="loading" class="loading-state">
      <el-result icon="loading" title="加载分析结果中..." />
    </div>

    <!-- 错误状态 -->
    <div v-else class="error-state">
      <el-result icon="error" title="未找到分析结果" sub-title="请先上传简历并开始分析">
        <template #extra>
          <el-button type="primary" @click="$router.push('/upload')">
            前往上传简历
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
  if (score >= 80) return '#67C23A'
  if (score >= 60) return '#E6A23C'
  if (score >= 40) return '#E6A23C'
  return '#F56C6C'
})

/** 评分标签 */
const scoreLabel = computed(() => {
  const score = result.value?.result_json?.match_score || 0
  if (score >= 80) return '匹配度高，建议投递！'
  if (score >= 60) return '匹配度中等，可尝试'
  if (score >= 40) return '匹配度偏低，需提升'
  return '匹配度很低，不推荐'
})

/** 评分等级标签类型 */
const scoreLevelType = computed(() => {
  const level = result.value?.result_json?.score_level || ''
  if (level === '高度匹配' || level === '良好匹配') return 'success'
  if (level === '部分匹配') return 'warning'
  if (level === '勉强匹配') return 'danger'
  return 'info'
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
  if (rate >= 70) return '#67C23A'
  if (rate >= 40) return '#E6A23C'
  return '#F56C6C'
})

/** 进度条颜色 */
function progressColor(score, max) {
  const rate = score / max
  if (rate >= 0.7) return '#67C23A'
  if (rate >= 0.4) return '#E6A23C'
  return '#F56C6C'
}
</script>

<style scoped>
.result-page {
  padding: 10px 0;
}

.steps {
  margin-bottom: 30px;
}

.result-content {
  max-width: 850px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ========== 分数仪表盘 ========== */
.score-dashboard {
  border-radius: 12px;
}

.dashboard-body {
  display: flex;
  align-items: center;
  gap: 30px;
  padding: 10px 0;
}

.dashboard-left {
  flex-shrink: 0;
}

.score-number {
  font-size: 48px;
  font-weight: 700;
}

.score-unit {
  font-size: 16px;
  color: #999;
}

.dashboard-right {
  flex: 1;
}

.score-level-tag {
  margin-bottom: 10px;
}

.recommendation-text {
  font-size: 15px;
  color: #555;
  line-height: 1.7;
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

.dashboard-meta {
  margin-top: 10px;
  font-size: 13px;
  color: #999;
}

/* ========== 分项评分 ========== */
.sub-score-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.sub-score-item {
  padding: 10px 0;
}

.sub-score-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
  color: #555;
}

.sub-score-value {
  font-weight: 600;
  color: #333;
}

.cap-notice {
  margin-top: 16px;
  padding: 10px 14px;
  background: #fdf6ec;
  border-radius: 8px;
  font-size: 14px;
  color: #E6A23C;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* ========== 核心技能命中率 ========== */
.hit-rate-section {
  padding: 10px 0;
}

.hit-rate-bar {
  margin-bottom: 20px;
  text-align: center;
}

.hit-rate-text {
  font-size: 20px;
  font-weight: 700;
}

.skill-compare {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.skill-col h4 {
  font-size: 14px;
  color: #555;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* ========== 通用卡片 ========== */
.section-card {
  border-radius: 12px;
}

.section-title {
  font-size: 17px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-subtitle {
  font-size: 13px;
  color: #909399;
  margin-top: 6px;
}

.summary-text {
  font-size: 15px;
  line-height: 1.8;
  color: #555;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.tag-list .el-tag {
  font-size: 14px;
  padding: 6px 16px;
  border-radius: 8px;
}

.empty-hint {
  color: #c0c4cc;
  font-size: 14px;
}

.suggestion-list {
  list-style: none;
  padding: 0;
}

.suggestion-list li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 0;
  font-size: 14px;
  line-height: 1.7;
  color: #555;
  border-bottom: 1px dashed #ebeef5;
}

.suggestion-list li:last-child {
  border-bottom: none;
}

.answer-box {
  padding: 12px 16px;
  background: #f8f9ff;
  border-radius: 8px;
}

.answer-box p {
  margin-top: 8px;
  font-size: 14px;
  line-height: 1.8;
  color: #555;
}

/* ========== Alert 样式 ========== */
.alert-list {
  margin: 4px 0;
  padding-left: 20px;
}

.alert-list li {
  font-size: 13px;
  line-height: 1.7;
}

/* ========== 底部按钮 ========== */
.result-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  padding: 10px 0 30px;
}

.loading-state,
.error-state {
  padding: 60px 0;
}
</style>
