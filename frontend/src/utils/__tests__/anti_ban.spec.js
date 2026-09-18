/**
 * Red tests for Anti-Ban & Risk Circuit Breaker algorithms.
 * Run with: npm test
 */
import { describe, it, expect } from 'vitest'
import {
  calculateHumanJitterDelay,
  getTodayDateString,
  isDailyLimitReached,
  detectRiskText,
} from '../anti-ban'

describe('Anti-Ban & Risk Circuit Breaker Algorithms', () => {

  // ── 1. Human-like Gaussian Jitter Delay ─────────────────────────────────────
  describe('calculateHumanJitterDelay', () => {
    it('always clamps delay between minSec and maxSec', () => {
      // Test extreme random inputs
      const min = 15
      const max = 45

      // Force extreme values
      const lowResult = calculateHumanJitterDelay(min, max, () => [0.0001, 0.0001])
      const highResult = calculateHumanJitterDelay(min, max, () => [0.9999, 0.9999])
      const midResult = calculateHumanJitterDelay(min, max, () => [0.5, 0.5])

      expect(lowResult).toBeGreaterThanOrEqual(min)
      expect(lowResult).toBeLessThanOrEqual(max)

      expect(highResult).toBeGreaterThanOrEqual(min)
      expect(highResult).toBeLessThanOrEqual(max)

      expect(midResult).toBeGreaterThanOrEqual(min)
      expect(midResult).toBeLessThanOrEqual(max)
    })

    it('generates expected mean near ~28-30s on standard uniform input (0.5, 0.25)', () => {
      const delay = calculateHumanJitterDelay(15, 45, () => [0.5, 0.25])
      // In Box-Muller, (0.5, 0.25) gives cos(pi/2) = 0, so delay equals mean = 30
      expect(delay).toBe(30)
    })
  })

  // ── 2. Daily Quota Enforcement ──────────────────────────────────────────────
  describe('Daily Quota Logic', () => {
    it('formats today key correctly as YYYY-MM-DD', () => {
      const testDate = new Date(2026, 8, 18) // 2026-09-18
      expect(getTodayDateString(testDate)).toBe('2026-09-18')
    })

    it('allows communication when below limit', () => {
      expect(isDailyLimitReached(19, 20)).toBe(false)
      expect(isDailyLimitReached(0, 20)).toBe(false)
    })

    it('blocks communication when limit is reached or exceeded', () => {
      expect(isDailyLimitReached(20, 20)).toBe(true)
      expect(isDailyLimitReached(25, 20)).toBe(true)
    })
  })

  // ── 3. Risk / CAPTCHA Detection ─────────────────────────────────────────────
  describe('detectRiskText', () => {
    it('detects geetest slider keywords', () => {
      expect(detectRiskText('请完成下方滑块验证')).toBe(true)
      expect(detectRiskText('geetest_holder active')).toBe(true)
    })

    it('detects platform frequency limit warnings', () => {
      expect(detectRiskText('您的操作过于频繁，请稍后再试')).toBe(true)
      expect(detectRiskText('系统检测到异常请求，已暂停服务')).toBe(true)
      expect(detectRiskText('请进行安全验证')).toBe(true)
    })

    it('ignores normal job details text', () => {
      expect(detectRiskText('精通 Vue 3 开发，熟悉前端工程化与性能优化')).toBe(false)
      expect(detectRiskText('岗位职责：负责公司中后台系统的核心模块研发')).toBe(false)
    })
  })
})
