import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  SCORE_PALETTE,
  HR_STATUS_PALETTE,
  FUNNEL_PALETTE,
  setupResponsiveChart,
} from '../echarts-helper'

describe('echarts-helper utility', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('exports valid color palettes', () => {
    expect(SCORE_PALETTE).toHaveLength(5)
    expect(FUNNEL_PALETTE).toHaveLength(5)
    expect(HR_STATUS_PALETTE['在线']).toBe('#67C23A')
    expect(HR_STATUS_PALETTE['未知']).toBe('#c0c4cc')
  })

  it('setupResponsiveChart handles null chart gracefully', () => {
    const cleanup = setupResponsiveChart(null)
    expect(typeof cleanup).toBe('function')
    expect(() => cleanup()).not.toThrow()
  })

  it('setupResponsiveChart binds window resize listener and disposes on cleanup', () => {
    const mockChart = {
      resize: vi.fn(),
      dispose: vi.fn(),
      isDisposed: vi.fn(() => false),
    }

    const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

    const cleanup = setupResponsiveChart(mockChart)
    expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function))

    // Trigger resize
    window.dispatchEvent(new Event('resize'))
    expect(mockChart.resize).toHaveBeenCalled()

    // Run cleanup
    cleanup()
    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    expect(mockChart.dispose).toHaveBeenCalled()
  })
})
