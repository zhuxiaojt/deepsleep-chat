<script setup lang="ts">
import { computed } from 'vue'
import clsx from 'clsx'
import type { Source } from '../../services/chat/view.js'
import { formatDate } from '../../utils/format.js'
import SiteLogo from './SiteLogo.vue'
import styles from './SourceCard.module.css'

/** 显示为 YYYY/MM/DD；无法解析的日期原样显示 */
const formatPublishedAt = (value: string | null) => (value ? (formatDate(value, '/') ?? value) : '')

/**
 * 搜索结果卡片：站点图标与名称、日期、标题、摘要。
 * 元数据缺失时省略摘要，图标使用链接图标兜底。
 */
const props = defineProps<{ source: Source; className?: string }>()

const date = computed(() => formatPublishedAt(props.source.publishedAt))
</script>

<template>
  <a :class="styles.anchor" :href="props.source.url" target="_blank" rel="noreferrer">
    <div :class="clsx(styles.card, props.className)">
      <div :class="styles.meta">
        <SiteLogo :url="props.source.siteIcon" :class-name="styles.siteIcon" />
        <span v-if="props.source.siteName" :class="styles.siteName">{{ props.source.siteName }}</span>
        <span v-if="props.source.siteName && date" :class="styles.divider" />
        <span v-if="date" :class="styles.date">{{ date }}</span>
      </div>
      <div :class="styles.title">{{ props.source.title }}</div>
      <div v-if="props.source.snippet" :class="styles.snippet">{{ props.source.snippet }}</div>
    </div>
  </a>
</template>
