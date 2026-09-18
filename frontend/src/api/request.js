import axios from 'axios'
import { ElMessage } from 'element-plus'

// 创建 Axios 实例，配置基础地址
const request = axios.create({
  baseURL: '/api',   // Vite 代理到后端 http://127.0.0.1:8000
  timeout: 120000,   // 大模型调用可能较慢，设置 2 分钟超时
})

// 响应拦截器：统一处理错误
request.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const msg = error.response?.data?.detail || error.message || '请求失败'
    ElMessage.error(msg)
    return Promise.reject(error)
  }
)

export default request

// ==================== API 接口函数 ====================

/** 上传简历文件 */
export function uploadResume(file) {
  const formData = new FormData()
  formData.append('file', file)
  return request.post('/resume/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

/** 获取简历列表 */
export function getResumeList(params) {
  return request.get('/resume/list', { params })
}

/** 获取简历详情（预览） */
export function getResumeDetail(id) {
  return request.get(`/resume/${id}`)
}

/** 删除简历 */
export function deleteResume(id) {
  return request.delete(`/resume/${id}`)
}

/** 批量删除简历 */
export function batchDeleteResumes(ids) {
  return request.post('/resume/batch-delete', { ids })
}

/** 分析岗位匹配度 */
export function analyzeJob(data) {
  return request.post('/analysis/analyze', data)
}

/** 获取历史记录列表（分页） */
export function getHistoryList(params = {}) {
  return request.get('/history/list', { params })
}

/** 获取历史记录详情 */
export function getHistoryDetail(id) {
  return request.get(`/history/${id}`)
}

/** 删除单条历史记录 */
export function deleteHistory(id) {
  return request.delete(`/history/${id}`)
}

/** 批量删除历史记录 */
export function batchDeleteHistory(ids) {
  return request.post('/history/batch-delete', { ids })
}

// ==================== 插件岗位记录 ====================

/** 获取岗位记录列表 */
export function getJobRecords(params) {
  return request.get('/job-records', { params })
}

/** 获取岗位记录详情 */
export function getJobRecordDetail(id) {
  return request.get(`/job-records/${id}`)
}

/** 删除单条岗位记录 */
export function deleteJobRecord(id) {
  return request.delete(`/job-records/${id}`)
}

/** 批量删除岗位记录 */
export function batchDeleteJobRecords(ids) {
  return request.post('/job-records/batch-delete', { ids })
}

/** 批量更新岗位状态 */
export function batchUpdateJobStatus(ids, status) {
  return request.post('/job-records/batch-status', { ids, status })
}

/** 标记岗位已沟通 */
export function markJobCommunicated(id) {
  return request.post(`/plugin/job-records/${id}/communicated`)
}

/** 标记岗位已忽略 */
export function markJobIgnored(id) {
  return request.post(`/plugin/job-records/${id}/ignored`)
}

/** 标记岗位已收到面试 */
export function markJobInterview(id) {
  return request.post(`/plugin/job-records/${id}/interview`)
}

/** 获取面试题（已生成的） */
export function getInterviewQuestions(id) {
  return request.get(`/job-records/${id}/interview-questions`)
}

/** 生成面试题（耗时较长，单独设置超时） */
export function generateInterviewQuestions(id) {
  return request.post(`/job-records/${id}/generate-interview-questions`, {}, { timeout: 240000 })
}

// ==================== 数据统计 ====================

export function getStatisticsOverview() {
  return request.get('/statistics/overview')
}

export function getScoreDistribution() {
  return request.get('/statistics/score-distribution')
}

export function getJobFunnel() {
  return request.get('/statistics/job-funnel')
}

export function getRecentRecommended(limit = 10) {
  return request.get('/statistics/recent-recommended', { params: { limit } })
}

export function getHrStatusDistribution() {
  return request.get('/statistics/hr-status-distribution')
}

export function exportPdfReport() {
  return request.get('/statistics/report/pdf', { responseType: 'blob' })
}

// ==================== 系统配置中心 ====================

/** 获取系统大模型配置 */
export function getSettings() {
  return request.get('/settings')
}

/** 更新系统大模型配置 */
export function updateSettings(data) {
  return request.post('/settings', data)
}

/** 一键连通性测试 */
export function testConnection(data) {
  return request.post('/settings/test', data)
}
