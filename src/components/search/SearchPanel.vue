<script setup lang="ts">
import { useTranslate } from '../../i18n/index.js'
import IconButton from '../base/IconButton.vue'
import { IconCloseOutline16 } from '../base/icons.js'
import { closeSearchPanel, useSearchPanel } from './searchPanelState.js'
import SourceCard from './SourceCard.vue'
import styles from './SearchPanel.module.css'

/** 右侧「搜索结果」面板 */
const t = useTranslate()
const entry = useSearchPanel((state) => state.entry)
const sources = useSearchPanel((state) => state.sources)
</script>

<template>
  <aside v-if="entry" :class="styles.panel">
    <div :class="styles.header">
      <div role="heading" :class="styles.title">
        {{ t('searchResult') }}
      </div>
      <IconButton :aria-label="t('close')" @click="closeSearchPanel">
        <IconCloseOutline16 />
      </IconButton>
    </div>
    <div :class="styles.content">
      <SourceCard
        v-for="source in sources"
        :key="source.url"
        :source="source"
        :class-name="styles.item"
      />
    </div>
  </aside>
</template>
