<script setup lang="ts">
import { useTranslate } from '../../i18n/index.js'
import { setSiderCollapsed } from '../../services/settings.js'
import { newChat } from '../../services/chat/store.js'
import IconButton from '../base/IconButton.vue'
import { IconPanelLeftOutline16, NewChatIcon } from '../base/icons.js'
import styles from './Sider.module.css'

const t = useTranslate()
</script>

<template>
  <div :class="styles.collapsed">
    <div :class="styles.collapsedGroup">
      <IconButton
        size="m"
        tone="primary"
        :tooltip="t('expandSiderbarButton')"
        @click="setSiderCollapsed(false)"
      >
        <IconPanelLeftOutline16 />
      </IconButton>
      <IconButton size="m" tone="primary" :tooltip="t('newChat')" @click="newChat">
        <NewChatIcon />
      </IconButton>
    </div>
  </div>
</template>
