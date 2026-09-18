<template>
  <!-- 历史记录页 -->
  <div class="history-page">
    <el-card shadow="hover" class="history-card">
      <template #header>
        <div class="card-header">
          <span class="card-title">
            <el-icon><Clock /></el-icon> 历史分析记录
          </span>
          <div class="header-actions">
            <el-button type="primary" size="small" @click="$router.push('/upload')">
              <el-icon><Plus /></el-icon> 新分析
            </el-button>
          </div>
        </div>
      </template>

      <!-- 空状态 -->
      <div v-if="!loading && records.length === 0" class="empty-state">
        <el-result icon="info" title="暂无分析记录" sub-title="上传简历并完成分析后，记录将显示在这里">
          <template #extra>
            <el-button type="primary" @click="$router.push('/upload')">
              开始第一次分析
            </el-button>
          </template>
        </el-result>
      </div>

      <!-- 记录表格 -->
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
              size="small"
              @click="toggleSelectAll"
            >
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
          @selection-change="onSelectionChange"
        >
          <el-table-column type="selection" width="45" />
          <el-table-column label="岗位名称" min-width="180">
            <template #default="{ row }">
              <span class="job-title-link" @click="showDetail(row.id)">{{ row.job_title }}</span>
            </template>
          </el-table-column>
          <el-table-column label="匹配分数" width="130" align="center">
            <template #default="{ row }">
              <el-tag
                :type="getScoreType(row.match_score)"
                effect="dark"
                size="large"
              >
                {{ row.match_score }} 分
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="分析时间" width="170" align="center">
            <template #default="{ row }">
              <span class="time-text">{{ formatDate(row.created_at) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180" align="center" fixed="right">
            <template #default="{ row }">
              <el-button
                type="primary"
                size="small"
                link
                @click="showDetail(row.id)"
              >
                <el-icon><View /></el-icon>
                查看详情
              </el-button>
              <el-button
                type="danger"
                size="small"
                link
                @click.stop="confirmSingleDelete(row)"
              >
                <el-icon><Delete /></el-icon>
                删除
              </el-button>
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
      title="分析详情"
      width="750px"
      :close-on-click-modal="true"
      destroy-on-close
    >
      <template v-if="detail">
        <div class="detail-content">
          <!-- 分数+等级 -->
          <div class="detail-header">
            <div>
              <h3>{{ detail.job_title }}</h3>
              <div class="detail-level-row">
                <el-tag
                  v-if="detail.result_json.score_level"
                  :type="getLevelType(detail.result_json.score_level)"
                  effect="dark"
                  size="large"
                  round
                >
                  {{ detail.result_json.score_level }}
                </el-tag>
              </div>
            </div>
            <el-progress
              type="circle"
              :percentage="detail.match_score"
              :color="getScoreColor(detail.match_score)"
              :width="100"
            />
          </div>

          <!-- 推荐建议 -->
          <div v-if="detail.result_json.recommendation" class="detail-section">
            <h4>投递建议</h4>
            <p class="recommendation-text">{{ detail.result_json.recommendation }}</p>
          </div>

          <!-- 风险提示 -->
          <div v-if="detail.result_json.risk_warnings && detail.result_json.risk_warnings.length > 0" class="detail-section">
            <h4>风险提示</h4>
            <el-alert type="warning" :closable="false" show-icon>
              <ul class="alert-list">
                <li v-for="(w, i) in detail.result_json.risk_warnings" :key="i">{{ w }}</li>
              </ul>
            </el-alert>
          </div>

          <!-- 封顶原因 -->
          <div v-if="detail.result_json.score_cap_reason" class="detail-section">
            <h4>评分说明</h4>
            <el-alert type="info" :closable="false" show-icon>
              <p>{{ detail.result_json.score_cap_reason }}</p>
            </el-alert>
          </div>

          <!-- 分项评分 -->
          <div v-if="detail.result_json.score_breakdown" class="detail-section">
            <h4>分项评分</h4>
            <div class="sub-score-grid">
              <div class="sub-score-item">
                <span>技能匹配：{{ detail.result_json.score_breakdown.skill_score }}/40</span>
                <el-progress
                  :percentage="(detail.result_json.score_breakdown.skill_score / 40) * 100"
                  :stroke-width="8"
                  :color="progressColor(detail.result_json.score_breakdown.skill_score, 40)"
                />
              </div>
              <div class="sub-score-item">
                <span>项目经验：{{ detail.result_json.score_breakdown.project_score }}/30</span>
                <el-progress
                  :percentage="(detail.result_json.score_breakdown.project_score / 30) * 100"
                  :stroke-width="8"
                  :color="progressColor(detail.result_json.score_breakdown.project_score, 30)"
                />
              </div>
              <div class="sub-score-item">
                <span>学历背景：{{ detail.result_json.score_breakdown.education_score }}/15</span>
                <el-progress
                  :percentage="(detail.result_json.score_breakdown.education_score / 15) * 100"
                  :stroke-width="8"
                />
              </div>
              <div class="sub-score-item">
                <span>发展潜力：{{ detail.result_json.score_breakdown.potential_score }}/15</span>
                <el-progress
                  :percentage="(detail.result_json.score_breakdown.potential_score / 15) * 100"
                  :stroke-width="8"
                />
              </div>
            </div>
          </div>

          <!-- 岗位方向 -->
          <div class="detail-section">
            <h4>岗位方向分析</h4>
            <p><strong>候选人方向：</strong>{{ detail.result_json.resume_category || '未知' }}</p>
            <p><strong>岗位方向：</strong>{{ detail.result_json.job_category || '未知' }}</p>
            <p>
              <strong>方向匹配：</strong>
              <el-tag :type="detail.result_json.category_match ? 'success' : 'danger'" size="small">
                {{ detail.result_json.category_match ? '匹配' : '不匹配' }}
              </el-tag>
              <span v-if="detail.result_json.category_reason" class="category-reason">
                — {{ detail.result_json.category_reason }}
              </span>
            </p>
          </div>

          <!-- 核心技能命中率 -->
          <div class="detail-section">
            <h4>核心技能命中率</h4>
            <el-progress
              :percentage="Math.round((detail.result_json.core_skill_hit_rate || 0) * 100)"
              :stroke-width="14"
              style="max-width: 400px;"
            />
          </div>

          <!-- 总体评价 -->
          <div class="detail-section">
            <h4>总体评价</h4>
            <p>{{ detail.result_json.summary }}</p>
          </div>

          <!-- 匹配优势 -->
          <div class="detail-section">
            <h4>匹配优势</h4>
            <div class="tag-list">
              <el-tag
                v-for="(item, i) in detail.result_json.matched_points"
                :key="i"
                type="success"
                effect="plain"
              >
                {{ item }}
              </el-tag>
            </div>
          </div>

          <!-- 缺失技能 -->
          <div class="detail-section">
            <h4>缺失技能</h4>
            <div class="tag-list">
              <el-tag
                v-for="(item, i) in detail.result_json.missing_skills"
                :key="i"
                type="warning"
                effect="plain"
              >
                {{ item }}
              </el-tag>
            </div>
          </div>

          <!-- 简历优化建议 -->
          <div class="detail-section">
            <h4>简历优化建议</h4>
            <ul>
              <li v-for="(item, i) in detail.result_json.resume_suggestions" :key="i">
                {{ item }}
              </li>
            </ul>
          </div>

          <!-- 面试问题 -->
          <div class="detail-section">
            <h4>面试高频问题</h4>
            <el-collapse>
              <el-collapse-item
                v-for="(item, i) in detail.result_json.interview_questions"
                :key="i"
                :title="item.question"
              >
                <p class="answer-text">{{ item.answer }}</p>
              </el-collapse-item>
            </el-collapse>
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
import { getHistoryList, getHistoryDetail, deleteHistory, batchDeleteHistory } from '../api/request'

const records = ref([])
const loading = ref(true)
const dialogVisible = ref(false)
const detail = ref(null)
const selectedIds = ref([])
const tableRef = ref(null)
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

onMounted(() => {
  loadRecords()
})

/** 加载历史记录（分页） */
async function loadRecords() {
  loading.value = true
  try {
    const res = await getHistoryList({ page: currentPage.value, page_size: pageSize.value })
    records.value = res.items || []
    total.value = res.total || 0
    selectedIds.value = []
  } catch {
    // 加载失败已在拦截器处理
  } finally {
    loading.value = false
  }
}

async function refreshAfterDelete() {
  const totalPages = Math.ceil(total / pageSize.value)
  if (currentPage.value > 1 && currentPage.value > totalPages) {
    currentPage.value--
  }
  await loadRecords()
}

/** 查看详情 */
async function showDetail(id) {
  dialogVisible.value = true
  detail.value = null
  try {
    detail.value = await getHistoryDetail(id)
  } catch {
    dialogVisible.value = false
  }
}

/** 表格选中变化 */
function onSelectionChange(rows) {
  selectedIds.value = rows.map((r) => r.id)
}

/** 是否全选 */
const isAllSelected = computed(() => {
  return records.value.length > 0 && selectedIds.value.length === records.value.length
})

/** 全选/取消全选 */
function toggleSelectAll() {
  if (isAllSelected.value) {
    tableRef.value?.clearSelection()
  } else {
    records.value.forEach((row) => {
      tableRef.value?.toggleRowSelection(row, true)
    })
  }
}

/** 确认删除单条 */
function confirmSingleDelete(row) {
  ElMessageBox.confirm(
    `确定要删除"${row.job_title}"的分析记录吗？删除后不可恢复。`,
    '删除确认',
    {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(async () => {
      try {
        await deleteHistory(row.id)
        ElMessage.success('删除成功')
        await refreshAfterDelete()
      } catch {
        // 错误已在拦截器处理
      }
    })
    .catch(() => {
      // 用户取消
    })
}

/** 确认批量删除 */
function confirmBatchDelete() {
  if (selectedIds.value.length === 0) return

  ElMessageBox.confirm(
    `确定要删除选中的 ${selectedIds.value.length} 条分析记录吗？删除后不可恢复。`,
    '批量删除确认',
    {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(async () => {
      try {
        const res = await batchDeleteHistory(selectedIds.value)
        ElMessage.success(`成功删除 ${res.deleted_count} 条记录`)
        await refreshAfterDelete()
      } catch {
        // 错误已在拦截器处理
      }
    })
    .catch(() => {
      // 用户取消
    })
}

/** 分数对应的标签类型 */
function getScoreType(score) {
  if (score >= 80) return 'success'
  if (score >= 60) return 'warning'
  if (score >= 40) return 'danger'
  return 'danger'
}

/** 分数对应的颜色 */
function getScoreColor(score) {
  if (score >= 80) return '#67C23A'
  if (score >= 60) return '#E6A23C'
  if (score >= 40) return '#E6A23C'
  return '#F56C6C'
}

/** 评分等级对应的标签类型 */
function getLevelType(level) {
  if (level === '高度匹配' || level === '良好匹配') return 'success'
  if (level === '部分匹配') return 'warning'
  return 'danger'
}

/** 进度条颜色 */
function progressColor(score, max) {
  const rate = score / max
  if (rate >= 0.7) return '#67C23A'
  if (rate >= 0.4) return '#E6A23C'
  return '#F56C6C'
}

/** 格式化日期 */
function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
</script>

<style scoped>
.history-page {
  padding: 10px 0;
}
.pagination-row {
  display: flex; justify-content: center; padding: 16px 0 4px;
}

.history-card {
  max-width: 950px;
  margin: 0 auto;
  border-radius: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.empty-state {
  padding: 40px 0;
}

/* 工具栏 */
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

/* 表格 */
.job-title-link {
  color: #409EFF;
  cursor: pointer;
  font-weight: 500;
}

.job-title-link:hover {
  color: #337ECC;
  text-decoration: underline;
}

.time-text {
  color: #909399;
  font-size: 13px;
}

/* 弹窗详情样式 */
.detail-content {
  max-height: 65vh;
  overflow-y: auto;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #ebeef5;
}

.detail-header h3 {
  font-size: 22px;
  color: #333;
  margin-bottom: 6px;
}

.detail-level-row {
  margin-top: 4px;
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

.detail-section p {
  color: #666;
  line-height: 1.8;
}

.detail-section ul {
  padding-left: 20px;
}

.detail-section li {
  padding: 6px 0;
  color: #555;
  line-height: 1.7;
}

.recommendation-text {
  font-weight: 500;
  color: #409EFF !important;
}

.category-reason {
  color: #999;
  font-size: 13px;
  margin-left: 4px;
}

.alert-list {
  margin: 4px 0;
  padding-left: 20px;
}

.alert-list li {
  font-size: 13px;
  line-height: 1.7;
}

/* 分项评分 */
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
  gap: 8px;
}

.answer-text {
  padding: 10px 0;
  color: #555;
  line-height: 1.8;
}

.loading-detail {
  text-align: center;
  padding: 40px;
  color: #999;
}
</style>
