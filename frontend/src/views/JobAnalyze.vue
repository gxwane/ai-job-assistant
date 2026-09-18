<template>
  <!-- 岗位分析页 -->
  <div class="analyze-page">
    <el-steps :active="currentStep" align-center class="steps">
      <el-step title="上传简历" />
      <el-step title="岗位分析" />
      <el-step title="查看结果" />
    </el-steps>

    <el-card class="analyze-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span class="card-title">
            <el-icon><Document /></el-icon> 岗位信息
          </span>
        </div>
      </template>

      <el-form :model="form" :rules="rules" ref="formRef" label-position="top">
        <!-- 岗位名称 -->
        <el-form-item label="岗位名称" prop="jobTitle">
          <el-input
            v-model="form.jobTitle"
            placeholder="例如：AI应用开发工程师"
            size="large"
            clearable
          />
        </el-form-item>

        <!-- 岗位 JD -->
        <el-form-item label="岗位描述 (JD)" prop="jobDescription">
          <el-input
            v-model="form.jobDescription"
            type="textarea"
            :rows="12"
            placeholder="请粘贴完整的岗位 JD 文本，内容越详细分析越准确..."
            resize="vertical"
          />
        </el-form-item>

        <!-- 已上传简历提示 -->
        <el-alert
          v-if="store.currentResume"
          type="info"
          :closable="false"
          show-icon
        >
          <template #title>
            当前分析简历：{{ store.currentResume.filename }}
          </template>
        </el-alert>

        <!-- 提交按钮 -->
        <el-form-item class="form-actions">
          <el-button size="large" @click="$router.push('/upload')">
            <el-icon><ArrowLeft /></el-icon> 返回上传
          </el-button>
          <el-button
            type="primary"
            size="large"
            :loading="analyzing"
            @click="handleAnalyze"
          >
            <el-icon v-if="!analyzing"><Cpu /></el-icon>
            {{ analyzing ? 'AI 分析中，请稍候...' : '开始分析' }}
          </el-button>
        </el-form-item>
      </el-form>

      <!-- 分析中的 loading 效果 -->
      <div v-if="analyzing" class="analyzing-overlay">
        <el-result icon="loading">
          <template #title>
            <el-text tag="p" size="large">AI 正在分析简历与岗位的匹配度...</el-text>
          </template>
          <template #sub>
            <el-text tag="p" type="info">这可能需要 10-30 秒，请耐心等待</el-text>
          </template>
        </el-result>
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
  padding: 10px 0;
}

.steps {
  margin-bottom: 30px;
}

.analyze-card {
  max-width: 750px;
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

.form-actions {
  margin-top: 24px;
}

.form-actions .el-form-item__content {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.analyzing-overlay {
  padding: 40px 0;
}
</style>
