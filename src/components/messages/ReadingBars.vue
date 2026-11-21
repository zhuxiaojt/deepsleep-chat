<script setup lang="ts">
/**
 * 朗读按钮 loading / playing 两态的动画竖条（4 根，SVG 绘制，随 mode 换动画与颜色）。
 *
 * playing 波形通过 SMIL 同步改变 rect 的 height 与 y，保持圆角形状和竖直居中。
 * 两个高度极值之间使用 ease-in-out 插值；prefers-reduced-motion 启用时显示静态帧。
 *
 * SVG 在两种状态间保持挂载，使 SMIL 时间轴连续运行，涵盖 Chromium 的容器启动延迟。
 * 挂载时调用 unpauseAnimations()，确保 WebKit 中的动画时间轴启动。
 * 入场相位取决于容器当前时间，相邻竖条的相位差由 begin 决定。
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import clsx from 'clsx'

import styles from './ReadingBars.module.css'

/** 条宽 2、间距 2，总宽 14 在 16 视口内居中 */
const BAR_XS = [1, 5, 9, 13]

/** 相邻条相位滞后 0.25 周期（0.4s），波从左往右传；begin 相对常驻时间容器解析，差值定错峰 */
const WAVE_BEGINS = ['0s', '-1.2s', '-0.8s', '-0.4s']

/** reduced-motion 的静态帧（换算到 4–14 档） */
const STATIC_PLAYING_HEIGHTS = [7, 14, 4, 10]

/** ease-in-out 的 cubic-bezier */
const EASE_IN_OUT = '0.42 0 0.58 1'

/** loading 扫光蒙层逐条一份高斯 keyframes（峰对齐条的几何位置），见 module.css */
const SWEEP_CLASSES = [styles.sweep1, styles.sweep2, styles.sweep3, styles.sweep4]

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

const props = defineProps<{ mode: 'loading' | 'playing' }>()

const reducedMotion = ref(window.matchMedia(REDUCED_MOTION_QUERY).matches)
const queryList = window.matchMedia(REDUCED_MOTION_QUERY)
const onMotionChange = (event: MediaQueryListEvent) => (reducedMotion.value = event.matches)
onMounted(() => queryList.addListener(onMotionChange))
onBeforeUnmount(() => queryList.removeListener(onMotionChange))

const svgRef = ref<SVGSVGElement | null>(null)
onMounted(() => {
  // 显式启动 SMIL 时间轴，支持容器初始处于暂停状态的 WebKit。
  svgRef.value?.unpauseAnimations()
})

const playing = computed(() => props.mode === 'playing')
const heightFor = (index: number) =>
  playing.value ? (reducedMotion.value ? STATIC_PLAYING_HEIGHTS[index] : 14) : 4
const yFor = (index: number) => (16 - heightFor(index)) / 2
</script>

<template>
  <svg
    ref="svgRef"
    :class="clsx(styles.bars, playing ? styles.playing : styles.loading)"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    aria-hidden="true"
  >
    <template v-for="(x, index) in BAR_XS" :key="index">
      <rect :class="styles.bar" :x="x" :y="yFor(index)" width="2" :height="heightFor(index)" rx="1">
        <template v-if="playing && !reducedMotion">
          <!-- height 与 y 同 spline 同 begin：都是条高的仿射函数，逐帧严格同步，竖向恒居中 -->
          <animate
            attributeName="height"
            values="14;4;14"
            keyTimes="0;0.5;1"
            calcMode="spline"
            :keySplines="`${EASE_IN_OUT};${EASE_IN_OUT}`"
            dur="1.6s"
            :begin="WAVE_BEGINS[index]"
            repeatCount="indefinite"
          />
          <animate
            attributeName="y"
            values="1;6;1"
            keyTimes="0;0.5;1"
            calcMode="spline"
            :keySplines="`${EASE_IN_OUT};${EASE_IN_OUT}`"
            dur="1.6s"
            :begin="WAVE_BEGINS[index]"
            repeatCount="indefinite"
          />
        </template>
      </rect>
      <!-- 扫光蒙层：黑 rect 盖在条上，fill-opacity 走逐条高斯 keyframes -->
      <rect
        v-if="!playing"
        :class="clsx(styles.sweep, SWEEP_CLASSES[index])"
        :x="x"
        :y="yFor(index)"
        width="2"
        :height="heightFor(index)"
        rx="1"
      />
    </template>
  </svg>
</template>
