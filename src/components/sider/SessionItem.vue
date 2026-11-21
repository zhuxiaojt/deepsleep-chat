<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import clsx from 'clsx'
import { useTranslate } from '../../i18n/index.js'
import IconButton from '../base/IconButton.vue'
import Menu from '../base/Menu.vue'
import { IconEditOutline16, IconEllipsisOutline16, IconTrashOutline16 } from '../base/icons.js'
import { renameSession, selectSession } from '../../services/chat/store.js'
import type { SessionSummary } from '../../services/chat/types.js'
import { closeMobileSider } from './mobileSiderState.js'
import styles from './SessionItem.module.css'

const props = defineProps<{ session: SessionSummary; active: boolean }>()
const emit = defineEmits<{ delete: [] }>()

const t = useTranslate()
const editing = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)
const displayTitle = computed(() => props.session.title || t('untitledChat'))

watch(editing, async (value) => {
  if (value) {
    await nextTick()
    inputRef.value?.focus()
    inputRef.value?.select()
  }
})

const finish = (title: string) => {
  editing.value = false
  const trimmed = title.trim()
  if (trimmed && trimmed !== displayTitle.value) {
    renameSession(props.session.id, trimmed)
  }
}

const onKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.isComposing) {
    finish((event.target as HTMLInputElement).value)
  } else if (event.key === 'Escape') {
    editing.value = false
  }
}

const menuOptions = computed(() => [
  {
    key: 'rename',
    label: t('sessionItemMenuRenameOption'),
    icon: IconEditOutline16,
    onSelect: () => (editing.value = true),
  },
  {
    key: 'delete',
    label: t('delete'),
    icon: IconTrashOutline16,
    danger: true,
    onSelect: () => emit('delete'),
  },
])

const openSession = () => {
  selectSession(props.session.id)
  closeMobileSider()
}
</script>

<template>
  <input
    v-if="editing"
    ref="inputRef"
    :class="styles.renameInput"
    :value="displayTitle"
    @blur="finish(($event.target as HTMLInputElement).value)"
    @keydown="onKeyDown"
  />
  <div v-else :class="clsx(styles.item, props.active && styles.active)" @click="openSession">
    <div :class="styles.title">{{ displayTitle }}</div>
    <div :class="styles.action" @click="$event.stopPropagation()">
      <Menu :options="menuOptions">
        <template #default="{ toggle }">
          <IconButton :tooltip="t('more')" @click="toggle">
            <IconEllipsisOutline16 />
          </IconButton>
        </template>
      </Menu>
    </div>
  </div>
</template>
