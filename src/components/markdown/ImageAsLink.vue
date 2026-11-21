<script setup lang="ts">
import { computed } from 'vue'
import type { Image } from 'mdast'

/** Markdown 图片显示为指向图片地址的链接 */
const props = defineProps<{ node: Image }>()

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

const url = computed(() => sanitizeUrl(props.node.url))
</script>

<template>
  <a :href="url" :title="node.title ?? ''" target="_blank" rel="noreferrer">{{ url }}</a>
</template>
