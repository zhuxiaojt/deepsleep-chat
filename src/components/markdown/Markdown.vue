<script setup lang="ts">
import { computed, toRef } from 'vue'
import type { Source } from '../../services/chat/view.js'
import { toMdAst } from '../../services/markdown/parse.js'
import { useScrollToBottom } from '../messages/scrollContext.js'
import { MarkdownAstRenderer } from './MarkdownAstRenderer.js'
import { useThrottleMarkdownRender } from './useThrottleMarkdownRender.js'
import './markdown.css'
import './highlight.css'

/**
 * 渲染链路：节流 → 解析 AST → 渲染。
 * 传入 sources 时把正文里的 [citation:N] 渲染为角标。
 */
const props = withDefaults(
  defineProps<{
    content: string
    loading: boolean
    cacheKey: string
    className?: string
    disableLink?: boolean
    sources?: Source[]
  }>(),
  { disableLink: false }
)

const scrollToBottom = useScrollToBottom()
const throttledMarkdown = useThrottleMarkdownRender(
  toRef(props, 'content'),
  toRef(props, 'loading')
)
const ast = computed(() =>
  throttledMarkdown.value
    ? toMdAst(throttledMarkdown.value, {
        sources: props.sources,
        disableLink: props.disableLink,
      })
    : null
)
</script>

<template>
  <MarkdownAstRenderer
    v-if="ast"
    :key="cacheKey"
    :class-name="className"
    :ast="ast"
    :loading="loading"
    :sources="sources"
    :disable-link="disableLink"
    :on-update="scrollToBottom"
  />
</template>
