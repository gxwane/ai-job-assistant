<template>
  <!-- 岗位分析页 -->
  <div class="analyze-page">
    <!-- 流程指示器胶囊 -->
    <div class="stepper-capsule">
      <el-steps :active="currentStep" align-center class="modern-steps">
        <el-step title="上传简历" />
        <el-step title="岗位分析" />
        <el-step title="深度画像与报告" />
      </el-steps>
    </div>

    <el-card class="analyze-card modern-card" shadow="never">
      <template #header>
        <div class="card-header">
          <div class="header-title-box">
            <div class="header-icon-box">
              <el-icon :size="18"><Document /></el-icon>
            </div>
            <div>
              <div class="card-title">录入目标岗位需求 (JD)</div>
              <div class="card-subtitle">粘贴招聘要求，AI 引擎将结合当前简历进行多维胜任力打分与诊断</div>
            </div>
          </div>
        </div>
      </template>

      <!-- 已关联简历指示芯片 -->
      <div v-if="store.currentResume" class="active-resume-chip">
        <div class="chip-left">
          <span class="active-pulse-dot"></span>
          <div class="chip-icon">
            <el-icon :size="16"><Document /></el-icon>
          </div>
          <div class="chip-info">
            <span class="chip-label">关联比对简历：</span>
            <strong class="chip-filename">{{ store.currentResume.filename }}</strong>
          </div>
        </div>
        <el-button link type="primary" size="small" class="change-resume-btn" @click="$router.push('/upload')">
          更换简历
        </el-button>
      </div>

      <el-form :model="form" :rules="rules" ref="formRef" label-position="top" class="modern-form">
        <!-- 岗位名称 -->
        <el-form-item label="目标岗位名称" prop="jobTitle">
          <el-input
            v-model="form.jobTitle"
            placeholder="例如：AI应用开发工程师 / 资深全栈工程师"
            size="large"
            clearable
            class="modern-input"
          />
        </el-form-item>

        <!-- 岗位 JD -->
        <el-form-item label="岗位详细职责与任职要求 (JD)" prop="jobDescription">
          <el-input
            v-model="form.jobDescription"
            type="textarea"
            :rows="12"
            placeholder="请粘贴完整的岗位 JD 文本（包括职责描述、任职资格、技术栈要求），内容越详细，多维匹配打分越精准..."
            resize="vertical"
            class="modern-textarea"
          />
        </el-form-item>

        <!-- 提交按钮 -->
        <div class="form-actions-row">
          <el-button size="large" class="modern-ghost-btn" @click="$router.push('/upload')">
            <el-icon><ArrowLeft /></el-icon> 返回修改简历
          </el-button>
          <el-button
            type="primary"
            size="large"
            class="modern-submit-btn"
            :loading="analyzing"
            @click="handleAnalyze"
          >
            <el-icon v-if="!analyzing"><Cpu /></el-icon>
            {{ analyzing ? 'AI 深度画像中，请稍候...' : '开始智能匹配分析' }}
          </el-button>
        </div>
      </el-form>

      <!-- 分析中的 loading 动效遮罩 -->
      <div v-if="analyzing" class="analyzing-overlay">
        <div class="loading-box">
          <div class="loading-pulse-ring"></div>
          <el-icon class="is-loading loading-spin-icon" :size="36"><Loading /></el-icon>
          <h4 class="loading-title">AI 大模型正在多维深度比对...</h4>
          <p class="loading-sub">正在评估技术栈匹配度、工程落地能力、年限硬伤与胜任力雷达，耗时约 5~15 秒</p>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAnalysisStore } from '../stores/analysis'
import { analyzeJob } from '../api/request'

const router = useRouter()
const store = useAnalysisStore()

const formRef = ref(null)
const analyzing = ref(false)
const currentStep = ref(1)

// 如果没有简历，跳回上传页
if (!store.currentResume) {
  router.replace('/upload')
}

const form = reactive({
  jobTitle: '',
  jobDescription: '',
})

const rules = {
  jobTitle: [{ required: true, message: '请输入岗位名称', trigger: 'blur' }],
  jobDescription: [{ required: true, message: '请输入岗位描述', trigger: 'blur' }],
}

/** 开始分析 */
async function handleAnalyze() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  analyzing.value = true
  try {
    const result = await analyzeJob({
      resume_id: store.currentResume.resume_id,
      job_title: form.jobTitle,
      job_description: form.jobDescription,
    })
    store.setResult(result)
    store.setJobInfo(form.jobTitle, form.jobDescription)
    currentStep.value = 2
    router.push(`/result/${result.id}`)
  } catch {
    // 错误已在拦截器中处理
  } finally {
    analyzing.value = false
  }
}
</script>

<style scoped>
.analyze-page {
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

.analyze-card {
  max-width: 780px;
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

/* 活跃简历指示芯片 */
.active-resume-chip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 10px 16px;
  margin-bottom: 24px;
}

.chip-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.active-pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
}

.chip-icon {
  color: #4f46e5;
}

.chip-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.chip-label {
  color: #64748b;
}

.chip-filename {
  color: #0f172a;
  font-weight: 600;
}

.change-resume-btn {
  font-size: 13px;
  font-weight: 500;
}

/* 表单输入与文本域 */
.modern-form :deep(.el-form-item__label) {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 6px;
}

.modern-input :deep(.el-input__wrapper) {
  border-radius: 10px;
  padding: 4px 14px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  border: 1px solid #cbd5e1;
  transition: all 0.2s ease;
}

.modern-input :deep(.el-input__wrapper:hover),
.modern-input :deep(.el-input__wrapper.is-focus) {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}

.modern-textarea :deep(.el-textarea__inner) {
  border-radius: 12px;
  padding: 12px 16px;
  border: 1px solid #cbd5e1;
  font-family: inherit;
  font-size: 13.5px;
  line-height: 1.6;
  transition: all 0.2s ease;
}

.modern-textarea :deep(.el-textarea__inner:hover),
.modern-textarea :deep(.el-textarea__inner:focus) {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}

/* 按钮行 */
.form-actions-row {
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

/* loading 遮罩 */
.analyzing-overlay {
  padding: 50px 20px;
  text-align: center;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 14px;
}

.loading-box {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.loading-spin-icon {
  color: #4f46e5;
  margin-bottom: 16px;
}

.loading-title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 8px;
}

.loading-sub {
  font-size: 13px;
  color: #64748b;
  max-width: 480px;
}
</style>
