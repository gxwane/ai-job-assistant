<template>
  <div class="resume-page">
    <el-card shadow="hover" class="resume-card">
      <template #header>
        <div class="card-header">
          <span class="card-title">
            <el-icon><Document /></el-icon> 简历管理
          </span>
          <el-button type="primary" size="small" @click="$router.push('/upload')">
            <el-icon><Upload /></el-icon> 上传新简历
          </el-button>
        </div>
      </template>

      <div v-if="!loading && resumes.length === 0" class="empty-state">
        <el-result icon="info" title="暂无简历" sub-title="请先上传简历文件">
          <template #extra>
            <el-button type="primary" @click="$router.push('/upload')">前往上传</el-button>
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
            <el-button size="small" @click="toggleSelectAll">
              {{ isAllSelected ? '取消全选' : '全选' }}
            </el-button>
          </div>
          <el-button size="small" @click="loadResumes">
            <el-icon><Refresh /></el-icon> 刷新
          </el-button>
        </div>

        <!-- 表格 -->
        <el-table
          ref="tableRef"
          :data="resumes"
          stripe
          style="width: 100%"
          v-loading="loading"
          @selection-change="onSelectionChange"
        >
          <el-table-column type="selection" width="45" />

          <el-table-column label="默认" width="70" align="center">
            <template #default="{ $index }">
              <el-tag v-if="$index === 0" type="success" size="small" effect="dark">默认</el-tag>
            </template>
          </el-table-column>

          <el-table-column label="文件名" min-width="200">
            <template #default="{ row }">
              <div class="file-info">
                <el-icon color="#409EFF" :size="18"><Document /></el-icon>
                <el-link type="primary" class="file-name" @click="openResumePreview(row)">{{ row.filename }}</el-link>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="内容预览" min-width="260" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="preview-text">{{ row.content_preview || '(无内容)' }}</span>
            </template>
          </el-table-column>

          <el-table-column label="字数" width="90" align="center">
            <template #default="{ row }">
              <span class="count-text">{{ row.content_length }} 字</span>
            </template>
          </el-table-column>

          <el-table-column label="关联分析" width="90" align="center">
            <template #default="{ row }">
              <span class="count-text">{{ row.analysis_count }} 条</span>
            </template>
          </el-table-column>

          <el-table-column label="上传时间" width="170" align="center">
            <template #default="{ row }">
              <span class="time-text">{{ formatDate(row.created_at) }}</span>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="100" align="center" fixed="right">
            <template #default="{ row }">
              <el-popconfirm
                title="确定要删除这份简历吗？"
                confirm-button-text="确定"
                cancel-button-text="取消"
                @confirm="handleDelete(row)"
              >
                <template #reference>
                  <el-button type="danger" size="small" link>
                    <el-icon><Delete /></el-icon> 删除
                  </el-button>
                </template>
              </el-popconfirm>
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
            @size-change="loadResumes"
            @current-change="loadResumes"
          />
        </div>
      </template>
    </el-card>

    <!-- 简历预览弹窗 -->
    <el-dialog
      v-model="previewVisible"
      :title="previewResume?.filename || '简历预览'"
      width="800px"
      :close-on-click-modal="true"
      destroy-on-close
    >
      <div v-if="previewLoading" class="preview-loading">
        <el-icon class="is-loading" :size="24"><Loading /></el-icon>
        <p>加载中...</p>
      </div>
      <template v-else-if="previewResume">
        <div class="preview-meta">
          <span>上传时间：{{ formatDate(previewResume.created_at) }}</span>
          <el-button type="primary" size="small" @click="downloadResume(previewResume)">
            <el-icon><Download /></el-icon> 下载原件
          </el-button>
        </div>
        <div class="preview-content" v-if="previewResume.content">
          <pre>{{ previewResume.content }}</pre>
        </div>
        <el-result
          v-else
          icon="info"
          title="暂无解析内容"
          sub-title="该简历暂无解析文本，请点击右上角下载按钮下载原始文件查看。"
        />
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getResumeList, getResumeDetail, deleteResume, batchDeleteResumes } from '../api/request'

const resumes = ref([])
const loading = ref(true)
const selectedIds = ref([])
const tableRef = ref(null)
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const API_BASE = 'http://127.0.0.1:8000/api'
const previewVisible = ref(false)
const previewLoading = ref(false)
const previewResume = ref(null)

onMounted(() => {
  loadResumes()
})

async function loadResumes() {
  loading.value = true
  try {
    const res = await getResumeList({ page: currentPage.value, page_size: pageSize.value })
    resumes.value = res.items || []
    total.value = res.total || 0
    selectedIds.value = []
  } catch {
    // 错误已在拦截器处理
  } finally {
    loading.value = false
  }
}

function onSelectionChange(rows) {
  selectedIds.value = rows.map((r) => r.resume_id)
}

const isAllSelected = computed(() => {
  return resumes.value.length > 0 && selectedIds.value.length === resumes.value.length
})

function toggleSelectAll() {
  if (isAllSelected.value) {
    tableRef.value?.clearSelection()
  } else {
    resumes.value.forEach((row) => tableRef.value?.toggleRowSelection(row, true))
  }
}

async function openResumePreview(row) {
  previewVisible.value = true
  previewLoading.value = true
  previewResume.value = null
  try {
    previewResume.value = await getResumeDetail(row.resume_id)
  } catch (e) {
    ElMessage.error('获取简历内容失败')
  } finally {
    previewLoading.value = false
  }
}

function downloadResume(resume) {
  const a = document.createElement('a')
  a.href = `${API_BASE}/resume/${resume.resume_id}/file`
  a.download = resume.filename
  a.click()
}

async function handleDelete(row) {
  try {
    await deleteResume(row.resume_id)
    ElMessage.success(`已删除"${row.filename}"`)
    const totalPages = Math.ceil(total.value / pageSize.value)
    if (currentPage.value > 1 && currentPage.value > totalPages) currentPage.value--
    await loadResumes()
  } catch {
    // 错误已在拦截器处理
  }
}

function confirmBatchDelete() {
  if (selectedIds.value.length === 0) return
  ElMessageBox.confirm(
    `确定要删除选中的 ${selectedIds.value.length} 份简历吗？删除后不可恢复。`,
    '批量删除确认',
    { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'warning' }
  ).then(async () => {
    try {
      const res = await batchDeleteResumes(selectedIds.value)
      ElMessage.success(`成功删除 ${res.deleted_count} 份简历`)
      await loadResumes()
    } catch {
      // 错误已在拦截器处理
    }
  }).catch(() => {})
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
</script>

<style scoped>
.resume-page {
  padding: 10px 0;
}
.pagination-row {
  display: flex; justify-content: center; padding: 16px 0 4px;
}
.preview-loading { text-align: center; padding: 40px 0; color: #909399; }
.preview-meta { font-size: 13px; color: #909399; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; }
.preview-content {
  max-height: 70vh; overflow-y: auto; background: #f8f9fb;
  padding: 16px; border-radius: 8px; font-size: 14px; line-height: 1.7;
}
.preview-content pre {
  white-space: pre-wrap; word-break: break-word; margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.resume-card {
  max-width: 1050px;
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

.file-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-name {
  font-weight: 500;
  color: #333;
}

.preview-text {
  color: #909399;
  font-size: 13px;
}

.count-text {
  color: #606266;
  font-size: 13px;
}

.time-text {
  color: #909399;
  font-size: 13px;
}
</style>
