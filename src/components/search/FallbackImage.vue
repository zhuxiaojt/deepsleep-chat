<script setup lang="ts">
import { ref, watch, type CSSProperties } from 'vue'

/**
 * 带加载兜底的图片：loading 骨架占位 → 成功显示 → 失败展示 fallback 内容。
 * 只提供三态行为，视觉全部由调用方类名决定。
 */
const props = defineProps<{
  src: string
  /** 容器类名，尺寸 / 圆角 / 背景由调用方定义 */
  className?: string
  imgClassName?: string
  /** loading 骨架占位层类名 */
  skeletonClassName?: string
  /** 兜底内容包裹层类名 */
  fallbackClassName?: string
  style?: CSSProperties
}>()

const loadResult = ref<'loading' | 'error' | 'loaded'>(props.src ? 'loading' : 'error')

watch(
  () => props.src,
  (src) => {
    loadResult.value = src ? 'loading' : 'error'
  }
)
</script>

<template>
  <div :class="props.className" :style="props.style">
    <img
      v-if="loadResult !== 'error'"
      :src="props.src"
      alt=""
      :class="props.imgClassName"
      :style="{ display: loadResult === 'loaded' ? 'block' : 'none' }"
      @load="loadResult = 'loaded'"
      @error="loadResult = 'error'"
    />
    <div v-if="loadResult === 'error'" :class="props.fallbackClassName">
      <slot name="fallback">
        <slot />
      </slot>
    </div>
    <div v-if="loadResult === 'loading'" :class="props.skeletonClassName" />
  </div>
</template>
