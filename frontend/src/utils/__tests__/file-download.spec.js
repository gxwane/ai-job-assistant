import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { downloadBlob, downloadUrl } from '../file-download'

describe('file-download utility', () => {
  let createdUrl = 'blob:http://localhost/dummy-id'
  let clickSpy
  let appendChildSpy
  let removeChildSpy

  beforeEach(() => {
    vi.useFakeTimers()
    window.URL.createObjectURL = vi.fn(() => createdUrl)
    window.URL.revokeObjectURL = vi.fn()
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    appendChildSpy = vi.spyOn(document.body, 'appendChild')
    removeChildSpy = vi.spyOn(document.body, 'removeChild')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('downloadBlob throws when no data provided', () => {
    expect(() => downloadBlob(null)).toThrow('No data provided for download')
  })

  it('downloadBlob creates anchor, sets download name, triggers click, and cleans up URL', () => {
    const testBlob = new Blob(['test content'], { type: 'application/pdf' })
    downloadBlob(testBlob, 'report.pdf')

    expect(window.URL.createObjectURL).toHaveBeenCalledWith(testBlob)
    expect(appendChildSpy).toHaveBeenCalled()
    expect(clickSpy).toHaveBeenCalled()

    vi.advanceTimersByTime(150)
    expect(removeChildSpy).toHaveBeenCalled()
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith(createdUrl)
  })

  it('downloadUrl throws when URL is missing', () => {
    expect(() => downloadUrl('')).toThrow('URL is required for download')
  })

  it('downloadUrl creates anchor with specified filename and clicks it', () => {
    downloadUrl('https://example.com/resume.docx', 'my_resume.docx')
    expect(appendChildSpy).toHaveBeenCalled()
    expect(clickSpy).toHaveBeenCalled()

    vi.advanceTimersByTime(150)
    expect(removeChildSpy).toHaveBeenCalled()
  })
})
