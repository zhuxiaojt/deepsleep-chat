<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'
import { isMobile } from '../../app/viewport.js'
import { useAnchoredPosition, useDelayedOpen } from '../base/anchored.js'
import styles from './HoverCard.module.css'

const ENTER_DELAY = 300
const LEAVE_DELAY = 100
const GAP = 6

defineSlots<{
  default(props: {
    domRef: (el: unknown) => void
    domProps: Record<string, unknown>
  }): any
  content(): any
}>()

/** 悬停 300ms 后在触发元素下方显示卡片（放不下则上方），鼠标可移入卡片 */
const { open, schedule, cancel } = useDelayedOpen()
const { anchorRef, floatingRef, position } = useAnchoredPosition(open, {
  align: 'center',
  offset: GAP,
})

const visible = computed(() => open.value && !isMobile.value)
const style = computed<CSSProperties>(
  () => position.value ?? { top: 0, left: 0, visibility: 'hidden' }
)

const domRef = (el: unknown) => {
  anchorRef.value = (el as HTMLElement | null) ?? null
}

const domProps = {
  onMouseenter: () => schedule(true, ENTER_DELAY),
  onMouseleave: () => schedule(false, LEAVE_DELAY),
}
</script>

<template>
  <slot :domRef="domRef" :domProps="domProps" />
  <Teleport to="body">
    <div
      v-if="visible"
      ref="floatingRef"
      :class="styles.card"
      :style="style"
      @mouseenter="cancel"
      @mouseleave="schedule(false, LEAVE_DELAY)"
    >
      <slot name="content" />
    </div>
  </Teleport>
</template>
