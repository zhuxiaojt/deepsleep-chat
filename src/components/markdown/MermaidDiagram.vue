<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useTranslate } from '../../i18n/index.js'
import { useTheme } from '../../app/theme.js'
import { renderMermaid } from '../../services/markdown/mermaid.js'

/** 流式绘制最新内容、保留上次有效图；回答结束后才显示渲染错误。 */
const props = defineProps<{ code: string; loading: boolean }>()

const t = useTranslate()
const theme = useTheme()
const dark = computed(() => theme.value === 'dark')

const result = ref<{ svg: string; failedCode: string | null }>({ svg: '', failedCode: null })

watch(
  [dark, () => props.loading, () => (props.loading ? null : props.code)],
  (_value, _previous, onCleanup) => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let previousCode: string | undefined
    let displayedCode: string | undefined
    const isDark = dark.value

    const draw = async (input: string) => {
      if (input === displayedCode || cancelled) {
        return
      }
      const svg = await renderMermaid(input, isDark, () => cancelled)
      if (svg && !cancelled) {
        displayedCode = input
        result.value = { svg, failedCode: null }
      }
    }

    const renderLatest = async () => {
      const input = props.code
      if (input !== previousCode) {
        previousCode = input
        try {
          await draw(input)
        } catch {
          if (!cancelled) {
            if (props.loading) {
              // 流式片段的末行可能包含未完成的节点，仅绘制前面的完整行。
              const text = input.trimEnd()
              const lineEnd = Math.max(text.lastIndexOf('\n'), text.lastIndexOf('\r'))
              const prefix = text.slice(0, Math.max(0, lineEnd))
              // 已显示的内容覆盖当前前缀时保持图形。
              if (prefix && !displayedCode?.startsWith(prefix)) {
                try {
                  await draw(prefix)
                } catch {
                  // 前缀也可能尚未构成完整语法，保留已有图。
                }
              }
            } else {
              result.value = { svg: '', failedCode: input }
            }
          }
        }
      }
      // 当前帧结束后绘制最新片段，连续输入合并为一次绘制。
      if (!cancelled && props.loading) {
        timer = setTimeout(renderLatest, 100)
      }
    }

    void renderLatest()
    onCleanup(() => {
      cancelled = true
      if (timer !== undefined) {
        clearTimeout(timer)
      }
    })
  },
  { immediate: true }
)
</script>

<template>
  <div v-if="!code.trim() || !result.svg" class="md-mermaid-status" role="status">
    {{
      !loading && !code.trim()
        ? t('mermaidEmpty')
        : !loading && result.failedCode === code
          ? t('mermaidRenderFail')
          : t('mermaidLoading')
    }}
  </div>
  <div v-else class="md-mermaid-diagram" v-html="result.svg"></div>
</template>
