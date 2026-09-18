import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ElementPlus from 'element-plus'
import SettingsModal from '../SettingsModal.vue'

// Mock request.js API
vi.mock('../../api/request', () => ({
  getSettings: vi.fn().mockResolvedValue({
    provider: 'deepseek',
    base_url: 'https://api.deepseek.com',
    model: 'deepseek-chat',
    masked_api_key: 'sk-1****cdef',
    has_api_key: true,
    active_mock_mode: false,
    is_mock_mode: null,
  }),
  updateSettings: vi.fn().mockResolvedValue({
    provider: 'siliconflow',
    base_url: 'https://api.siliconflow.cn/v1',
    model: 'deepseek-ai/DeepSeek-V3',
    masked_api_key: 'sk-1****cdef',
    has_api_key: true,
    active_mock_mode: false,
  }),
  testConnection: vi.fn().mockResolvedValue({
    success: true,
    latency_ms: 250,
    message: '连接成功！服务正常响应 (耗时 250ms)',
    model_used: 'deepseek-chat',
    status_code: 200,
  }),
}))

describe('SettingsModal.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders modal when visible is true', async () => {
    const wrapper = mount(SettingsModal, {
      props: {
        visible: true,
      },
      global: {
        plugins: [ElementPlus],
      },
    })

    await nextTick()
    expect(wrapper.findComponent({ name: 'ElDialog' }).exists()).toBe(true)
    expect(wrapper.props('visible')).toBe(true)
    wrapper.unmount()
  })

  it('handles visible prop change to false', async () => {
    const wrapper = mount(SettingsModal, {
      props: {
        visible: false,
      },
      global: {
        plugins: [ElementPlus],
      },
    })

    expect(wrapper.props('visible')).toBe(false)
    wrapper.unmount()
  })
})
