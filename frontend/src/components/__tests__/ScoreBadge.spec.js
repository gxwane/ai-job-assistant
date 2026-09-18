import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { ElTag } from 'element-plus'
import ScoreBadge from '../ScoreBadge.vue'

const mountOptions = (options = {}) => ({
  ...options,
  global: {
    components: { ElTag },
    ...(options.global || {}),
  },
})

describe('ScoreBadge.vue', () => {
  it('renders score with default suffix', () => {
    const wrapper = mount(ScoreBadge, mountOptions({
      props: { score: 85 },
    }))
    expect(wrapper.text()).toContain('85 分')
    const tag = wrapper.findComponent(ElTag)
    expect(tag.props('type')).toBe('success')
  })

  it('applies warning type for score between 60 and 79', () => {
    const wrapper = mount(ScoreBadge, mountOptions({
      props: { score: 65 },
    }))
    expect(wrapper.text()).toContain('65 分')
    const tag = wrapper.findComponent(ElTag)
    expect(tag.props('type')).toBe('warning')
  })

  it('applies danger type for score below 60', () => {
    const wrapper = mount(ScoreBadge, mountOptions({
      props: { score: 45 },
    }))
    expect(wrapper.text()).toContain('45 分')
    const tag = wrapper.findComponent(ElTag)
    expect(tag.props('type')).toBe('danger')
  })

  it('handles showSuffix = false', () => {
    const wrapper = mount(ScoreBadge, mountOptions({
      props: { score: 90, showSuffix: false },
    }))
    expect(wrapper.text()).toBe('90')
  })

  it('renders fallback emptyText when score is null, undefined, or invalid', () => {
    const wrapperNull = mount(ScoreBadge, mountOptions({
      props: { score: null, emptyText: '未评估' },
    }))
    expect(wrapperNull.text()).toBe('未评估')
    expect(wrapperNull.find('.score-badge-empty').exists()).toBe(true)

    const wrapperInvalid = mount(ScoreBadge, mountOptions({
      props: { score: 'not-a-number', emptyText: '-' },
    }))
    expect(wrapperInvalid.text()).toBe('-')
  })

  it('forwards custom size and effect props', () => {
    const wrapper = mount(ScoreBadge, mountOptions({
      props: { score: 80, size: 'large', effect: 'plain' },
    }))
    const tag = wrapper.findComponent(ElTag)
    expect(tag.props('size')).toBe('large')
    expect(tag.props('effect')).toBe('plain')
  })
})
