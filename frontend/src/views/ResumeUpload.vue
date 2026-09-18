<template>
  <!-- 简历上传页 -->
  <div class="upload-page">
    <el-steps :active="currentStep" align-center class="steps">
      <el-step title="上传简历" />
      <el-step title="岗位分析" />
      <el-step title="查看结果" />
    </el-steps>

    <el-card class="upload-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span class="card-title">
            <el-icon><Upload /></el-icon> 上传简历
          </span>
          <span class="card-tip">支持 PDF 和 Word 格式</span>
        </div>
      </template>

      <!-- 上传区域 -->
      <el-upload
        ref="uploadRef"
        class="upload-area"
        drag
        :auto-upload="false"
        :limit="1"
        :on-change="handleFileChange"
        :on-remove="handleRemove"
        :accept="'.pdf,.docx'"
      >
        <el-icon class="upload-icon" :size="60"><UploadFilled /></el-icon>
        <div class="upload-text">
          <p>将简历文件拖拽到此处，或 <em>点击上传</em></p>
          <p class="upload-hint">支持 .pdf / .docx 格式</p>
        </div>
      </el-upload>

      <!-- 上传按钮和进度 -->
      <div class="upload-actions">
        <el-button
          type="primary"
          size="large"
          :loading="uploading"
          :disabled="!selectedFile"
          @click="handleUpload"
        >
          {{ uploading ? '解析中...' : '上传并解析' }}
        </el-button>
        <el-button size="large" :disabled="!uploadedResume" @click="goAnalyze">
          下一步
          <el-icon><ArrowRight /></el-icon>
        </el-button>
      </div>

      <!-- 解析结果预览 -->
      <div v-if="uploadedResume" class="preview-section">
        <el-alert title="简历解析成功" type="success" :closable="false" show-icon />
        <div class="preview-text">
          <h4>简历文本预览：</h4>
          <el-input
            type="textarea"
            :rows="10"
            :model-value="uploadedResume.content"
            readonly
          />
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAnalysisStore } from '../stores/analysis'
import { uploadResume } from '../api/request'

const router = useRouter()
const store = useAnalysisStore()

const uploadRef = ref(null)
const selectedFile = ref(null)
const uploadedResume = ref(null)
const uploading = ref(false)
const currentStep = ref(0)

/** 选择文件时触发 */
function handleFileChange(file) {
  selectedFile.value = file.raw
  uploadedResume.value = null
}

/** 移除文件时触发 */
function handleRemove() {
  selectedFile.value = null
  uploadedResume.value = null
}

/** 上传并解析简历 */
async function handleUpload() {
  if (!selectedFile.value) return
  uploading.value = true
  try {
    const result = await uploadResume(selectedFile.value)
    uploadedResume.value = result
    store.setResume(result)
    currentStep.value = 1
  } catch {
    // 错误已在拦截器中处理
  } finally {
    uploading.value = false
  }
}

/** 前往岗位分析页 */
function goAnalyze() {
  router.push('/analyze')
}
</script>

<style scoped>
.upload-page {
  padding: 10px 0;
}

.steps {
  margin-bottom: 30px;
}

.upload-card {
  max-width: 700px;
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

.card-tip {
  color: #999;
  font-size: 13px;
}

.upload-area {
  width: 100%;
}

.upload-icon {
  color: #c0c4cc;
}

.upload-text p {
  margin-top: 12px;
  color: #606266;
  font-size: 15px;
}

.upload-text em {
  color: #409EFF;
  font-style: normal;
}

.upload-hint {
  font-size: 12px !important;
  color: #c0c4cc !important;
}

.upload-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 24px;
}

.preview-section {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}

.preview-section h4 {
  margin: 16px 0 8px;
  color: #333;
}
</style>
