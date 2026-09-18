<template>
  <div class="job-detail-page" v-loading="loading">
    <template v-if="job">
      <!-- 顶部信息 -->
      <el-card shadow="hover" class="header-card">
        <div class="job-header">
          <div class="job-info">
            <h2>{{ job.job_title }}</h2>
            <div class="job-meta">
              <el-tag v-if="job.company" type="primary" effect="plain">{{ job.company }}</el-tag>
              <el-tag v-if="job.salary" type="warning" effect="plain">{{ job.salary }}</el-tag>
              <el-tag v-if="job.location" type="info" effect="plain">{{ job.location }}</el-tag>
            </div>
            <!-- 岗位标签 -->
            <div v-if="parsedTags.length" class="job-tags-row">
              <span class="tags-label">岗位标签：</span>
              <SkillTagList :items="parsedTags" type="success" size="small" />
            </div>
            <!-- HR信息 -->
            <div v-if="job.hr_name || job.hr_status" class="hr-info-row">
              <span class="hr-label">HR：</span>
              <span v-if="job.hr_name" class="hr-name">{{ job.hr_name }}</span>
              <HRStatusTag v-if="job.hr_status" :status="job.hr_status" size="small" />
              <span v-if="job.hr_active_score != null" class="hr-score">活跃分 {{ job.hr_active_score }}</span>
            </div>
          </div>
          <div class="job-score">
            <el-progress type="dashboard" :percentage="job.match_score || 0" :width="100"
              :color="scoreColor(job.match_score)" />
            <span class="score-level">{{ job.score_level || '未评分' }}</span>
            <div v-if="job.composite_score != null" class="composite-badge">
              <el-tag :type="scoreType(job.composite_score)" size="small">综合 {{ job.composite_score }}</el-tag>
            </div>
          </div>
        </div>
        <el-alert
          v-if="job.recommendation"
          :title="job.recommendation"
          :type="job.match_score >= 70 ? 'success' : 'warning'"
          :closable="false" show-icon
          style="margin-top:12px"
        />
      </el-card>

      <!-- 中间：JD + AI分析 -->
      <el-row :gutter="16" class="detail-row">
        <el-col :span="12">
          <el-card shadow="hover">
            <template #header><span class="section-title">岗位 JD</span></template>
            <div class="jd-content" v-if="job.job_description">
              <pre>{{ job.job_description }}</pre>
            </div>
            <el-result v-else icon="info" title="暂无JD" sub-title="该岗位没有保存岗位描述" />
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card shadow="hover">
            <template #header><span class="section-title">AI 分析结果</span></template>
            <div v-if="analysis" class="analysis-content">
              <!-- 分项评分 -->
              <div v-if="visibleBreakdown.length" class="breakdown">
                <h4>分项评分</h4>
                <div class="breakdown-item" v-for="item in visibleBreakdown" :key="item.key">
                  <span class="bd-label">{{ item.label }}</span>
                  <el-progress :percentage="item.value" :color="scoreColor(item.value)" :stroke-width="8" />
                </div>
              </div>

              <!-- 硬性技能匹配 -->
              <div v-if="analysis.job_tags?.length" class="analysis-block">
                <h4>硬性技能标签匹配 (命中率: {{ (analysis.hard_skill_hit_rate * 100 || 0).toFixed(0) }}%)</h4>
                <div class="tag-section">
                  <div v-if="analysis.matched_job_tags?.length">
                    <span class="tag-subtitle green">命中标签：</span>
                    <SkillTagList :items="analysis.matched_job_tags" type="success" size="small" />
                  </div>
                  <div v-if="analysis.missing_job_tags?.length" style="margin-top:6px">
                    <span class="tag-subtitle red">缺失标签：</span>
                    <SkillTagList :items="analysis.missing_job_tags" type="danger" size="small" />
                  </div>
                </div>
              </div>

              <!-- 匹配优势 -->
              <div v-if="analysis.matched_points?.length" class="analysis-block">
                <h4>匹配优势</h4>
                <ul><li v-for="(p, i) in analysis.matched_points" :key="i">{{ p }}</li></ul>
              </div>

              <!-- 缺失技能 -->
              <div v-if="analysis.missing_skills?.length" class="analysis-block">
                <h4>缺失技能</h4>
                <ul><li v-for="(s, i) in analysis.missing_skills" :key="i">{{ s }}</li></ul>
              </div>

              <!-- 简历优化建议 -->
              <div v-if="analysis.resume_suggestions?.length" class="analysis-block">
                <h4>简历优化建议</h4>
                <ul><li v-for="(r, i) in analysis.resume_suggestions" :key="i">{{ r }}</li></ul>
              </div>

              <!-- 风险提示 -->
              <div v-if="analysis.risk_warnings?.length" class="analysis-block">
                <h4>⚠ 风险提示</h4>
                <ul class="risk-list"><li v-for="(w, i) in analysis.risk_warnings" :key="i">{{ w }}</li></ul>
              </div>

              <!-- 总结 -->
              <div v-if="analysis.summary" class="analysis-block">
                <h4>综合总结</h4>
                <p>{{ analysis.summary }}</p>
              </div>
            </div>
            <el-result v-else icon="info" title="暂无AI分析" sub-title="该岗位尚未进行AI分析或分析结果不可用" />
          </el-card>
        </el-col>
      </el-row>

      <el-button @click="$router.back()" style="margin-top:16px">返回</el-button>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getJobRecordDetail } from '../api/request'
import HRStatusTag from '../components/HRStatusTag.vue'
import SkillTagList from '../components/SkillTagList.vue'

const route = useRoute()
const loading = ref(true)
const job = ref(null)
const analysis = ref(null)

onMounted(async () => {
  try {
    const data = await getJobRecordDetail(Number(route.params.id))
    job.value = data
    // 解析 analysis_result_json
    const raw = data.analysis_result_json
    if (raw) {
      analysis.value = typeof raw === 'string' ? JSON.parse(raw) : raw
    }
  } catch {} finally { loading.value = false }
})

function scoreColor(s) {
  if (!s && s !== 0) return '#909399'
  if (s >= 80) return '#67C23A'
  if (s >= 60) return '#E6A23C'
  return '#F56C6C'
}

function scoreType(s) {
  if (s >= 80) return 'success'
  if (s >= 60) return 'warning'
  return 'danger'
}

function hrStatusColor(status) {
  const map = {
    '在线': 'success', '刚刚活跃': 'success', '今日活跃': 'success',
    '3日内活跃': 'warning', '本周活跃': 'warning',
    '本月活跃': 'danger', '两周内活跃': 'danger', '两月内活跃': 'danger',
    '3月内活跃': 'danger', '半年前活跃': 'danger',
  }
  return map[status] || 'info'
}

const HR_STATUS_DISPLAY = ['在线','刚刚活跃','今日活跃','3日内活跃','本周活跃','本月活跃','两周内活跃','两月内活跃','2月内活跃','3月内活跃','半年前活跃']
const TAG_EXCLUDE_PATTERNS = [...HR_STATUS_DISPLAY, '女士', '先生', '小姐', '活跃', '招聘', '公司', '立即沟通', '去App', '董事长', '经理']

function filterDisplayJobTags(tags) {
  if (!tags || !Array.isArray(tags)) return []
  return tags.filter(t => {
    const s = String(t).trim()
    if (s.length < 2) return false
    for (const p of TAG_EXCLUDE_PATTERNS) {
      if (s.includes(p)) return false
    }
    return true
  })
}

const parsedTags = computed(() => {
  if (!job.value?.job_tags) return []
  let raw
  try {
    raw = typeof job.value.job_tags === 'string'
      ? JSON.parse(job.value.job_tags)
      : job.value.job_tags
  } catch {
    raw = String(job.value.job_tags).split(',').map(t => t.trim()).filter(Boolean)
  }
  return filterDisplayJobTags(raw)
})

const SCORE_LABELS = {
  skill_score: '技能评分',
  project_score: '项目经验评分',
  education_score: '学历背景评分',
  potential_score: '发展潜力评分',
  bonus_score: '加分项',
  final_score: '综合评分',
}

// 内部调试字段，不展示给用户
const HIDDEN_BREAKDOWN_KEYS = new Set(['raw_total', 'final_cap'])

const visibleBreakdown = computed(() => {
  const bd = analysis.value?.score_breakdown
  if (!bd) return []
  return Object.entries(bd)
    .filter(([key]) => !HIDDEN_BREAKDOWN_KEYS.has(key))
    .map(([key, value]) => ({
      key,
      label: SCORE_LABELS[key] || key,
      value: typeof value === 'number' ? value : 0,
    }))
})
</script>

<style scoped>
.job-detail-page { padding: 10px 0; max-width: 1100px; }
.header-card { margin-bottom: 16px; }
.job-header { display: flex; justify-content: space-between; align-items: flex-start; }
.job-info h2 { margin: 0 0 8px 0; font-size: 20px; }
.job-meta { display: flex; gap: 8px; }
.job-score { text-align: center; }
.score-level { display: block; font-size: 13px; color: #909399; margin-top: 4px; }
.detail-row { margin-bottom: 16px; }
.section-title { font-weight: 600; font-size: 15px; }
.jd-content { max-height: 60vh; overflow-y: auto; background: #f8f9fb; padding: 14px; border-radius: 8px; }
.jd-content pre { white-space: pre-wrap; word-break: break-word; margin: 0; font-size: 14px; line-height: 1.7; }
.analysis-content { max-height: 60vh; overflow-y: auto; }
.breakdown h4, .analysis-block h4 { margin: 12px 0 8px 0; font-size: 14px; color: #333; }
.breakdown-item { margin-bottom: 8px; }
.bd-label { font-size: 12px; color: #666; display: block; margin-bottom: 4px; }
.analysis-block ul { margin: 0; padding-left: 20px; }
.analysis-block li { font-size: 13px; color: #555; line-height: 1.8; }
.analysis-block p { font-size: 13px; color: #555; line-height: 1.8; margin: 0; }
.risk-list li { color: #F56C6C; }

/* 岗位标签 & HR信息 */
.job-tags-row { margin-top: 8px; display: flex; flex-wrap: wrap; align-items: center; gap: 4px; }
.tags-label { font-size: 12px; color: #909399; }
.skill-tag { margin: 1px; }
.hr-info-row { margin-top: 8px; display: flex; align-items: center; gap: 8px; }
.hr-label { font-size: 12px; color: #909399; }
.hr-name { font-weight: 500; color: #333; }
.hr-score { font-size: 11px; color: #909399; }
.composite-badge { margin-top: 4px; }
.tag-section { margin-top: 4px; }
.tag-subtitle { font-size: 12px; font-weight: 500; }
.tag-subtitle.green { color: #67C23A; }
.tag-subtitle.red { color: #F56C6C; }
.inline-tag { margin: 1px 2px; }

</style>
