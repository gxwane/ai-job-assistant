import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * 分析流程状态管理
 * 在页面间共享简历和分析数据
 */
export const useAnalysisStore = defineStore('analysis', () => {
  // 当前上传的简历信息
  const currentResume = ref(null)

  // 当前分析结果
  const currentResult = ref(null)

  // 岗位信息
  const jobInfo = ref({
    title: '',
    description: '',
  })

  /** 设置简历信息 */
  function setResume(resume) {
    currentResume.value = resume
  }

  /** 设置岗位信息 */
  function setJobInfo(title, description) {
    jobInfo.value = { title, description }
  }

  /** 设置分析结果 */
  function setResult(result) {
    currentResult.value = result
  }

  /** 重置全部状态（用于新分析流程） */
  function reset() {
    currentResume.value = null
    currentResult.value = null
    jobInfo.value = { title: '', description: '' }
  }

  return {
    currentResume,
    currentResult,
    jobInfo,
    setResume,
    setJobInfo,
    setResult,
    reset,
  }
})
