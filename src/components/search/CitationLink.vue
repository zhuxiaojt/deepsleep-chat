<script setup lang="ts">
import type { Source } from '../../services/chat/view.js'
import HoverCard from './HoverCard.vue'
import SourceCard from './SourceCard.vue'

/**
 * 正文里 [citation:N] 的数字角标：悬停预览来源，点击新标签打开。
 * 角标使用带 link 角色的 span，可嵌入链接文字。样式由 .ds-markdown-cite 提供。
 */
const props = defineProps<{ source: Source }>()

const open = (event: MouseEvent) => {
  event.preventDefault()
  event.stopPropagation()
  window.open(props.source.url, '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <HoverCard>
    <template #default="{ domRef, domProps }">
      <span
        :ref="domRef"
        class="ds-markdown-cite"
        v-bind="domProps"
        role="link"
        @click="open"
      >
        {{ props.source.index }}
      </span>
    </template>
    <template #content>
      <SourceCard :source="props.source" />
    </template>
  </HoverCard>
</template>
