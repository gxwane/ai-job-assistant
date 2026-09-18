<template>
  <div class="dashboard-page">
    <!-- 顶部：导出按钮 -->
    <div class="dashboard-header">
      <h2>数据统计中心</h2>
      <el-button type="primary" @click="exportReport">
        <el-icon><Download /></el-icon> 导出求职报告
      </el-button>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="16" class="stat-cards">
      <el-col :span="4" v-for="card in statCards" :key="card.label">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-card-inner">
            <span class="stat-label">{{ card.label }}</span>
            <span class="stat-value" :style="{ color: card.color }">{{ card.value }}</span>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 图表区 -->
    <el-row :gutter="16" class="chart-row">
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header><span class="chart-title">匹配度分布</span></template>
          <div ref="scoreChartRef" class="chart-box"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header><span class="chart-title">求职漏斗</span></template>
          <div class="funnel-box">
            <div class="funnel-item" v-for="(item, idx) in funnelItems" :key="idx">
              <div class="funnel-bar" :style="{ width: funnelWidth(item.value), background: funnelColors[idx] }">
                <span class="funnel-label">{{ item.label }}</span>
                <span class="funnel-val">{{ item.value }}</span>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- HR活跃分布 -->
    <el-row :gutter="16" class="chart-row">
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header><span class="chart-title">HR活跃状态分布</span></template>
          <div ref="hrChartRef" class="chart-box"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header><span class="chart-title">HR活跃统计</span></template>
          <div class="hr-stats-grid">
            <div v-for="item in hrStatItems" :key="item.status" class="hr-stat-item">
              <div class="hr-stat-dot" :style="{ background: item.color }"></div>
              <span class="hr-stat-label">{{ item.status }}</span>
              <el-progress :percentage="item.pct" :color="item.color" :stroke-width="6" class="hr-stat-bar" />
              <span class="hr-stat-val">{{ item.count }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 最近推荐岗位 -->
    <el-card shadow="hover" class="recent-table">
      <template #header><span class="chart-title">最近推荐岗位</span></template>
      <el-table :data="recentJobs" stripe v-loading="loading" style="width:100%">
        <el-table-column label="岗位名称" min-width="200">
          <template #default="{ row }">
            <el-link type="primary" @click="$router.push(`/job-detail/${row.id}`)">{{ row.job_title }}</el-link>
          </template>
        </el-table-column>
        <el-table-column label="公司" min-width="150" prop="company" />
        <el-table-column label="匹配度" width="100" align="center">
          <template #default="{ row }">
            <ScoreBadge :score="row.match_score" size="small" />
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="时间" width="160" align="center">
          <template #default="{ row }">{{ fmt(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center">
          <template #default="{ row }">
            <el-button size="small" link type="primary" @click="$router.push(`/job-detail/${row.id}`)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import ScoreBadge from '../components/ScoreBadge.vue'
import { downloadBlob } from '../utils/file-download'
import {
  loadECharts,
  setupResponsiveChart,
  SCORE_PALETTE,
  HR_STATUS_PALETTE,
  FUNNEL_PALETTE,
} from '../utils/echarts-helper'
import {
  getStatisticsOverview, getScoreDistribution, getJobFunnel,
  getRecentRecommended, getHrStatusDistribution, exportPdfReport,
} from '../api/request'

// [TEST-ANCHOR: chart-lifecycle] ECharts instances and resize handlers kept at
// module scope so onBeforeUnmount can reliably remove listeners and dispose.
let scoreChart = null
let hrChart = null
let scoreCleanup = null
let hrCleanup = null

const loading = ref(true)
const overview = ref({})
const distribution = ref([])
const funnel = ref({})
const recentJobs = ref([])
const hrDistribution = ref({})
const scoreChartRef = ref(null)
const hrChartRef = ref(null)

const statCards = computed(() => [
  { label: '已上传简历', value: overview.value.resume_count ?? 0, color: '#409EFF' },
  { label: '累计扫描岗位', value: overview.value.total_jobs ?? 0, color: '#67C23A' },
  { label: '推荐岗位', value: overview.value.recommended_jobs ?? 0, color: '#E6A23C' },
  { label: '已沟通岗位', value: overview.value.communicated_jobs ?? 0, color: '#F56C6C' },
  { label: '平均匹配度', value: (overview.value.average_score ?? 0) + '分', color: '#909399' },
  { label: '最高匹配度', value: (overview.value.max_score ?? 0) + '分', color: '#409EFF' },
])

const funnelItems = computed(() => [
  { label: '扫描岗位', value: funnel.value.total_jobs ?? 0 },
  { label: '推荐岗位', value: funnel.value.recommended_jobs ?? 0 },
  { label: '已沟通', value: funnel.value.communicated_jobs ?? 0 },
  { label: '面试邀请', value: funnel.value.interview_jobs ?? 0 },
  { label: 'Offer', value: funnel.value.offer_jobs ?? 0 },
])

const funnelColors = FUNNEL_PALETTE
const funnelMax = computed(() => Math.max(...funnelItems.value.map(f => f.value), 1))

function funnelWidth(val) {
  return Math.max((val / funnelMax.value) * 100, 5) + '%'
}

onMounted(async () => {
  loading.value = true
  try {
    const [ov, dist, fun, rec, hr] = await Promise.all([
      getStatisticsOverview(),
      getScoreDistribution(),
      getJobFunnel(),
      getRecentRecommended(10),
      getHrStatusDistribution(),
    ])
    overview.value = ov
    distribution.value = dist.ranges || []
    funnel.value = fun
    recentJobs.value = rec || []
    hrDistribution.value = hr.distribution || {}
    await nextTick()
    renderChart()
    renderHrChart()
  } catch {} finally { loading.value = false }
})

// [TEST-ANCHOR: chart-lifecycle] Cleanup — prevents resize listener accumulation
// and ECharts canvas/WebGL context leak on Vue Router navigation.
onBeforeUnmount(() => {
  scoreCleanup?.()
  hrCleanup?.()
})

async function renderChart() {
  if (!scoreChartRef.value || distribution.value.length === 0) return
  try {
    const echarts = await loadECharts()
    scoreChart = echarts.init(scoreChartRef.value)
    const labels = distribution.value.map(r => r.label)
    const data = distribution.value.map(r => r.count)
    scoreChart.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: 40, right: 20, top: 20, bottom: 30 },
      xAxis: { type: 'category', data: labels },
      yAxis: { type: 'value', minInterval: 1 },
      series: [{
        type: 'bar',
        data: data.map((v, i) => ({ value: v, itemStyle: { color: SCORE_PALETTE[i % SCORE_PALETTE.length] } })),
        barMaxWidth: 50,
      }],
    })
    // [TEST-ANCHOR: chart-lifecycle] Named handler — removable in onBeforeUnmount
    scoreCleanup = setupResponsiveChart(scoreChart)
  } catch (e) {
    console.error('echarts render error:', e)
  }
}

const hrStatItems = computed(() => {
  const dist = hrDistribution.value || {}
  const statuses = ['在线', '刚刚活跃', '今日活跃', '3日内活跃', '本周活跃', '本月活跃', '两周内活跃', '两月内活跃', '3月内活跃', '半年前活跃', '未知']
  const max = Math.max(...statuses.map(s => dist[s] || 0), 1)
  return statuses.map(s => ({
    status: s, count: dist[s] || 0,
    pct: Math.round(((dist[s] || 0) / max) * 100),
    color: HR_STATUS_PALETTE[s] || '#909399',
  }))
})

async function renderHrChart() {
  if (!hrChartRef.value) return
  try {
    const echarts = await loadECharts()
    hrChart = echarts.init(hrChartRef.value)
    const dist = hrDistribution.value || {}
    const statuses = ['在线', '刚刚活跃', '今日活跃', '3日内活跃', '本周活跃', '两周内活跃', '本月活跃', '两月内活跃', '3月内活跃', '半年前活跃', '未知']
    const data = statuses.map(s => dist[s] || 0)
    const colors = statuses.map(s => HR_STATUS_PALETTE[s] || '#909399')
    hrChart.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: 40, right: 20, top: 20, bottom: 60 },
      xAxis: { type: 'category', data: statuses, axisLabel: { rotate: 30, fontSize: 10 } },
      yAxis: { type: 'value', minInterval: 1 },
      series: [{
        type: 'bar',
        data: data.map((v, i) => ({ value: v, itemStyle: { color: colors[i] } })),
        barMaxWidth: 36,
      }],
    })
    // [TEST-ANCHOR: chart-lifecycle] Named handler — removable in onBeforeUnmount
    hrCleanup = setupResponsiveChart(hrChart)
  } catch (e) {
    console.error('HR chart render error:', e)
  }
}

function statusTag(s) {
  const m = { recommended: 'warning', communicated: 'success', interview: '', offer: 'success' }
  return m[s] || 'info'
}

function statusLabel(s) {
  const m = { captured: '已捕获', analyzed: '已分析', recommended: '推荐', communicated: '已沟通', interview: '面试', offer: 'Offer', ignored: '已忽略' }
  return m[s] || s
}

function fmt(d) { if (!d) return ''; const dt = new Date(d); return dt.toLocaleDateString('zh-CN') + ' ' + dt.toLocaleTimeString('zh-CN', { hour12: false }) }

async function exportReport() {
  try {
    const blob = await exportPdfReport()
    downloadBlob(blob, 'job_search_report.pdf', 'application/pdf')
    ElMessage.success('报告已导出')
  } catch { ElMessage.error('导出失败') }
}
</script>

<style scoped>
.dashboard-page { padding: 10px 0; }
.dashboard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.dashboard-header h2 { margin: 0; font-size: 20px; }
.stat-cards { margin-bottom: 16px; }
.stat-card { text-align: center; }
.stat-card-inner { display: flex; flex-direction: column; gap: 8px; }
.stat-label { font-size: 13px; color: #909399; }
.stat-value { font-size: 24px; font-weight: 700; }
.chart-row { margin-bottom: 16px; }
.chart-title { font-weight: 600; font-size: 15px; }
.chart-box { width: 100%; height: 300px; }
.funnel-box { display: flex; flex-direction: column; gap: 12px; padding: 12px 0; }
.funnel-item { display: flex; align-items: center; }
.funnel-bar { border-radius: 6px; padding: 10px 14px; color: #fff; font-weight: 500; min-width: 60px; transition: width 0.5s; }
.funnel-label { margin-right: 12px; }
.funnel-val { float: right; }
.recent-table { margin-bottom: 16px; }

.hr-stats-grid { max-height: 400px; overflow-y: auto; }
.hr-stat-item { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.hr-stat-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.hr-stat-label { font-size: 12px; color: #666; width: 70px; flex-shrink: 0; }
.hr-stat-bar { flex: 1; }
.hr-stat-val { font-size: 12px; color: #909399; width: 30px; text-align: right; flex-shrink: 0; }
</style>
