<script setup lang="ts">
import { ref } from 'vue'
import { useTranslate } from '../../i18n/index.js'
import { IconChevronRightOutline14 } from '../base/icons.js'
import IconButton from '../base/IconButton.vue'
import type { MessageVersions, SelectMessageVersion } from './BranchSwitcher.types.js'
import styles from './BranchSwitcher.module.css'

const props = defineProps<{
  versions: MessageVersions
  disabled: boolean
  onSelect: SelectMessageVersion
}>()

const t = useTranslate()
const anchorRef = ref<HTMLDivElement | null>(null)

const select = (messageId: string) => {
  if (anchorRef.value) {
    props.onSelect(messageId, anchorRef.value.getBoundingClientRect().top)
  }
}
</script>

<template>
  <div
    v-if="versions.ids.length > 1"
    ref="anchorRef"
    :class="styles.switcher"
    :aria-label="t('messageVersions')"
    :data-message-version="versions.ids[versions.index]"
  >
    <IconButton
      :class="styles.previous"
      :aria-label="t('previousVersion')"
      :disabled="disabled || versions.index <= 0"
      @click="select(versions.ids[versions.index - 1])"
    >
      <IconChevronRightOutline14 />
    </IconButton>
    <span :class="styles.count">{{ versions.index + 1 }} / {{ versions.ids.length }}</span>
    <IconButton
      :aria-label="t('nextVersion')"
      :disabled="disabled || versions.index >= versions.ids.length - 1"
      @click="select(versions.ids[versions.index + 1])"
    >
      <IconChevronRightOutline14 />
    </IconButton>
  </div>
</template>
