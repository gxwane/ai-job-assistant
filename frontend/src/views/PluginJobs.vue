<template>
  <!-- 插件岗位记录页 -->
  <div class="plugin-jobs-page">
    <el-card shadow="hover" class="jobs-card">
      <template #header>
        <div class="card-header">
          <span class="card-title">
            <el-icon><Connection /></el-icon> 插件岗位记录
          </span>
          <span class="card-subtitle">来自Boss直聘浏览器插件的岗位捕获记录</span>
        </div>
      </template>

      <!-- 搜索和筛选 -->
      <div class="filter-bar">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索岗位名或公司..."
          clearable
          style="width: 260px"
          @clear="loadRecords"
          @keyup.enter="loadRecords"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-button @click="loadRecords">搜索</el-button>

        <el-divider direction="vertical" />

        <!-- 状态筛选 -->
        <el-radio-group v-model="filterStatus" @change="onFilterChange" size="small">
          <el-radio-button value="">全部</el-radio-button>
          <el-radio-button value="captured">已捕获</el-radio-button>
          <el-radio-button value="analyzed">已分析</el-radio-button>
          <el-radio-button value="recommended">建议沟通</el-radio-button>
          <el-radio-button value="communicated">已沟通</el-radio-button>
          <el-radio-button value="ignored">已忽略</el-radio-button>
          <el-radio-button value="interview">收到面试</el-radio-button>
        </el-radio-group>
      </div>

      <!-- 空状态 -->
      <div v-if="!loading && records.length === 0" class="empty-state">
        <el-result icon="info" title="暂无插件岗位记录" sub-title="使用浏览器插件捕获Boss直聘岗位后，记录将显示在这里">
          <template #extra>
            <el-button type="primary" @click="loadRecords">
              <el-icon><Refresh /></el-icon> 刷新
            </el-button>
          </template>
        </el-result>
      </div>

      <template v-else>
        <!-- 工具栏 -->
        <div class="toolbar">
          <div class="toolbar-left">
            <el-button
              type="danger"
              size="small"
              :disabled="selectedIds.length === 0"
              @click="confirmBatchDelete"
            >
              <el-icon><Delete /></el-icon>
              批量删除（{{ selectedIds.length }}）
            </el-button>
            <el-button
              type="warning"
              size="small"
              :disabled="selectedIds.length === 0"
              @click="confirmBatchIgnore"
            >
              <el-icon><Hide /></el-icon>
              批量忽略（{{ selectedIds.length }}）
            </el-button>
            <el-button size="small" @click="toggleSelectAll">
              {{ isAllSelected ? '取消全选' : '全选' }}
            </el-button>
          </div>
          <el-button size="small" @click="loadRecords">
            <el-icon><Refresh /></el-icon> 刷新
          </el-button>
        </div>

        <!-- 表格 -->
        <el-table
          ref="tableRef"
          :data="records"
          stripe
          style="width: 100%"
          class="modern-jobs-table"
          @selection-change="onSelectionChange"
        >
          <el-table-column type="selection" width="40" align="center" />
          <el-table-column label="岗位名称" min-width="150" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="job-title-link" @click="showDetail(row.id)">{{ row.job_title }}</span>
            </template>
          </el-table-column>
          <el-table-column label="公司" width="120" show-overflow-tooltip>
            <template #default="{ row }">
              {{ row.company || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="薪资" width="85" align="center">
            <template #default="{ row }">
              <span class="salary-text">{{ row.salary || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="地点" width="65" align="center">
            <template #default="{ row }">
              {{ row.location || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="HR状态" width="95" align="center">
            <template #default="{ row }">
              <HRStatusTag :status="row.hr_status" />
            </template>
          </el-table-column>
          <el-table-column label="匹配度" width="75" align="center">
            <template #default="{ row }">
              <ScoreBadge :score="row.match_score" size="small" />
            </template>
          </el-table-column>
          <el-table-column label="推荐结论" width="85" align="center">
            <template #default="{ row }">
              <el-tag
                v-if="row.score_level"
                :type="getLevelTagType(row.score_level)"
                size="small"
                effect="plain"
              >
                {{ row.score_level }}
              </el-tag>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="getStatusTagType(row.status)" size="small">
                {{ statusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="捕获时间" width="135" align="center">
            <template #default="{ row }">
              <span class="time-text">{{ formatDate(row.created_at) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="250" align="center">
            <template #default="{ row }">
              <div class="op-actions-cell">
                <el-button type="primary" size="small" link class="op-link-btn" @click="showDetail(row.id)">
                  <el-icon><View /></el-icon> 详情
                </el-button>
                <el-button
                  v-if="row.status !== 'communicated' && row.status !== 'interview'"
                  type="success"
                  size="small"
                  link
                  class="op-link-btn"
                  @click="handleMarkCommunicated(row)"
                >
                  <el-icon><ChatDotRound /></el-icon> 已沟通
                </el-button>
                <el-button
                  v-if="row.status === 'interview'"
                  type="primary"
                  size="small"
                  link
                  class="op-link-btn"
                  @click="$router.push(`/interview-questions/${row.id}`)"
                >
                  <el-icon><Reading /></el-icon> 问答
                </el-button>
                <el-button
                  v-if="row.status === 'communicated'"
                  type="success"
                  size="small"
                  link
                  class="op-link-btn"
                  @click="handleMarkInterview(row)"
                >
                  <el-icon><Trophy /></el-icon> 面试
                </el-button>
                <el-button
                  v-if="row.status !== 'ignored'"
                  type="warning"
                  size="small"
                  link
                  class="op-link-btn"
                  @click="handleMarkIgnored(row)"
                >
                  <el-icon><Hide /></el-icon> 忽略
                </el-button>
                <el-button type="danger" size="small" link class="op-link-btn" @click="confirmSingleDelete(row)">
                  <el-icon><Delete /></el-icon> 删除
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="pagination-row">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50]"
            :total="total"
            layout="total, sizes, prev, pager, next, jumper"
            background
            @size-change="loadRecords"
            @current-change="loadRecords"
          />
        </div>
      </template>
    </el-card>

    <!-- 详情弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      title="岗位详情"
      width="750px"
      :close-on-click-modal="true"
      destroy-on-close
    >
      <template v-if="detail">
        <div class="detail-content">
          <!-- 基本信息 -->
          <div class="detail-section">
            <h4>基本信息</h4>
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item label="岗位名称">{{ detail.job_title }}</el-descriptions-item>
              <el-descriptions-item label="公司">{{ detail.company || '未知' }}</el-descriptions-item>
              <el-descriptions-item label="薪资">{{ detail.salary || '未知' }}</el-descriptions-item>
              <el-descriptions-item label="地点">{{ detail.location || '未知' }}</el-descriptions-item>
              <el-descriptions-item label="状态">
                <el-tag :type="getStatusTagType(detail.status)" size="small">
                  {{ statusLabel(detail.status) }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="来源">{{ detail.source }}</el-descriptions-item>
              <el-descriptions-item v-if="detail.hr_name" label="HR姓名">{{ detail.hr_name }}</el-descriptions-item>
              <el-descriptions-item v-if="detail.hr_status" label="HR状态">
                <HRStatusTag :status="detail.hr_status" />
              </el-descriptions-item>
              <el-descriptions-item v-if="detail.composite_score != null" label="综合推荐">{{ detail.composite_score }}分</el-descriptions-item>
              <el-descriptions-item label="岗位链接" :span="2">
                <a :href="detail.job_url" target="_blank" class="job-url">{{ detail.job_url }}</a>
              </el-descriptions-item>
            </el-descriptions>
          </div>

          <!-- 匹配评分 -->
          <div v-if="detail.match_score != null" class="detail-section">
            <h4>匹配评分</h4>
            <div class="score-row">
              <el-progress type="dashboard" :percentage="detail.match_score" :width="120" :color="getScoreColor(detail.match_score)" />
              <div class="score-info">
                <div>
                  <el-tag :type="getLevelTagType(detail.score_level || '')" size="large" effect="dark" round>
                    {{ detail.score_level }}
                  </el-tag>
                  <el-tag v-if="detail.composite_score != null" type="primary" size="large" effect="dark" round style="margin-left:8px">
                    综合 {{ detail.composite_score }}
                  </el-tag>
                </div>
                <p v-if="detail.recommendation" class="recommendation-text">{{ detail.recommendation }}</p>
              </div>
            </div>

            <!-- 岗位标签展示 -->
            <div v-if="parsedDetailTags.length" class="tag-section-row" style="margin-top:12px">
              <span class="tag-label">岗位标签：</span>
              <SkillTagList :items="parsedDetailTags" type="success" size="small" />
            </div>

            <!-- 分项评分 -->
            <div v-if="detail.score_breakdown" class="sub-score-grid" style="margin-top:16px">
              <div class="sub-score-item">
                <span>技能匹配：{{ detail.score_breakdown.skill_score }}/40</span>
                <el-progress :percentage="(detail.score_breakdown.skill_score / 40) * 100" :stroke-width="8" :color="progressColor(detail.score_breakdown.skill_score, 40)" />
              </div>
              <div class="sub-score-item">
                <span>项目经验：{{ detail.score_breakdown.project_score }}/30</span>
                <el-progress :percentage="(detail.score_breakdown.project_score / 30) * 100" :stroke-width="8" :color="progressColor(detail.score_breakdown.project_score, 30)" />
              </div>
              <div class="sub-score-item">
                <span>学历背景：{{ detail.score_breakdown.education_score }}/15</span>
                <el-progress :percentage="(detail.score_breakdown.education_score / 15) * 100" :stroke-width="8" />
              </div>
              <div class="sub-score-item">
                <span>发展潜力：{{ detail.score_breakdown.potential_score }}/15</span>
                <el-progress :percentage="(detail.score_breakdown.potential_score / 15) * 100" :stroke-width="8" />
              </div>
            </div>
          </div>

          <!-- 分析结果详情 -->
          <div v-if="detail.analysis_result_json" class="detail-section">
            <h4>详细分析</h4>
            <p><strong>候选人方向：</strong>{{ detail.analysis_result_json.resume_category || '未知' }}</p>
            <p><strong>岗位方向：</strong>{{ detail.analysis_result_json.job_category || '未知' }}</p>

            <!-- 风险提示 -->
            <div v-if="detail.analysis_result_json.risk_warnings && detail.analysis_result_json.risk_warnings.length > 0" style="margin-top:10px">
              <el-alert type="warning" :closable="false" show-icon>
                <template #title>风险提示</template>
                <ul class="alert-list">
                  <li v-for="(w, i) in detail.analysis_result_json.risk_warnings" :key="i">{{ w }}</li>
                </ul>
              </el-alert>
            </div>

            <p style="margin-top:10px"><strong>总结：</strong>{{ detail.analysis_result_json.summary }}</p>

            <div v-if="detail.analysis_result_json.matched_points && detail.analysis_result_json.matched_points.length > 0" style="margin-top:10px">
              <strong>匹配优势：</strong>
              <div class="tag-list">
                <el-tag v-for="(item, i) in detail.analysis_result_json.matched_points" :key="i" type="success" effect="plain" size="small">{{ item }}</el-tag>
              </div>
            </div>

            <div v-if="detail.analysis_result_json.missing_skills && detail.analysis_result_json.missing_skills.length > 0" style="margin-top:10px">
              <strong>缺失技能：</strong>
              <div class="tag-list">
                <el-tag v-for="(item, i) in detail.analysis_result_json.missing_skills" :key="i" type="warning" effect="plain" size="small">{{ item }}</el-tag>
              </div>
            </div>
          </div>

          <!-- 岗位JD -->
          <div class="detail-section">
            <h4>岗位JD</h4>
            <div class="jd-box">{{ detail.job_description }}</div>
          </div>
        </div>
      </template>
      <div v-else class="loading-detail">
        <el-icon class="is-loading" :size="30"><Loading /></el-icon>
        <p>加载中...</p>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import ScoreBadge from '../components/ScoreBadge.vue'
import HRStatusTag from '../components/HRStatusTag.vue'
import SkillTagList from '../components/SkillTagList.vue'
import {
  getJobRecords,
  getJobRecordDetail,
  deleteJobRecord,
  batchDeleteJobRecords,
  batchUpdateJobStatus,
  markJobCommunicated,
  markJobIgnored,
  markJobInterview,
} from '../api/request'

const records = ref([])
const loading = ref(true)
const searchKeyword = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const filterStatus = ref('')
const selectedIds = ref([])
const tableRef = ref(null)
const dialogVisible = ref(false)
const detail = ref(null)

onMounted(() => {
  loadRecords()
})

function onFilterChange() {
  currentPage.value = 1
  loadRecords()
}

async function refreshAfterDelete() {
  const totalPages = Math.ceil(total.value / pageSize.value)
  if (currentPage.value > 1 && currentPage.value > totalPages) {
    currentPage.value--
  }
  await loadRecords()
}

/** 加载记录列表（分页） */
async function loadRecords() {
  loading.value = true
  try {
    const params = { page: currentPage.value, page_size: pageSize.value }
    if (filterStatus.value) params.status = filterStatus.value
    if (searchKeyword.value) params.keyword = searchKeyword.value
    const res = await getJobRecords(params)
    records.value = res.items || []
    total.value = res.total || 0
    selectedIds.value = []
  } catch {
    // 错误已在拦截器处理
  } finally {
    loading.value = false
  }
}

/** 查看详情 */
async function showDetail(id) {
  dialogVisible.value = true
  detail.value = null
  try {
    detail.value = await getJobRecordDetail(id)
  } catch {
    dialogVisible.value = false
  }
}

/** 表格选中变化 */
function onSelectionChange(rows) {
  selectedIds.value = rows.map((r) => r.id)
}

const isAllSelected = computed(() => {
  return records.value.length > 0 && selectedIds.value.length === records.value.length
})

function toggleSelectAll() {
  if (isAllSelected.value) {
    tableRef.value?.clearSelection()
  } else {
    records.value.forEach((row) => tableRef.value?.toggleRowSelection(row, true))
  }
}

/** 标记已沟通 */
async function handleMarkCommunicated(row) {
  try {
    await markJobCommunicated(row.id)
    ElMessage.success('已标记为已沟通')
    await loadRecords()
  } catch {
    // 错误已在拦截器处理
  }
}

/** 标记忽略 */
async function handleMarkIgnored(row) {
  try {
    await markJobIgnored(row.id)
    ElMessage.success('已标记为已忽略')
    await loadRecords()
  } catch {
    // 错误已在拦截器处理
  }
}

/** 标记收到面试 */
async function handleMarkInterview(row) {
  try {
    await markJobInterview(row.id)
    ElMessage.success('已标记为收到面试')
    await loadRecords()
  } catch {
    // 错误已在拦截器处理
  }
}

/** 确认删除单条 */
function confirmSingleDelete(row) {
  ElMessageBox.confirm(
    `确定要删除"${row.job_title}"(${row.company || '未知公司'})的岗位记录吗？删除后不可恢复。`,
    '删除确认',
    { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'warning' }
  )
    .then(async () => {
      await deleteJobRecord(row.id)
      ElMessage.success('删除成功')
      await refreshAfterDelete()
    })
    .catch(() => {})
}

/** 确认批量删除 */
function confirmBatchDelete() {
  if (selectedIds.value.length === 0) return
  ElMessageBox.confirm(
    `确定要删除选中的 ${selectedIds.value.length} 条岗位记录吗？删除后不可恢复。`,
    '批量删除确认',
    { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'warning' }
  )
    .then(async () => {
      const res = await batchDeleteJobRecords(selectedIds.value)
      ElMessage.success(`成功删除 ${res.deleted_count} 条记录`)
      await refreshAfterDelete()
    })
    .catch(() => {})
}

/** 确认批量忽略 */
function confirmBatchIgnore() {
  if (selectedIds.value.length === 0) return
  ElMessageBox.confirm(
    `确定要忽略选中的 ${selectedIds.value.length} 条岗位记录吗？`,
    '批量忽略确认',
    { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
  )
    .then(async () => {
      const res = await batchUpdateJobStatus(selectedIds.value, 'ignored')
      ElMessage.success(res.message)
      await loadRecords()
    })
    .catch(() => {})
}

/** 状态标签映射 */
function statusLabel(status) {
  const map = {
    captured: '已捕获',
    analyzed: '已分析',
    recommended: '建议沟通',
    communicated: '已沟通',
    ignored: '已忽略',
    interview: '收到面试',
  }
  return map[status] || status
}

function getStatusTagType(status) {
  const map = {
    captured: 'info',
    analyzed: '',
    recommended: 'success',
    communicated: 'primary',
    ignored: 'warning',
    interview: 'success',
  }
  return map[status] || 'info'
}

function getScoreType(score) {
  if (score >= 80) return 'success'
  if (score >= 60) return 'warning'
  return 'danger'
}

function getScoreColor(score) {
  if (score >= 80) return '#67C23A'
  if (score >= 60) return '#E6A23C'
  return '#F56C6C'
}

function getLevelTagType(level) {
  if (level === '高度匹配' || level === '良好匹配') return 'success'
  if (level === '部分匹配') return 'warning'
  return 'danger'
}

function progressColor(score, max) {
  const rate = score / max
  if (rate >= 0.7) return '#67C23A'
  if (rate >= 0.4) return '#E6A23C'
  return '#F56C6C'
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function hrStatusType(status) {
  const m = { '在线': 'success', '刚刚活跃': 'success', '今日活跃': 'success',
    '3日内活跃': 'warning', '本周活跃': 'warning',
    '本月活跃': 'danger', '两周内活跃': 'danger', '两月内活跃': 'danger',
    '3月内活跃': 'danger', '半年前活跃': 'info' }
  return m[status] || 'info'
}

const parsedDetailTags = computed(() => {
  if (!detail.value?.job_tags) return []
  try {
    return typeof detail.value.job_tags === 'string'
      ? JSON.parse(detail.value.job_tags)
      : detail.value.job_tags
  } catch {
    return []
  }
})
</script>

<style scoped>
.plugin-jobs-page {
  padding: 10px 0;
}
.pagination-row {
  display: flex; justify-content: center; padding: 16px 0 4px;
}

.jobs-card {
  max-width: 1240px;
  margin: 0 auto;
  border-radius: 12px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-subtitle {
  font-size: 13px;
  color: #909399;
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.modern-jobs-table :deep(th.el-table__cell) {
  background: #f8fafc;
  color: #475569;
  font-weight: 600;
  font-size: 13px;
}

.op-actions-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  white-space: nowrap;
}

.op-link-btn {
  font-size: 12px;
  font-weight: 500;
  padding: 2px 4px !important;
  margin-left: 0 !important;
}

.empty-state {
  padding: 40px 0;
}

.job-title-link {
  color: #2563eb;
  cursor: pointer;
  font-weight: 600;
}

.job-title-link:hover {
  color: #1d4ed8;
  text-decoration: underline;
}

.salary-text {
  color: #d97706;
  font-weight: 600;
}

.no-score {
  color: #94a3b8;
  font-size: 13px;
}

.time-text {
  color: #64748b;
  font-size: 12px;
}

/* 详情弹窗 */
.detail-content {
  max-height: 65vh;
  overflow-y: auto;
}

.detail-section {
  margin-bottom: 20px;
}

.detail-section h4 {
  font-size: 16px;
  color: #333;
  margin-bottom: 10px;
  padding-left: 10px;
  border-left: 3px solid #409EFF;
}

.score-row {
  display: flex;
  align-items: center;
  gap: 24px;
}

.score-info {
  flex: 1;
}

.recommendation-text {
  margin-top: 8px;
  color: #409EFF !important;
  font-weight: 500;
}

.job-url {
  color: #409EFF;
  font-size: 12px;
  word-break: break-all;
}

.jd-box {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 14px;
  font-size: 13px;
  line-height: 1.8;
  color: #555;
  white-space: pre-wrap;
  max-height: 300px;
  overflow-y: auto;
}

.sub-score-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.sub-score-item {
  font-size: 13px;
  color: #555;
}

.sub-score-item span {
  display: block;
  margin-bottom: 4px;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.alert-list {
  margin: 4px 0;
  padding-left: 20px;
}

.alert-list li {
  font-size: 13px;
  line-height: 1.7;
}

.loading-detail {
  text-align: center;
  padding: 40px;
  color: #999;
}

.tag-section-row { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; }
.tag-label { font-size: 12px; color: #909399; }
.inline-tag { margin: 1px 2px; }
</style>
