import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const STORAGE_KEY = 'analysis_store'

function loadInitialState() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch (e) {
    console.warn('Failed to load analysis store from sessionStorage:', e)
    return null
  }
}

/**
 * 分析流程状态管理
 * 在页面间共享简历和分析数据，并支持 sessionStorage 持久化
 */
export const useAnalysisStore = defineStore('analysis', () => {
  const saved = loadInitialState()

  // 当前上传的简历信息
  const currentResume = ref(saved?.currentResume ?? null)

  // 当前分析结果
  const currentResult = ref(saved?.currentResult ?? null)

  // 岗位信息
  const jobInfo = ref(saved?.jobInfo ?? {
    title: '',
    description: '',
  })

  function persistState() {
    try {
      if (!currentResume.value && !currentResult.value && !jobInfo.value.title && !jobInfo.value.description) {
        sessionStorage.removeItem(STORAGE_KEY)
      } else {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
          currentResume: currentResume.value,
          currentResult: currentResult.value,
          jobInfo: jobInfo.value,
        }))
      }
    } catch (e) {
      console.warn('Failed to persist analysis store to sessionStorage:', e)
    }
  }

  // 深度监听状态变动并持久化
  watch([currentResume, currentResult, jobInfo], persistState, { deep: true })

  /** 设置简历信息 */
  function setResume(resume) {
    currentResume.value = resume
    persistState()
  }

  /** 设置岗位信息 */
  function setJobInfo(title, description) {
    jobInfo.value = { title, description }
    persistState()
  }

  /** 设置分析结果 */
  function setResult(result) {
    currentResult.value = result
    persistState()
  }

  /** 重置全部状态（用于新分析流程） */
  function reset() {
    currentResume.value = null
    currentResult.value = null
    jobInfo.value = { title: '', description: '' }
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch (e) {
      console.warn('Failed to clear analysis store from sessionStorage:', e)
    }
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

