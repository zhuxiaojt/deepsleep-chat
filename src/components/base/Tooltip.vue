<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'
import { isMobile } from '../../app/viewport.js'
import { useAnchoredPosition, useDelayedOpen, type TooltipPlacement } from './anchored.js'
import styles from './Tooltip.module.css'

const props = withDefaults(
  defineProps<{ content?: string; placement?: TooltipPlacement }>(),
  { content: '', placement: 'top' }
)

const ENTER_DELAY = 100
const { open, setOpen, schedule, cancel } = useDelayedOpen()
const { anchorRef, floatingRef, position } = useAnchoredPosition(open, {
  side: props.placement,
  align: 'center',
  measureFirstChild: true,
  measureKey: props.content,
})

const visible = computed(() => open.value && !isMobile.value && Boolean(props.content))
const style = computed<CSSProperties>(() => {
  const pos = position.value
  if (!pos) {
    return { top: '0px', left: '0px', visibility: 'hidden' }
  }
  return {
    top: `${pos.top}px`,
    ...(pos.left !== undefined ? { left: `${pos.left}px` } : {}),
    ...(pos.right !== undefined ? { right: `${pos.right}px` } : {}),
    ...(pos.maxHeight !== undefined ? { maxHeight: `${pos.maxHeight}px` } : {}),
  }
})

const onMouseEnter = () => schedule(true, ENTER_DELAY)
const onMouseLeave = () => schedule(false, 0)
</script>

<template>
  <span
    ref="anchorRef"
    :class="styles.trigger"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
    @wheel="open && setOpen(false)"
  >
    <slot />
  </span>
  <Teleport to="body">
    <div v-if="visible" ref="floatingRef" role="tooltip" :class="styles.tooltip" :style="style">
      {{ content }}
    </div>
  </Teleport>
</template>
