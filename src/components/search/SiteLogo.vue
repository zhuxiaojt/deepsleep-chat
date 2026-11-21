<script setup lang="ts">
import clsx from 'clsx'
import type { CSSProperties } from 'vue'
import FallbackImage from './FallbackImage.vue'
import { IconLinkOutline14 } from '../base/icons.js'
import styles from './SiteLogo.module.css'

/** 站点图标：加载中显示骨架，没有图标或加载失败时显示链接图标 */
const props = defineProps<{
  url: string | null
  className?: string
  style?: CSSProperties
}>()
</script>

<template>
  <FallbackImage
    :key="props.url ?? ''"
    :src="props.url ?? ''"
    :class-name="clsx(styles.logo, props.className)"
    :img-class-name="styles.img"
    :skeleton-class-name="styles.placeholder"
    :fallback-class-name="clsx(styles.placeholder, styles.fallback)"
    :style="props.style"
  >
    <IconLinkOutline14 />
  </FallbackImage>
</template>
