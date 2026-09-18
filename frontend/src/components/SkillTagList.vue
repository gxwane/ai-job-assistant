<template>
  <div v-if="validItems.length > 0" class="skill-tag-list">
    <el-tag
      v-for="(item, index) in validItems"
      :key="index"
      :type="type"
      :effect="effect"
      :size="size"
      class="skill-tag-item"
    >
      {{ item }}
    </el-tag>
  </div>
  <span v-else class="skill-tag-empty">{{ emptyText }}</span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  type: {
    type: String,
    default: 'success',
  },
  effect: {
    type: String,
    default: 'plain',
  },
  size: {
    type: String,
    default: 'default',
  },
  emptyText: {
    type: String,
    default: '无',
  },
})

const validItems = computed(() => {
  if (!Array.isArray(props.items)) return []
  return props.items.filter(item => item !== null && item !== undefined && String(item).trim() !== '')
})
</script>

<style scoped>
.skill-tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.skill-tag-item {
  margin: 0;
}
.skill-tag-empty {
  color: #909399;
  font-size: 13px;
}
</style>
