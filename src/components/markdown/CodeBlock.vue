<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import Prism from 'prismjs'
import { useTranslate } from '../../i18n/index.js'
import {
  getHighlightLang,
  isHighlightLoaded,
  loadHighlight,
} from '../../services/markdown/highlight.js'
import { IconCheckOutline16, IconCopyOutline16 } from '../base/icons.js'
import { showToast } from '../base/toastState.js'
import { copyText } from '../../utils/clipboard.js'
import MermaidDiagram from './MermaidDiagram.vue'
import styles from './CodeBlock.module.css'

/** 代码块：语言包按需加载，不支持或尚未加载的语言按纯文本显示 */
const props = withDefaults(
  defineProps<{ code: string; infostring: string; loading?: boolean }>(),
  { loading: false }
)

const t = useTranslate()
const isMermaid = computed(() => props.infostring.toLowerCase() === 'mermaid')
const showDiagram = ref(true)

// 语言包注册在全局 Prism 上，每次渲染直接判断；加载完成后触发一次重渲染
const version = ref(0)
const lang = computed(() => getHighlightLang(props.infostring))
const loaded = computed(() => {
  void version.value
  return lang.value !== null && isHighlightLoaded(lang.value)
})

watch(
  [lang, loaded],
  ([currentLang, currentLoaded], _previous, onCleanup) => {
    if (currentLang === null || currentLoaded) {
      return
    }
    let unmounted = false
    void loadHighlight(currentLang).then(() => {
      if (!unmounted) {
        version.value += 1
      }
    })
    onCleanup(() => {
      unmounted = true
    })
  },
  { immediate: true }
)

const renderedHtml = computed(() => {
  const name = lang.value !== null && loaded.value ? lang.value : 'plaintext'
  return Prism.highlight(props.code, Prism.languages[name], name)
})

const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | undefined
onBeforeUnmount(() => {
  if (copiedTimer !== undefined) {
    clearTimeout(copiedTimer)
  }
})

const copy = async () => {
  if (!(await copyText(props.code))) {
    showToast({ key: 'copyFailed' })
    return
  }
  copied.value = true
  if (copiedTimer !== undefined) {
    clearTimeout(copiedTimer)
  }
  copiedTimer = setTimeout(() => {
    copiedTimer = undefined
    copied.value = false
  }, 1500)
}

const selectDiagram = () => {
  if (!showDiagram.value) {
    showDiagram.value = true
  }
}

const selectCode = () => {
  if (showDiagram.value) {
    showDiagram.value = false
  }
}
</script>

<template>
  <div class="md-code-block">
    <div class="md-code-block-banner">
      <div :class="styles.container">
        <div v-if="isMermaid" class="md-code-block-switch" :aria-label="t('mermaidSwitchLabel')">
          <button
            type="button"
            :class="styles.button"
            :aria-pressed="showDiagram"
            @click="selectDiagram"
          >
            {{ t('mermaidDiagram') }}
          </button>
          <button type="button" :class="styles.button" :aria-pressed="!showDiagram" @click="selectCode">
            {{ t('mermaidCode') }}
          </button>
        </div>
        <span v-else :class="styles.name">{{ infostring }}</span>
        <button type="button" :class="styles.button" @click="copy">
          <IconCheckOutline16 v-if="copied" />
          <IconCopyOutline16 v-else />
          <span>{{ t(copied ? 'copied' : 'copy') }}</span>
        </button>
      </div>
    </div>
    <MermaidDiagram v-if="isMermaid && showDiagram" :code="code" :loading="loading" />
    <pre v-else v-html="renderedHtml"></pre>
  </div>
</template>
