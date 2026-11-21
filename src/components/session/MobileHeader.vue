<script setup lang="ts">
import { useTranslate } from '../../i18n/index.js'
import { newChat } from '../../services/chat/store.js'
import IconButton from '../base/IconButton.vue'
import { IconMenuOutline20, IconNewChatOutline20 } from '../base/icons.js'
import { openMobileSider } from '../sider/mobileSiderState.js'
import styles from './MobileHeader.module.css'

const props = defineProps<{ title?: string }>()
const t = useTranslate()
</script>

<template>
  <div :class="styles.header">
    <IconButton
      size="xl"
      tone="primary"
      :tooltip="t('expandSiderbarButton')"
      @click="openMobileSider"
    >
      <IconMenuOutline20 />
    </IconButton>
    <template v-if="props.title !== undefined">
      <div :class="styles.title">{{ props.title }}</div>
      <IconButton size="xl" tone="primary" :tooltip="t('newChat')" @click="newChat">
        <IconNewChatOutline20 />
      </IconButton>
    </template>
  </div>
</template>
