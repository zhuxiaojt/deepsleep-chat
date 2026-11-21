<script setup lang="ts">
import { useTranslate } from '../../i18n/index.js'
import { isMobile } from '../../app/viewport.js'
import ChatInput from '../chatInput/ChatInput.vue'
import MobileHeader from './MobileHeader.vue'
import styles from './Welcome.module.css'

const t = useTranslate()
</script>

<template>
  <div :class="styles.container">
    <MobileHeader v-if="isMobile" />
    <div :class="styles.welcome">
      <div :class="styles.greeting">{{ t('welcomeMessageChat250808') }}</div>
      <ChatInput :session-id="null" />
      <div v-if="isMobile" :class="styles.caveat">{{ t('contentCaveat') }}</div>
    </div>
  </div>
</template>
