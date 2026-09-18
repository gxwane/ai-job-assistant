<template>
  <el-tag
    v-if="hasStatus"
    :type="tagType"
    :effect="effect"
    :size="size"
    class="hr-status-tag"
  >
    {{ status }}
  </el-tag>
  <span v-else class="hr-status-empty">{{ emptyText }}</span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: {
    type: String,
    default: '',
  },
  size: {
    type: String,
    default: 'small',
  },
  effect: {
    type: String,
    default: 'dark',
  },
  emptyText: {
    type: String,
    default: '未知',
  },
})

const hasStatus = computed(() => Boolean(props.status && props.status.trim()))

const STATUS_TYPE_MAP = {
  '在线': 'success',
  '刚刚活跃': 'success',
  '今日活跃': 'success',
  '3日内活跃': 'warning',
  '本周活跃': 'warning',
  '两周内活跃': 'danger',
  '本月活跃': 'danger',
  '两月内活跃': 'danger',
  '3月内活跃': 'danger',
  '半年前活跃': 'info',
  '未知': 'info',
}

const tagType = computed(() => {
  if (!props.status) return 'info'
  return STATUS_TYPE_MAP[props.status.trim()] || 'info'
})
</script>

<style scoped>
.hr-status-tag {
  font-weight: 500;
}
.hr-status-empty {
  color: #909399;
  font-size: 12px;
}
</style>
