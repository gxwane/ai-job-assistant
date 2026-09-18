import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { ElTag } from 'element-plus'
import HRStatusTag from '../HRStatusTag.vue'

const mountOptions = (options = {}) => ({
  ...options,
  global: {
    components: { ElTag },
    ...(options.global || {}),
  },
})

describe('HRStatusTag.vue', () => {
  it('maps active statuses to success tag type', () => {
    const wrapper = mount(HRStatusTag, mountOptions({
      props: { status: '在线' },
    }))
    expect(wrapper.text()).toBe('在线')
    const tag = wrapper.findComponent(ElTag)
    expect(tag.props('type')).toBe('success')
  })

  it('maps weekly active statuses to warning tag type', () => {
    const wrapper = mount(HRStatusTag, mountOptions({
      props: { status: '本周活跃' },
    }))
    const tag = wrapper.findComponent(ElTag)
    expect(tag.props('type')).toBe('warning')
  })

  it('maps low active statuses to danger tag type', () => {
    const wrapper = mount(HRStatusTag, mountOptions({
      props: { status: '3月内活跃' },
    }))
    const tag = wrapper.findComponent(ElTag)
    expect(tag.props('type')).toBe('danger')
  })

  it('maps inactive statuses to info tag type', () => {
    const wrapper = mount(HRStatusTag, mountOptions({
      props: { status: '半年前活跃' },
    }))
    const tag = wrapper.findComponent(ElTag)
    expect(tag.props('type')).toBe('info')
  })

  it('renders fallback emptyText when status is empty or whitespace', () => {
    const wrapper = mount(HRStatusTag, mountOptions({
      props: { status: '', emptyText: '未知状态' },
    }))
    expect(wrapper.text()).toBe('未知状态')
    expect(wrapper.find('.hr-status-empty').exists()).toBe(true)
  })

  it('forwards custom size and effect', () => {
    const wrapper = mount(HRStatusTag, mountOptions({
      props: { status: '在线', size: 'default', effect: 'light' },
    }))
    const tag = wrapper.findComponent(ElTag)
    expect(tag.props('size')).toBe('default')
    expect(tag.props('effect')).toBe('light')
  })
})
