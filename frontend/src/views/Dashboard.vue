<template>
  <div class="dashboard-page">
    <!-- 顶部：标题与导出按钮 -->
    <div class="dashboard-header">
      <div>
        <h2 class="dashboard-title">求职数据统计中心</h2>
        <p class="dashboard-sub">全链路追踪求职转化漏斗、岗位画像分布与 HR 活跃态势</p>
      </div>
      <el-button type="primary" class="export-report-btn" @click="exportReport">
        <el-icon><Download /></el-icon>
        <span>导出求职诊断报告 (PDF)</span>
      </el-button>
    </div>

    <!-- 6 核心 KPI 指标卡 (Bento Stats) -->
    <div class="stat-cards-grid">
      <div v-for="card in statCards" :key="card.label" class="bento-stat-card">
        <div class="stat-icon-wrap" :style="{ backgroundColor: card.bg, color: card.color }">
          <component :is="card.icon" />
        </div>
        <div class="stat-info">
          <span class="stat-label">{{ card.label }}</span>
          <span class="stat-value" :style="{ color: card.color }">{{ card.value }}</span>
        </div>
      </div>
    </div>

    <!-- 图表区 第一行：匹配度分布 & 求职漏斗 -->
    <div class="chart-grid-row">
      <!-- 匹配度分布柱状图 -->
      <div class="dashboard-chart-card">
        <div class="card-head">
          <div class="card-icon-box icon-blue">
            <el-icon><DataAnalysis /></el-icon>
          </div>
          <div>
            <h3 class="card-title">岗位匹配度分布</h3>
            <span class="card-desc">多维综合打分区间岗位数量统计</span>
          </div>
        </div>
        <div ref="scoreChartRef" class="chart-box"></div>
      </div>

      <!-- 求职漏斗 -->
      <div class="dashboard-chart-card">
        <div class="card-head">
          <div class="card-icon-box icon-purple">
            <el-icon><Aim /></el-icon>
          </div>
          <div>
            <h3 class="card-title">求职转化漏斗</h3>
            <span class="card-desc">从岗位捕获到最终 Offer 的转化留存</span>
          </div>
        </div>
        <div class="funnel-container">
          <div v-for="(item, idx) in funnelItems" :key="idx" class="funnel-tier-card">
            <div class="funnel-tier-top">
              <span class="funnel-step-name">{{ item.label }}</span>
              <span class="funnel-step-val" :style="{ color: funnelColors[idx] }">{{ item.value }} <small>个</small></span>
            </div>
            <div class="funnel-bar-bg">
              <div
                class="funnel-bar-fill"
                :style="{ width: funnelWidth(item.value), background: funnelGradients[idx] }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 图表区 第二行：HR 活跃状态分布 & HR 活跃统计 -->
    <div class="chart-grid-row">
      <!-- HR 活跃分布柱状图 -->
      <div class="dashboard-chart-card">
        <div class="card-head">
          <div class="card-icon-box icon-emerald">
            <el-icon><Guide /></el-icon>
          </div>
          <div>
            <h3 class="card-title">HR 活跃时效分布</h3>
            <span class="card-desc">招聘方活跃周期数据透视</span>
          </div>
        </div>
        <div ref="hrChartRef" class="chart-box"></div>
      </div>

      <!-- HR 活跃统计列表 -->
      <div class="dashboard-chart-card">
        <div class="card-head">
          <div class="card-icon-box icon-amber">
            <el-icon><Clock /></el-icon>
          </div>
          <div>
            <h3 class="card-title">HR 活跃时段明细</h3>
            <span class="card-desc">各活跃度层级占比与频次</span>
          </div>
        </div>
        <div class="hr-stats-scroll">
          <div v-for="item in hrStatItems" :key="item.status" class="hr-stat-row">
            <div class="hr-stat-dot" :style="{ background: item.color }"></div>
            <span class="hr-stat-label">{{ item.status }}</span>
            <div class="hr-progress-wrap">
              <el-progress :percentage="item.pct" :color="item.color" :stroke-width="7" :show-text="false" />
            </div>
            <span class="hr-stat-pct">{{ item.pct }}%</span>
            <span class="hr-stat-count">{{ item.count }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 最近推荐岗位 -->
    <div class="dashboard-table-card">
      <div class="card-head">
        <div class="card-icon-box icon-indigo">
          <el-icon><Briefcase /></el-icon>
        </div>
        <div>
          <h3 class="card-title">最近推荐岗位</h3>
          <span class="card-desc">高匹配潜力职位精选清单</span>
        </div>
      </div>

      <el-table :data="recentJobs" stripe v-loading="loading" style="width: 100%" class="modern-dashboard-table">
        <el-table-column label="岗位名称" min-width="200">
          <template #default="{ row }">
            <span class="job-link-text" @click="$router.push(`/job-detail/${row.id}`)">{{ row.job_title }}</span>
          </template>
        </el-table-column>
        <el-table-column label="公司名称" min-width="160" prop="company" />
        <el-table-column label="匹配度" width="110" align="center">
          <template #default="{ row }">
            <ScoreBadge :score="row.match_score" size="small" />
          </template>
        </el-table-column>
        <el-table-column label="当前状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.status)" size="small" effect="plain" class="status-chip">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="捕获时间" width="180" align="center">
          <template #default="{ row }">{{ fmt(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="90" align="center">
          <template #default="{ row }">
            <el-button size="small" link type="primary" class="table-link-btn" @click="$router.push(`/job-detail/${row.id}`)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
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
  { label: '已上传简历', value: overview.value.resume_count ?? 0, color: '#2563eb', bg: '#eff6ff', icon: 'Document' },
  { label: '累计扫描岗位', value: overview.value.total_jobs ?? 0, color: '#059669', bg: '#ecfdf5', icon: 'Search' },
  { label: '推荐岗位', value: overview.value.recommended_jobs ?? 0, color: '#d97706', bg: '#fffbeb', icon: 'Aim' },
  { label: '已沟通岗位', value: overview.value.communicated_jobs ?? 0, color: '#e11d48', bg: '#fff1f2', icon: 'ChatDotRound' },
  { label: '平均匹配度', value: (overview.value.average_score ?? 0) + ' 分', color: '#6366f1', bg: '#eef2ff', icon: 'DataAnalysis' },
  { label: '最高匹配度', value: (overview.value.max_score ?? 0) + ' 分', color: '#0284c7', bg: '#f0f9ff', icon: 'Trophy' },
])

const funnelItems = computed(() => [
  { label: '扫描捕获', value: funnel.value.total_jobs ?? 0 },
  { label: '推荐命中', value: funnel.value.recommended_jobs ?? 0 },
  { label: '已沟通', value: funnel.value.communicated_jobs ?? 0 },
  { label: '收到面试', value: funnel.value.interview_jobs ?? 0 },
  { label: '收获 Offer', value: funnel.value.offer_jobs ?? 0 },
])

const funnelColors = FUNNEL_PALETTE
const funnelGradients = [
  'linear-gradient(90deg, #3b82f6, #60a5fa)',
  'linear-gradient(90deg, #10b981, #34d399)',
  'linear-gradient(90deg, #f59e0b, #fbbf24)',
  'linear-gradient(90deg, #f43f5e, #fb7185)',
  'linear-gradient(90deg, #8b5cf6, #a78bfa)',
]

const funnelMax = computed(() => Math.max(...funnelItems.value.map(f => f.value), 1))

function funnelWidth(val) {
  return Math.max((val / funnelMax.value) * 100, 6) + '%'
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
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e2e8f0',
        textStyle: { color: '#1e293b' },
        extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-radius: 8px;',
      },
      grid: { left: 40, right: 20, top: 25, bottom: 30 },
      xAxis: {
        type: 'category',
        data: labels,
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        axisLabel: { color: '#64748b', fontSize: 12 },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLabel: { color: '#94a3b8' },
      },
      series: [{
        type: 'bar',
        data: data.map((v, i) => ({
          value: v,
          itemStyle: {
            color: SCORE_PALETTE[i % SCORE_PALETTE.length],
            borderRadius: [6, 6, 0, 0],
          },
        })),
        barMaxWidth: 44,
      }],
    })
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
    color: HR_STATUS_PALETTE[s] || '#94a3b8',
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
    const colors = statuses.map(s => HR_STATUS_PALETTE[s] || '#94a3b8')
    hrChart.setOption({
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e2e8f0',
        textStyle: { color: '#1e293b' },
        extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-radius: 8px;',
      },
      grid: { left: 40, right: 20, top: 25, bottom: 65 },
      xAxis: {
        type: 'category',
        data: statuses,
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        axisLabel: { rotate: 30, fontSize: 11, color: '#64748b' },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLabel: { color: '#94a3b8' },
      },
      series: [{
        type: 'bar',
        data: data.map((v, i) => ({
          value: v,
          itemStyle: {
            color: colors[i],
            borderRadius: [6, 6, 0, 0],
          },
        })),
        barMaxWidth: 32,
      }],
    })
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
  const m = { captured: '已捕获', analyzed: '已分析', recommended: '建议沟通', communicated: '已沟通', interview: '收到面试', offer: '已拿Offer', ignored: '已忽略' }
  return m[s] || s
}

function fmt(d) {
  if (!d) return ''
  const dt = new Date(d)
  return dt.toLocaleDateString('zh-CN') + ' ' + dt.toLocaleTimeString('zh-CN', { hour12: false })
}

async function exportReport() {
  try {
    const blob = await exportPdfReport()
    downloadBlob(blob, 'job_search_report.pdf', 'application/pdf')
    ElMessage.success('报告已导出')
  } catch {
    ElMessage.error('导出失败')
  }
}
</script>

<style scoped>
.dashboard-page {
  padding: 6px 0 40px;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.dashboard-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.3px;
}

.dashboard-sub {
  font-size: 13px;
  color: #64748b;
  margin-top: 4px;
}

.export-report-btn {
  height: 42px;
  padding: 0 20px;
  border-radius: 10px;
  font-weight: 600;
  background: linear-gradient(135deg, #4f46e5 0%, #2563eb 100%) !important;
  border: none !important;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
}

/* 6 核心指标卡 (Bento Grid) */
.stat-cards-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.bento-stat-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 16px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.bento-stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px -2px rgba(0, 0, 0, 0.05);
  border-color: #cbd5e1;
}

.stat-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.stat-label {
  font-size: 11px;
  color: #64748b;
  font-weight: 500;
  white-space: nowrap;
}

.stat-value {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.5px;
  white-space: nowrap;
}

/* 图表网格卡片通用 */
.chart-grid-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.dashboard-chart-card,
.dashboard-table-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.card-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.card-icon-box {
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
.icon-amber { background: #fffbeb; color: #d97706; }
.icon-indigo { background: #eef2ff; color: #4f46e5; }

.card-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.card-desc {
  font-size: 11px;
  color: #64748b;
}

.chart-box {
  width: 100%;
  height: 280px;
}

/* 现代化求职漏斗 */
.funnel-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 6px 0;
}

.funnel-tier-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px 14px;
}

.funnel-tier-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.funnel-step-name {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.funnel-step-val {
  font-size: 14px;
  font-weight: 700;
}

.funnel-step-val small {
  font-size: 11px;
  color: #94a3b8;
  font-weight: normal;
}

.funnel-bar-bg {
  width: 100%;
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
}

.funnel-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

/* HR 活跃统计滚动列表 */
.hr-stats-scroll {
  max-height: 280px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-right: 4px;
}

.hr-stat-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
}

.hr-stat-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.hr-stat-label {
  width: 72px;
  color: #475569;
  font-weight: 500;
  flex-shrink: 0;
}

.hr-progress-wrap {
  flex: 1;
}

.hr-stat-pct {
  font-size: 11px;
  color: #94a3b8;
  width: 38px;
  text-align: right;
  flex-shrink: 0;
}

.hr-stat-count {
  font-size: 12px;
  font-weight: 700;
  color: #1e293b;
  width: 32px;
  text-align: right;
  flex-shrink: 0;
}

/* 最近推荐岗位表格 */
.dashboard-table-card {
  margin-top: 4px;
}

.job-link-text {
  color: #2563eb;
  font-weight: 600;
  cursor: pointer;
}

.job-link-text:hover {
  text-decoration: underline;
}

.status-chip {
  font-weight: 600;
  border-radius: 6px;
}

.table-link-btn {
  font-weight: 600;
}

@media (max-width: 1080px) {
  .stat-cards-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  .chart-grid-row {
    grid-template-columns: 1fr;
  }
}
</style>
