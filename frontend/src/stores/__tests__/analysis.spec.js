/**
 * RED tests for analysis store sessionStorage persistence.
 * These tests MUST fail before the production code is written (Gate 4 Red phase).
 * Run with: npx vitest run src/stores/__tests__/analysis.spec.js
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAnalysisStore } from '../analysis'

const STORAGE_KEY = 'analysis_store'

// ── sessionStorage mock ─────────────────────────────────────────────────────
// happy-dom provides a real sessionStorage implementation, so we can use it
// directly. We just need to clear it between tests.

describe('useAnalysisStore – sessionStorage persistence', () => {
  beforeEach(() => {
    sessionStorage.clear()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    sessionStorage.clear()
  })

  // ── Happy Path ─────────────────────────────────────────────────────────────

  it('HP-1: setResume() writes currentResume into sessionStorage', async () => {
    const store = useAnalysisStore()
    const resume = { id: 1, name: 'my-cv.pdf', size: 12345 }

    store.setResume(resume)

    // Allow the watcher to flush
    await vi.waitFor(() => {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      expect(raw).not.toBeNull()
    })

    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY))
    expect(saved.currentResume).toEqual(resume)
  })

  it('HP-2: store hydrates currentResume from sessionStorage on init', () => {
    const resume = { id: 2, name: 'resume.docx' }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      currentResume: resume,
      currentResult: null,
      jobInfo: { title: '', description: '' },
    }))

    setActivePinia(createPinia())
    const store = useAnalysisStore()

    expect(store.currentResume).toEqual(resume)
  })

  it('HP-3: setResult() persists and survives re-initialisation', async () => {
    const store = useAnalysisStore()
    const result = { match_score: 85, score_level: '高度匹配' }

    store.setResult(result)

    await vi.waitFor(() => {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      expect(raw).not.toBeNull()
    })

    // Simulate F5: create a fresh pinia and re-init store
    setActivePinia(createPinia())
    const freshStore = useAnalysisStore()
    expect(freshStore.currentResult).toEqual(result)
  })

  it('HP-4: setJobInfo() persists title and description', async () => {
    const store = useAnalysisStore()
    store.setJobInfo('前端工程师', '要求 Vue 3 开发经验')

    await vi.waitFor(() => {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      expect(raw).not.toBeNull()
    })

    setActivePinia(createPinia())
    const freshStore = useAnalysisStore()
    expect(freshStore.jobInfo).toEqual({ title: '前端工程师', description: '要求 Vue 3 开发经验' })
  })

  // ── Edge Cases ─────────────────────────────────────────────────────────────

  it('EC-1: reset() clears sessionStorage entry', async () => {
    const store = useAnalysisStore()
    store.setResume({ id: 1, name: 'cv.pdf' })

    await vi.waitFor(() => {
      expect(sessionStorage.getItem(STORAGE_KEY)).not.toBeNull()
    })

    store.reset()

    await vi.waitFor(() => {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      // Either key is gone, or all values are null/default
      if (raw === null) return
      const saved = JSON.parse(raw)
      expect(saved.currentResume).toBeNull()
    })
  })

  it('EC-2: corrupt sessionStorage JSON is silently discarded on init', () => {
    sessionStorage.setItem(STORAGE_KEY, '{{broken_json')

    // Must NOT throw
    expect(() => {
      setActivePinia(createPinia())
      useAnalysisStore()
    }).not.toThrow()

    setActivePinia(createPinia())
    const store = useAnalysisStore()
    expect(store.currentResume).toBeNull()
  })

  it('EC-3: null currentResume hydrates as null (not undefined or "null" string)', () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      currentResume: null,
      currentResult: null,
      jobInfo: { title: '', description: '' },
    }))

    setActivePinia(createPinia())
    const store = useAnalysisStore()
    expect(store.currentResume).toBeNull()
    expect(store.currentResume).not.toBeUndefined()
  })

  it('EC-4: missing sessionStorage key starts store at default state', () => {
    // sessionStorage is already clear from beforeEach
    const store = useAnalysisStore()
    expect(store.currentResume).toBeNull()
    expect(store.currentResult).toBeNull()
    expect(store.jobInfo).toEqual({ title: '', description: '' })
  })
})
