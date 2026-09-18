/**
 * Anti-Ban & Risk Protection Utilities
 * Provides human-like Gaussian jitter delays, daily communication quotas,
 * and automated platform risk / CAPTCHA circuit breakers.
 */

/**
 * Calculates a human-like delay with Gaussian (normal) distribution.
 * Uses Box-Muller transform centered around the midpoint of [minSec, maxSec].
 *
 * @param {number} minSec - Minimum delay in seconds (e.g. 15)
 * @param {number} maxSec - Maximum delay in seconds (e.g. 45)
 * @param {function} [randomPairFn] - Optional deterministic random pair generator for unit testing
 * @returns {number} Delay in seconds clamped to [minSec, maxSec]
 */
export function calculateHumanJitterDelay(minSec = 15, maxSec = 45, randomPairFn = null) {
  const [u1, u2] = randomPairFn ? randomPairFn() : [Math.random(), Math.random()]
  
  // Guard against u1 === 0 which causes log(0) -> -Infinity
  const safeU1 = Math.max(u1, 1e-7)
  
  // Standard Box-Muller transform: produces standard normal N(0, 1)
  const z0 = Math.sqrt(-2.0 * Math.log(safeU1)) * Math.cos(2.0 * Math.PI * u2)
  
  // Center mean at midpoint, with 3-sigma covering [minSec, maxSec]
  const mean = (minSec + maxSec) / 2.0
  const stdDev = (maxSec - minSec) / 6.0
  
  const rawDelay = Math.round(mean + z0 * stdDev)
  return Math.max(minSec, Math.min(maxSec, rawDelay))
}

/**
 * Formats a Date object into a YYYY-MM-DD string for daily quota tracking.
 *
 * @param {Date} [date] - Date object, defaults to now
 * @returns {string} e.g. "2026-09-18"
 */
export function getTodayDateString(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Checks if the daily auto-communication quota has been reached.
 *
 * @param {number} currentCount - Current communications executed today
 * @param {number} [limit=20] - Maximum allowed daily communications
 * @returns {boolean} True if limit is reached or exceeded
 */
export function isDailyLimitReached(currentCount, limit = 20) {
  return currentCount >= limit
}

/**
 * Risk detection keyword patterns.
 */
const RISK_PATTERNS = [
  /geetest/i,
  /滑块验证/,
  /验证码/,
  /操作过于频繁/,
  /操作频繁/,
  /系统检测到异常/,
  /安全验证/,
  /安全校验/,
  /访问过于频繁/,
]

/**
 * Scans text content for risk warnings or verification triggers.
 *
 * @param {string} text - The raw text content or HTML string to scan
 * @returns {boolean} True if any risk marker is detected
 */
export function detectRiskText(text) {
  if (!text || typeof text !== 'string') return false
  return RISK_PATTERNS.some((pattern) => pattern.test(text))
}
