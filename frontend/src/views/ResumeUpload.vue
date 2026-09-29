<template>
  <!-- 简历上传页 -->
  <div class="upload-page">
    <!-- 流程指示器胶囊 -->
    <div class="stepper-capsule">
      <el-steps :active="currentStep" align-center class="modern-steps">
        <el-step title="上传简历" />
        <el-step title="岗位分析" />
        <el-step title="深度画像与报告" />
      </el-steps>
    </div>

    <el-card class="upload-card modern-card" shadow="never">
      <template #header>
        <div class="card-header">
          <div class="header-title-box">
            <div class="header-icon-box">
              <el-icon :size="18"><Upload /></el-icon>
            </div>
            <div>
              <div class="card-title">上传求职简历</div>
              <div class="card-subtitle">支持 PDF / Word (.docx) 格式，文本本地安全解析</div>
            </div>
          </div>
          <el-tag type="info" size="small" effect="plain" round class="privacy-badge">
            <el-icon><CircleCheckFilled /></el-icon> 纯本地隐私安全
          </el-tag>
        </div>
      </template>

      <!-- 快速复用现有简历提示（若已存在上下文） -->
      <div v-if="store.currentResume && !uploadedResume && !selectedFile" class="resume-reuse-card">
        <div class="reuse-left">
          <div class="resume-file-icon">
            <el-icon :size="20"><Document /></el-icon>
          </div>
          <div class="resume-meta">
            <div class="resume-filename">{{ store.currentResume.filename || '已载入的历史简历' }}</div>
            <div class="resume-sub">已载入系统上下文，可直接用于多岗位快速比对</div>
          </div>
        </div>
        <el-button type="primary" plain class="reuse-action-btn" @click="goAnalyze">
          直接使用此简历 <el-icon><ArrowRight /></el-icon>
        </el-button>
      </div>

      <!-- 上传区域 -->
      <el-upload
        ref="uploadRef"
        class="upload-area modern-upload-dropzone"
        drag
        :auto-upload="false"
        :limit="1"
        :on-change="handleFileChange"
        :on-remove="handleRemove"
        :accept="'.pdf,.docx'"
      >
        <div class="upload-icon-circle">
          <el-icon :size="32"><UploadFilled /></el-icon>
        </div>
        <div class="upload-text">
          <p class="upload-primary-text">将简历拖拽到此处，或 <em>点击浏览本地文件</em></p>
          <div class="upload-format-chips">
            <span class="format-chip">.PDF</span>
            <span class="format-chip">.DOCX</span>
            <span class="format-tip">单文件大小建议不超过 10MB</span>
          </div>
        </div>
      </el-upload>

      <!-- 上传按钮和流程控制 -->
      <div class="upload-actions">
        <el-button
          type="primary"
          size="large"
          class="modern-submit-btn"
          :loading="uploading"
          :disabled="!selectedFile"
          @click="handleUpload"
        >
          <el-icon v-if="!uploading"><MagicStick /></el-icon>
          {{ uploading ? '智能解析中...' : '上传并解析' }}
        </el-button>
        <el-button
          size="large"
          class="modern-ghost-btn"
          :disabled="!uploadedResume && !store.currentResume"
          @click="goAnalyze"
        >
          下一步：岗位分析
          <el-icon><ArrowRight /></el-icon>
        </el-button>
      </div>

      <!-- 解析结果预览 -->
      <div v-if="uploadedResume" class="preview-section">
        <div class="preview-header">
          <div class="status-ready-pill">
            <span class="dot-green"></span>
            <span>简历文本提取成功 (共 {{ uploadedResume.content?.length || 0 }} 字符)</span>
          </div>
        </div>
        <div class="preview-textarea-wrap">
          <el-input
            type="textarea"
            :rows="9"
            :model-value="uploadedResume.content"
            readonly
            class="modern-preview-textarea"
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
  padding: 16px 0 40px;
}

/* 现代化居中胶囊步骤器 */
.stepper-capsule {
  max-width: 640px;
  margin: 0 auto 32px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 9999px;
  padding: 14px 36px;
  box-shadow: 0 4px 16px -2px rgba(15, 23, 42, 0.04);
}

.modern-steps :deep(.el-step__title) {
  font-size: 14px;
  font-weight: 600;
}

.modern-steps :deep(.el-step__title.is-process),
.modern-steps :deep(.el-step__head.is-process) {
  color: #4f46e5;
  border-color: #4f46e5;
}

.modern-steps :deep(.el-step__head.is-process .el-step__icon) {
  background: #e0e7ff;
  color: #4f46e5;
}

.upload-card {
  max-width: 720px;
  margin: 0 auto;
  border-radius: 18px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.05);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title-box {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon-box {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #eef2ff;
  color: #4f46e5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-title {
  font-size: 17px;
  font-weight: 700;
  color: #0f172a;
}

.card-subtitle {
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
}

.privacy-badge {
  font-size: 12px;
  border-color: #e2e8f0;
  color: #475569;
}

/* 现有简历复用卡 */
.resume-reuse-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 20px;
}

.reuse-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.resume-file-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #e0e7ff;
  color: #4f46e5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.resume-filename {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.resume-sub {
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
}

.reuse-action-btn {
  font-size: 13px;
  font-weight: 500;
}

/* 现代化上传拖拽区域 */
.modern-upload-dropzone :deep(.el-upload-dragger) {
  padding: 40px 20px;
  border-radius: 16px;
  border: 2px dashed #cbd5e1;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  transition: all 0.25s ease;
}

.modern-upload-dropzone :deep(.el-upload-dragger:hover) {
  border-color: #6366f1;
  background: #eef2ff;
}

.upload-icon-circle {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  border-radius: 50%;
  background: #e0e7ff;
  color: #4f46e5;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 14px rgba(79, 70, 229, 0.15);
  transition: transform 0.2s ease;
}

.modern-upload-dropzone :deep(.el-upload-dragger:hover) .upload-icon-circle {
  transform: translateY(-2px) scale(1.05);
}

.upload-primary-text {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 8px;
}

.upload-primary-text em {
  color: #4f46e5;
  font-style: normal;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.upload-format-chips {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 10px;
}

.format-chip {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 6px;
  background: #e2e8f0;
  color: #475569;
}

.format-tip {
  font-size: 12px;
  color: #94a3b8;
  margin-left: 4px;
}

/* 底部操作区 */
.upload-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 28px;
}

.modern-submit-btn {
  background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%) !important;
  border: none !important;
  border-radius: 10px !important;
  font-weight: 600 !important;
  padding: 12px 28px !important;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25) !important;
  transition: all 0.2s ease !important;
}

.modern-submit-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(79, 70, 229, 0.35) !important;
}

.modern-ghost-btn {
  border-radius: 10px !important;
  font-weight: 600 !important;
  padding: 12px 24px !important;
  border-color: #cbd5e1 !important;
  color: #334155 !important;
}

.modern-ghost-btn:hover {
  border-color: #4f46e5 !important;
  color: #4f46e5 !important;
}

/* 预览部分 */
.preview-section {
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px solid #f1f5f9;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.status-ready-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  border-radius: 9999px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  font-size: 13px;
  font-weight: 600;
  color: #166534;
}

.dot-green {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #22c55e;
}

.modern-preview-textarea :deep(.el-textarea__inner) {
  background: #f8fafc;
  border-radius: 12px;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.6;
  color: #334155;
  border-color: #e2e8f0;
}
</style>
