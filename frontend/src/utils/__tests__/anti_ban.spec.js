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

  // ── 4. User-Configurable Anti-Ban Bounds & Preset Guardrails ──────────────────
  describe('User-Configurable Anti-Ban Bounds & Presets', () => {
    it('clamps aggressive configurations to hard safety bounds', async () => {
      const { clampScanConfig } = await import('../../../../extension/src/store/state.js')
      const { SAFETY_BOUNDS } = await import('../../../../extension/src/config.js')

      const aggressive = {
        minDelay: 0,
        maxDelay: 2,
        dailyLimit: 999,
        maxScanCount: 1000,
        maxAutoCommunicateCount: 500,
        threshold: 120,
      }

      const clamped = clampScanConfig(aggressive)

      expect(clamped.minDelay).toBeGreaterThanOrEqual(SAFETY_BOUNDS.minDelayFloor)
      expect(clamped.maxDelay).toBeGreaterThanOrEqual(SAFETY_BOUNDS.maxDelayFloor)
      expect(clamped.maxDelay).toBeGreaterThanOrEqual(clamped.minDelay)
      expect(clamped.dailyLimit).toBeLessThanOrEqual(SAFETY_BOUNDS.dailyLimitCeiling)
      expect(clamped.maxScanCount).toBeLessThanOrEqual(SAFETY_BOUNDS.maxScanCeiling)
      expect(clamped.maxAutoCommunicateCount).toBeLessThanOrEqual(SAFETY_BOUNDS.maxCommCeiling)
      expect(clamped.threshold).toBe(100)
    })

    it('preserves valid custom configurations within safety bounds', async () => {
      const { clampScanConfig } = await import('../../../../extension/src/store/state.js')

      const validConfig = {
        presetMode: 'custom',
        minDelay: 15,
        maxDelay: 35,
        dailyLimit: 20,
        maxScanCount: 25,
        maxAutoCommunicateCount: 4,
        threshold: 82,
        autoCommunicate: true,
        hrRequirement: '3days',
      }

      const clamped = clampScanConfig(validConfig)

      expect(clamped.presetMode).toBe('custom')
      expect(clamped.minDelay).toBe(15)
      expect(clamped.maxDelay).toBe(35)
      expect(clamped.dailyLimit).toBe(20)
      expect(clamped.maxScanCount).toBe(25)
      expect(clamped.maxAutoCommunicateCount).toBe(4)
      expect(clamped.threshold).toBe(82)
      expect(clamped.autoCommunicate).toBe(true)
      expect(clamped.hrRequirement).toBe('3days')
      expect(clamped.hrStatusAllowed).toContain('3日内活跃')
    })

    it('verifies that all presets satisfy safety bounds', async () => {
      const { PRESET_PROFILES, SAFETY_BOUNDS } = await import('../../../../extension/src/config.js')

      for (const [key, profile] of Object.entries(PRESET_PROFILES)) {
        if (key === 'custom') continue
        expect(profile.minDelay).toBeGreaterThanOrEqual(SAFETY_BOUNDS.minDelayFloor)
        expect(profile.maxDelay).toBeGreaterThanOrEqual(SAFETY_BOUNDS.maxDelayFloor)
        expect(profile.maxDelay).toBeGreaterThan(profile.minDelay)
        expect(profile.dailyLimit).toBeLessThanOrEqual(SAFETY_BOUNDS.dailyLimitCeiling)
        expect(profile.maxScanCount).toBeLessThanOrEqual(SAFETY_BOUNDS.maxScanCeiling)
        expect(profile.maxAutoCommunicateCount).toBeLessThanOrEqual(SAFETY_BOUNDS.maxCommCeiling)
      }

      // Fast profile must disable auto-communication for speed screening
      expect(PRESET_PROFILES.fast.maxAutoCommunicateCount).toBe(0)
      expect(PRESET_PROFILES.fast.dailyLimit).toBe(0)

      // Safe profile must have conservative delay and dailyLimit
      expect(PRESET_PROFILES.safe.minDelay).toBeGreaterThanOrEqual(20)
      expect(PRESET_PROFILES.safe.dailyLimit).toBeLessThanOrEqual(15)
    })
  })
})
