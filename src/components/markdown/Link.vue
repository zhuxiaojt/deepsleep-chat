<script setup lang="ts">
import { computed } from 'vue'
import type { Link as LinkNode } from 'mdast'

const props = defineProps<{ node: LinkNode }>()

const sanitizeUrl = (url: string) => {
  // 如果URL没有协议，添加默认的https协议
  if (url && !url.match(/^[a-zA-Z]+:\/\//) && !url.startsWith('mailto:')) {
    url = `https://${url}`
  }

  try {
    const parsedUrl = new URL(url)
    if (['http:', 'https:', 'mailto:'].includes(parsedUrl.protocol)) {
      return parsedUrl.toString()
    }
    return undefined
  } catch {
    return undefined
  }
}

// 页内锚点与邮件地址显示链接文字。
const inlineUrl = computed(
  () => props.node.url.startsWith('#') || props.node.url.startsWith('mailto:')
)
const href = computed(() => (inlineUrl.value ? undefined : sanitizeUrl(props.node.url)))
</script>

<template>
  <slot v-if="inlineUrl" />
  <!-- URL 解析失败时 href 为空，链接文字仍可显示。 -->
  <a v-else :href="href" :title="node.title || undefined" target="_blank" rel="noreferrer">
    <slot />
  </a>
</template>
