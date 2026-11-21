<script setup lang="ts">
import { useTranslate } from '../../i18n/index.js'
import { isMobile } from '../../app/viewport.js'
import type { Session } from '../../services/chat/types.js'
import ChatInput from '../chatInput/ChatInput.vue'
import MessageList from '../messages/MessageList.vue'
import MobileHeader from './MobileHeader.vue'
import styles from './SessionView.module.css'

const props = defineProps<{
  session: Session
  streaming: boolean
  siderCollapsed: boolean
}>()

const t = useTranslate()
</script>

<template>
  <div :class="styles.view">
    <MobileHeader v-if="isMobile" :title="props.session.title || t('untitledChat')" />
    <div v-else :class="styles.header">
      <div :class="[styles.title, props.siderCollapsed && styles.withCollapsedSider]">
        {{ props.session.title || t('untitledChat') }}
      </div>
    </div>
    <MessageList :session="props.session" :streaming="props.streaming">
      <template #footer>
        <div :class="styles.inputContainer">
          <ChatInput :session-id="props.session.id" />
          <div :class="styles.caveat">{{ t('contentCaveat') }}</div>
        </div>
      </template>
    </MessageList>
  </div>
</template>
