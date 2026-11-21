<script setup lang="ts">
import type { Source } from '../../services/chat/view.js'
import SiteLogo from './SiteLogo.vue'
import styles from './SiteLogo.module.css'

/** 搜索结果前 4 个站点的重叠缩略图 */
const props = defineProps<{ sources: Source[] }>()
</script>

<template>
  <span :class="styles.group">
    <SiteLogo
      v-for="source in props.sources.slice(0, 4)"
      :key="source.url"
      :url="source.siteIcon"
      :class-name="styles.thumbnail"
    />
  </span>
</template>
