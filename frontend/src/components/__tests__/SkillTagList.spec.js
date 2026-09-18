import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { ElTag } from 'element-plus'
import SkillTagList from '../SkillTagList.vue'

const mountOptions = (options = {}) => ({
  ...options,
  global: {
    components: { ElTag },
    ...(options.global || {}),
  },
})

describe('SkillTagList.vue', () => {
  it('renders list of skill tags', () => {
    const wrapper = mount(SkillTagList, mountOptions({
      props: {
        items: ['Vue3', 'Python', 'FastAPI'],
        type: 'success',
      },
    }))
    const tags = wrapper.findAllComponents(ElTag)
    expect(tags).toHaveLength(3)
    expect(tags[0].text()).toBe('Vue3')
    expect(tags[1].text()).toBe('Python')
    expect(tags[2].text()).toBe('FastAPI')
  })

  it('filters empty or blank items', () => {
    const wrapper = mount(SkillTagList, mountOptions({
      props: {
        items: ['Vue3', '', null, '   ', 'TypeScript'],
      },
    }))
    const tags = wrapper.findAllComponents(ElTag)
    expect(tags).toHaveLength(2)
    expect(tags[0].text()).toBe('Vue3')
    expect(tags[1].text()).toBe('TypeScript')
  })

  it('renders fallback emptyText when no valid items exist', () => {
    const wrapper = mount(SkillTagList, mountOptions({
      props: {
        items: [],
        emptyText: '暂无相关技能',
      },
    }))
    expect(wrapper.text()).toBe('暂无相关技能')
    expect(wrapper.find('.skill-tag-empty').exists()).toBe(true)
  })

  it('forwards custom type, effect, and size to all child tags', () => {
    const wrapper = mount(SkillTagList, mountOptions({
      props: {
        items: ['Docker'],
        type: 'danger',
        effect: 'dark',
        size: 'small',
      },
    }))
    const tag = wrapper.findComponent(ElTag)
    expect(tag.props('type')).toBe('danger')
    expect(tag.props('effect')).toBe('dark')
    expect(tag.props('size')).toBe('small')
  })
})
