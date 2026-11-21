<script setup lang="ts">
import { computed } from 'vue'
import clsx from 'clsx'
import { useTranslate } from '../../i18n/index.js'
import IconButton from '../base/IconButton.vue'
import { IconPanelLeftOutline16, IconSettingsOutline16, NewChatIcon } from '../base/icons.js'
import { setSiderCollapsed } from '../../services/settings.js'
import { groupSessions } from '../../services/chat/sessionGroups.js'
import { newChat, removeSession, useChatStore } from '../../services/chat/store.js'
import type { SessionSummary } from '../../services/chat/types.js'
import Button from '../base/Button.vue'
import Modal from '../base/Modal.vue'
import { showToast } from '../base/toastState.js'
import { openSettings } from '../settings/settingsDialogState.js'
import { closeMobileSider } from './mobileSiderState.js'
import SessionItem from './SessionItem.vue'
import Logo from './Logo.vue'
import styles from './Sider.module.css'

const props = withDefaults(defineProps<{ mobile?: boolean }>(), { mobile: false })

const t = useTranslate()
const sessions = useChatStore((state) => state.sessions)
const activeId = useChatStore((state) => state.activeId)
const now = ref(Date.now())
const groups = computed(() => groupSessions(sessions.value, now.value, t))
const deleting = ref<SessionSummary | null>(null)
const deletePending = ref(false)

import { onBeforeUnmount, onMounted, ref } from 'vue'

let timer = 0
const refresh = () => {
  clearTimeout(timer)
  const time = Date.now()
  now.value = time
  const midnight = new Date(time).setHours(24, 0, 0, 0)
  timer = window.setTimeout(refresh, midnight - time)
}
const onVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    refresh()
  }
}
onMounted(() => {
  refresh()
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('focus', refresh)
})
onBeforeUnmount(() => {
  clearTimeout(timer)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  window.removeEventListener('focus', refresh)
})

const collapse = () => {
  if (props.mobile) {
    closeMobileSider()
  } else {
    setSiderCollapsed(true)
  }
}
const startNewChat = () => {
  newChat()
  closeMobileSider()
}
const confirmDelete = async () => {
  const target = deleting.value
  if (!target) {
    return
  }
  deletePending.value = true
  try {
    if (await removeSession(target.id)) {
      deleting.value = null
    } else {
      showToast({ key: 'sessionDeleteFailed', type: 'error' })
    }
  } finally {
    deletePending.value = false
  }
}
</script>

<template>
  <div :class="clsx(styles.sider, props.mobile && styles.mobile)">
    <div :class="styles.top">
      <span :class="styles.logo"><Logo /></span>
      <IconButton
        size="m"
        tooltip-placement="bottom"
        :tooltip="t('collapseSiderbarButton')"
        @click="collapse"
      >
        <IconPanelLeftOutline16 />
      </IconButton>
    </div>
    <button type="button" :class="styles.newChat" @click="startNewChat">
      <span :class="styles.newChatIcon"><NewChatIcon /></span>
      {{ t('newChat') }}
    </button>
    <div :class="styles.listWrap">
      <div :class="styles.list">
        <div v-for="group in groups" :key="group.key" :class="styles.section">
          <div :class="styles.sectionHeader">{{ group.label }}</div>
          <SessionItem
            v-for="item in group.sessions"
            :key="item.id"
            :session="item"
            :active="item.id === activeId"
            @delete="deleting = item"
          />
        </div>
      </div>
    </div>
    <div :class="styles.bottom">
      <button type="button" :class="styles.settings" @click="openSettings('general')">
        <span :class="styles.settingsIcon"><IconSettingsOutline16 /></span>
        <span :class="styles.settingsLabel">{{ t('settings') }}</span>
      </button>
    </div>

    <Modal
      :open="Boolean(deleting)"
      :title="t('deleteSessionModalContentTitle')"
      closable
      @close="!deletePending && (deleting = null)"
    >
      {{ t('deleteSessionWithFilesDescription') }}
      <template #footer>
        <Button variant="outlined" :disabled="deletePending" @click="deleting = null">
          {{ t('cancel') }}
        </Button>
        <Button variant="danger" :disabled="deletePending" @click="confirmDelete">
          {{ t('delete') }}
        </Button>
      </template>
    </Modal>
  </div>
</template>
