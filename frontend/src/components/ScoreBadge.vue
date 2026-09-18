<template>
  <el-tag
    v-if="hasScore"
    :type="tagType"
    :effect="effect"
    :size="size"
    class="score-badge"
  >
    {{ numericScore }}{{ showSuffix ? ' 分' : '' }}
  </el-tag>
  <span v-else class="score-badge-empty">{{ emptyText }}</span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  score: {
    type: [Number, String],
    default: null,
  },
  size: {
    type: String,
    default: 'default',
  },
  effect: {
    type: String,
    default: 'dark',
  },
  emptyText: {
    type: String,
    default: '未分析',
  },
  showSuffix: {
    type: Boolean,
    default: true,
  },
})

const numericScore = computed(() => {
  if (props.score === null || props.score === undefined || props.score === '') {
    return null
  }
  const n = Number(props.score)
  return isNaN(n) ? null : n
})

const hasScore = computed(() => numericScore.value !== null)

const tagType = computed(() => {
  const s = numericScore.value
  if (s === null) return 'info'
  if (s >= 80) return 'success'
  if (s >= 60) return 'warning'
  return 'danger'
})
</script>

<style scoped>
.score-badge {
  font-weight: 600;
}
.score-badge-empty {
  color: #909399;
  font-size: 12px;
}
</style>
