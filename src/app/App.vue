<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { useTranslate } from '../i18n/index.js'
import { useSettings } from '../services/settings.js'
import { isMobile, useMobileViewport, usePreventPageScroll } from './viewport.js'
import {
  bindChatPersistence,
  initChat,
  retrySaveSessions,
  selectSession,
  useChatStore,
} from '../services/chat/store.js'
import SearchPanel from '../components/search/SearchPanel.vue'
import { closeSearchPanel } from '../components/search/searchPanelState.js'
import SessionView from '../components/session/SessionView.vue'
import MobileHeader from '../components/session/MobileHeader.vue'
import Welcome from '../components/session/Welcome.vue'
import SettingsDialog from '../components/settings/SettingsDialog.vue'
import Toast from '../components/base/Toast.vue'
import { showToast } from '../components/base/toastState.js'
import { onUploadNotice } from '../services/attachments.js'
import Button from '../components/base/Button.vue'
import { stopReadAloud } from '../services/speech/readAloud.js'
import CollapsedSider from '../components/sider/CollapsedSider.vue'
import { closeMobileSider } from '../components/sider/mobileSiderState.js'
import MobileSider from '../components/sider/MobileSider.vue'
import Sider from '../components/sider/Sider.vue'
import styles from './App.module.css'

const t = useTranslate()
const locale = useSettings((state) => state.locale)
const siderCollapsed = computed(
  () => useSettings.getState().siderCollapsed && !isMobile.value
)
const ready = useChatStore((state) => state.ready)
const initError = useChatStore((state) => state.initError)
const saveError = useChatStore((state) => Object.values(state.sessionSaveErrors).some(Boolean))
const importingHistory = useChatStore((state) => state.importingHistory)
const session = useChatStore((state) =>
  state.activeId !== null && Object.hasOwn(state.sessionCache, state.activeId)
    ? state.sessionCache[state.activeId]
    : undefined
)
const sessionLoadError = useChatStore((state) =>
  state.activeId === null ? false : state.sessionLoadErrors[state.activeId] === true
)
const activeId = useChatStore((state) => state.activeId)
const streaming = useChatStore((state) =>
  state.activeId === null ? false : Object.hasOwn(state.streaming, state.activeId)
)

const frameRef = useMobileViewport(isMobile)
usePreventPageScroll(isMobile)

watch(
  locale,
  (value) => {
    document.documentElement.lang = value
  },
  { immediate: true }
)

watch(activeId, () => {
  closeSearchPanel()
  stopReadAloud()
  closeMobileSider()
})
watch(isMobile, () => closeMobileSider())

let removeUploadNotice: (() => void) | undefined
onMounted(() => {
  removeUploadNotice = onUploadNotice(showToast)
  bindChatPersistence()
  void initChat()
})
onBeforeUnmount(() => removeUploadNotice?.())

const retryLoad = () => {
  if (!ready.value) {
    void initChat()
  } else if (activeId.value !== null) {
    selectSession(activeId.value)
  }
}
</script>

<template>
  <div ref="frameRef" :class="styles.frame">
    <MobileSider v-if="isMobile" />
    <Sider v-else-if="!siderCollapsed" />
    <main :class="styles.main">
      <div v-if="saveError" :class="styles.saveError" role="alert">
        <span>{{ t('sessionSaveFailed') }}</span>
        <Button variant="outlined" size="s" :disabled="importingHistory" @click="retrySaveSessions">
          {{ t('retry') }}
        </Button>
      </div>
      <div :class="styles.content">
        <CollapsedSider v-if="siderCollapsed" />
        <div v-if="!ready || (activeId !== null && !session)" :class="styles.loadingView">
          <MobileHeader v-if="isMobile" />
          <div :class="styles.loadingState" role="status" aria-live="polite">
            <span>
              {{
                (!ready ? initError : sessionLoadError)
                  ? t(!ready ? 'sessionListLoadFailed' : 'sessionLoadFailed')
                  : t('sessionLoading')
              }}
            </span>
            <Button
              v-if="!ready ? initError : sessionLoadError"
              variant="outlined"
              size="m"
              @click="retryLoad"
            >
              {{ t('retry') }}
            </Button>
          </div>
        </div>
        <SessionView
          v-else-if="session"
          :session="session"
          :streaming="streaming"
          :sider-collapsed="siderCollapsed"
        />
        <Welcome v-else />
      </div>
    </main>
    <SearchPanel />
  </div>
  <SettingsDialog />
  <Toast />
</template>
