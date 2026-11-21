<script setup lang="ts">
import styles from './Button.module.css'

withDefaults(
  defineProps<{
    variant?: 'primary' | 'outlined' | 'danger' | 'dangerOutlined'
    size?: 'l' | 'm' | 's'
    block?: boolean
  }>(),
  { variant: 'primary', size: 'l', block: false }
)
</script>

<template>
  <button type="button" :class="[styles.button, styles[variant], styles[size], block && styles.block]">
    <slot />
  </button>
</template>
