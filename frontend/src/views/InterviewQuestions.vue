<template>
  <div class="interview-page">
    <el-card shadow="hover" class="interview-card" v-loading="loading">
      <template #header>
        <div class="card-header">
          <span class="card-title">
            <el-icon><Reading /></el-icon> 面试高频问答
          </span>
          <el-button size="small" @click="$router.back()">
            <el-icon><Back /></el-icon> 返回
          </el-button>
        </div>
      </template>

      <!-- 岗位信息 -->
      <div class="job-summary">
        <span class="job-title-label">{{ questionsData?.job_title || '--' }}</span>
        <span v-if="questionsData?.company" class="job-company">@ {{ questionsData.company }}</span>
      </div>

      <!-- 未生成状态 -->
      <div v-if="!exists && !loading && !generating" class="empty-state">
        <el-result icon="info" title="面试题尚未生成" sub-title="点击下方按钮，AI将结合简历和岗位JD为您生成30道高频面试题">
          <template #extra>
            <el-button type="primary" @click="handleGenerate" :loading="generating">
              <el-icon><MagicStick /></el-icon> 生成面试题
            </el-button>
          </template>
        </el-result>
      </div>

      <!-- 生成中 -->
      <div v-if="generating" class="generating-state">
        <el-result icon="loading" title="AI正在生成面试题..." sub-title="正在结合简历和岗位JD分析高频考点，预计需要30-60秒">
        </el-result>
      </div>

      <!-- 题目列表 -->
      <template v-if="exists && questionsData?.questions">
        <div class="questions-header">
          <span class="sort-hint">
            <el-icon><InfoFilled /></el-icon>
            试题顺序按面试被问概率由高到低排列，共 {{ questionsData.total }} 题
          </span>
        </div>

        <div class="questions-list">
          <div
            v-for="q in pagedQuestions"
            :key="q.index"
            class="question-card"
          >
            <div class="question-header">
              <span class="question-index">Q{{ q.index }}</span>
              <el-tag
                :type="q.probability === '极高' ? 'danger' : q.probability === '很高' ? 'warning' : 'info'"
                size="small"
                effect="dark"
              >
                {{ q.probability }}
              </el-tag>
              <el-tag type="" size="small" effect="plain">{{ q.category }}</el-tag>
            </div>
            <div class="question-text">{{ q.question }}</div>
            <el-collapse>
              <el-collapse-item title="查看参考答案">
                <div class="answer-content">
                  <p>{{ q.answer }}</p>
                  <div v-if="q.tips && q.tips.length > 0" class="answer-tips">
                    <span class="tips-label">回答要点：</span>
                    <ul>
                      <li v-for="(tip, i) in q.tips" :key="i">{{ tip }}</li>
                    </ul>
                  </div>
                </div>
              </el-collapse-item>
            </el-collapse>
          </div>
        </div>

        <!-- 分页 -->
        <div class="pagination-box">
          <el-pagination
            v-model:current-page="currentPage"
            :page-size="pageSize"
            :total="questionsData.total"
            layout="prev, pager, next"
            background
          />
        </div>
      </template>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getInterviewQuestions, generateInterviewQuestions } from '../api/request'

const route = useRoute()
const recordId = Number(route.params.id)

const loading = ref(true)
const generating = ref(false)
const exists = ref(false)
const questionsData = ref(null)
const currentPage = ref(1)
const pageSize = 15

onMounted(async () => {
  await checkQuestions()
})

function normalizeQuestionsData(raw) {
  if (!raw) return null
  const data = { ...raw }
  if (!data.questions && Array.isArray(data.interview_questions)) {
    data.questions = data.interview_questions.map((item, idx) => ({
      index: idx + 1,
      probability: idx < 3 ? '极高' : idx < 10 ? '很高' : '较高',
      category: '专业技术问答',
      question: item.question,
      answer: item.answer,
      tips: ['结合个人项目经历', '阐述底层实现原理']
    }))
    data.total = data.questions.length
  }
  return data
}

async function checkQuestions() {
  loading.value = true
  try {
    const res = await getInterviewQuestions(recordId)
    if (res.exists) {
      exists.value = true
      questionsData.value = normalizeQuestionsData(res.data)
    } else {
      exists.value = false
    }
  } catch {
    ElMessage.error('加载面试题失败')
  } finally {
    loading.value = false
  }
}

async function handleGenerate() {
  generating.value = true
  try {
    const res = await generateInterviewQuestions(recordId)
    if (res.exists) {
      exists.value = true
      questionsData.value = normalizeQuestionsData(res.data)
      ElMessage.success(res.cached ? '已加载缓存的面试题' : '面试题生成成功')
    }
  } catch {
    // 错误已在拦截器处理
  } finally {
    generating.value = false
  }
}

const pagedQuestions = computed(() => {
  if (!questionsData.value?.questions) return []
  const start = (currentPage.value - 1) * pageSize
  return questionsData.value.questions.slice(start, start + pageSize)
})
</script>

<style scoped>
.interview-page {
  padding: 10px 0;
}

.interview-card {
  max-width: 900px;
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

.job-summary {
  padding: 12px 16px;
  background: #f8f9ff;
  border-radius: 8px;
  margin-bottom: 20px;
}

.job-title-label {
  font-size: 17px;
  font-weight: 600;
  color: #333;
}

.job-company {
  font-size: 14px;
  color: #909399;
  margin-left: 10px;
}

.empty-state,
.generating-state {
  padding: 60px 0;
}

.questions-header {
  margin-bottom: 16px;
}

.sort-hint {
  font-size: 13px;
  color: #909399;
  display: flex;
  align-items: center;
  gap: 4px;
}

.question-card {
  padding: 16px 0;
  border-bottom: 1px solid #ebeef5;
}

.question-card:last-child {
  border-bottom: none;
}

.question-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.question-index {
  font-size: 15px;
  font-weight: 700;
  color: #409EFF;
  min-width: 32px;
}

.question-text {
  font-size: 15px;
  color: #333;
  line-height: 1.6;
  margin-bottom: 8px;
  font-weight: 500;
}

.answer-content {
  padding: 12px 16px;
  background: #f8f9ff;
  border-radius: 8px;
}

.answer-content p {
  font-size: 14px;
  line-height: 1.8;
  color: #555;
  margin: 0;
}

.answer-tips {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed #d9ecff;
}

.tips-label {
  font-size: 13px;
  font-weight: 600;
  color: #E6A23C;
}

.answer-tips ul {
  margin: 6px 0 0 0;
  padding-left: 20px;
}

.answer-tips li {
  font-size: 13px;
  color: #666;
  line-height: 1.7;
}

.pagination-box {
  display: flex;
  justify-content: center;
  padding: 24px 0 8px;
}
</style>
