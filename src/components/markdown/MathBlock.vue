<script setup lang="ts">
import { computed, onBeforeUnmount, shallowRef } from 'vue'
import { ensureKatex, type Katex } from '../../services/markdown/katex.js'

/** renderToString 外层包裹的标签，组件自己渲染外层，这里切掉 */
const KATEX_WRAPPER = {
  inline: ['<span class="katex">', '</span>'],
  display: ['<span class="katex-display"><span class="katex">', '</span></span>'],
} as const

type MathHtmlResult = {
  html: string
  renderMode: 'katex' | 'fallback'
}

const props = defineProps<{ value: string }>()

const katex = shallowRef<Katex | null>(null)
let cancelled = false
const initial = ensureKatex()
if (initial instanceof Promise) {
  void initial.then(
    (value) => {
      if (!cancelled) {
        katex.value = value
      }
    },
    () => {}
  )
} else {
  katex.value = initial
}
onBeforeUnmount(() => {
  cancelled = true
})

/** 出错时保留上次成功的结果（流式中公式未写完），没有则展示原文 */
let previousResult: MathHtmlResult | null = null

const result = computed<MathHtmlResult>(() => {
  if (!katex.value) {
    return { html: props.value, renderMode: 'fallback' }
  }
  try {
    const [prefix, suffix] = KATEX_WRAPPER.display
    const html = katex.value
      .renderToString(props.value, { throwOnError: true, strict: false, displayMode: true })
      .slice(prefix.length, -suffix.length)
    const next = { html, renderMode: 'katex' } as const
    previousResult = next
    return next
  } catch {
    return previousResult ?? { html: props.value, renderMode: 'fallback' }
  }
})
</script>

<template>
  <span v-if="result.renderMode === 'katex'" class="katex-display ds-markdown-math">
    <span class="katex" v-html="result.html"></span>
  </span>
  <p v-else class="ds-markdown-paragraph">{{ result.html }}</p>
</template>
