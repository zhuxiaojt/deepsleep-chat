<script setup lang="ts">
import clsx from 'clsx'
import type { TooltipPlacement } from './anchored.js'
import Tooltip from './Tooltip.vue'
import styles from './IconButton.module.css'

defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    size?: 'xs' | 'm' | 'xl'
    tone?: 'tertiary' | 'primary'
    tooltip?: string
    tooltipPlacement?: TooltipPlacement
  }>(),
  { size: 'xs', tone: 'tertiary' }
)
</script>

<template>
  <Tooltip v-if="tooltip" :content="tooltip" :placement="tooltipPlacement">
    <button
      type="button"
      v-bind="$attrs"
      :class="clsx(styles.button, styles[size], styles[tone], $attrs.class)"
      :aria-label="tooltip"
    >
      <slot />
    </button>
  </Tooltip>
  <button
    v-else
    type="button"
    v-bind="$attrs"
    :class="clsx(styles.button, styles[size], styles[tone], $attrs.class)"
  >
    <slot />
  </button>
</template>
