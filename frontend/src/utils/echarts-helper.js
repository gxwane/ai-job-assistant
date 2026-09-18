/**
 * ECharts 响应式与生命周期防泄漏辅助库
 */
import { ref, onBeforeUnmount, getCurrentInstance } from 'vue'

export const SCORE_PALETTE = ['#67C23A', '#85CE61', '#E6A23C', '#F56C6C', '#909399']

export const HR_STATUS_PALETTE = {
  '在线': '#67C23A',
  '刚刚活跃': '#85CE61',
  '今日活跃': '#34a853',
  '3日内活跃': '#fbbc04',
  '本周活跃': '#E6A23C',
  '两周内活跃': '#F56C6C',
  '本月活跃': '#ea4335',
  '两月内活跃': '#ea4335',
  '3月内活跃': '#F56C6C',
  '半年前活跃': '#909399',
  '未知': '#c0c4cc',
}

export const FUNNEL_PALETTE = ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#9B59B6']

/**
 * 动态加载 echarts 库
 */
export async function loadECharts() {
  const mod = await import('echarts')
  return mod.default || mod
}

/**
 * 为已初始化的 ECharts 实例绑定响应式窗口 resize，并返回清理函数
 * @param {object} chartInstance - ECharts 实例
 * @returns {Function} 清理函数（解绑 resize 并销毁实例）
 */
export function setupResponsiveChart(chartInstance) {
  if (!chartInstance) return () => {}

  const handleResize = () => {
    if (chartInstance && typeof chartInstance.resize === 'function' && !chartInstance.isDisposed?.()) {
      chartInstance.resize()
    }
  }

  window.addEventListener('resize', handleResize)

  return () => {
    window.removeEventListener('resize', handleResize)
    if (chartInstance && typeof chartInstance.dispose === 'function' && !chartInstance.isDisposed?.()) {
      chartInstance.dispose()
    }
  }
}

/**
 * Vue 3 组合式 API：管理图表响应式与自动卸载
 * @returns {{ chartInstance: Ref<any>, initChart: Function, disposeChart: Function }}
 */
export function useResponsiveChart() {
  const chartInstance = ref(null)
  let cleanupFn = null

  const disposeChart = () => {
    if (cleanupFn) {
      cleanupFn()
      cleanupFn = null
    }
    chartInstance.value = null
  }

  const initChart = async (domElement, option, theme = null) => {
    if (!domElement) return null
    disposeChart()

    const echarts = await loadECharts()
    const instance = echarts.init(domElement, theme)
    if (option) {
      instance.setOption(option)
    }
    chartInstance.value = instance
    cleanupFn = setupResponsiveChart(instance)
    return instance
  }

  if (getCurrentInstance()) {
    onBeforeUnmount(() => {
      disposeChart()
    })
  }

  return {
    chartInstance,
    initChart,
    disposeChart,
  }
}
