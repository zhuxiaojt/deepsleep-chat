<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import clsx from 'clsx'
import { useTranslate } from '../../i18n/index.js'
import { isMobile } from '../../app/viewport.js'
import { getFileViewType, isImage } from '../../services/attachments.js'
import { editMessage, retryUpload } from '../../services/chat/store.js'
import { stopReadAloud } from '../../services/speech/readAloud.js'
import type { UserMessage as UserMessageType } from '../../services/chat/types.js'
import { IconEditOutline16 } from '../base/icons.js'
import Button from '../base/Button.vue'
import IconButton from '../base/IconButton.vue'
import BranchSwitcher from './BranchSwitcher.vue'
import CopyButton from './CopyButton.vue'
import MessageFile from './MessageFile.vue'
import type { MessageVersions, SelectMessageVersion } from './BranchSwitcher.types.js'
import styles from './UserMessage.module.css'

const props = defineProps<{
  sessionId: string
  message: UserMessageType
  /** 回答因补传附件失败可重试时为该回答 id */
  retryUploadId: string | null
  isFirst: boolean
  isLast: boolean
  busy: boolean
  versions: MessageVersions
  onSelectVersion: SelectMessageVersion
}>()

const t = useTranslate()
const editing = ref(false)
const draft = ref(props.message.content)
const textareaRef = ref<HTMLTextAreaElement | null>(null)

const canSend = computed(
  () => !props.busy && (draft.value.trim() !== '' || props.message.files.length > 0)
)
const hasDocuments = computed(() =>
  props.message.files.some((file) => !isImage(getFileViewType(file.name)))
)
const retryHandler = computed(() => {
  const id = props.retryUploadId
  return id ? () => retryUpload(props.sessionId, id) : null
})

watch(
  [editing, draft],
  () => {
    const textarea = textareaRef.value
    if (editing.value && textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 202)}px`
    }
  },
  { flush: 'post' }
)

const startEditing = () => {
  draft.value = props.message.content
  editing.value = true
}

const sendEdit = () => {
  if (canSend.value && editMessage(props.sessionId, props.message.id, draft.value.trim())) {
    stopReadAloud()
    editing.value = false
  }
}

const onInput = (event: Event) => {
  draft.value = (event.target as HTMLTextAreaElement).value
}

const onKeyDown = (event: KeyboardEvent) => {
  if (event.isComposing) {
    return
  }
  if (event.key === 'Escape') {
    editing.value = false
  } else if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !isMobile.value) {
    event.preventDefault()
    sendEdit()
  }
}
</script>

<template>
  <div :class="clsx(styles.container, isFirst && styles.isFirst)">
    <div
      v-if="message.files.length > 0"
      :class="clsx(styles.files, hasDocuments && styles.filesWithDocuments)"
    >
      <MessageFile
        v-for="file in message.files"
        :key="file.id"
        :file="file"
        :on-retry="retryHandler"
      />
    </div>
    <div v-if="editing" :class="styles.editor">
      <textarea
        ref="textareaRef"
        :class="styles.textarea"
        :aria-label="t('editMessage')"
        autofocus
        rows="1"
        :value="draft"
        :disabled="busy"
        @input="onInput"
        @keydown="onKeyDown"
      />
      <div :class="styles.editorActions">
        <Button size="s" variant="outlined" @click="editing = false">
          {{ t('cancel') }}
        </Button>
        <Button size="s" :disabled="!canSend" @click="sendEdit">
          {{ t('send') }}
        </Button>
      </div>
    </div>
    <template v-else>
      <div v-if="message.content" :class="styles.bubble">{{ message.content }}</div>
      <div :class="styles.bottom">
        <div :class="clsx(styles.actions, isLast && styles.alwaysShow)">
          <CopyButton v-if="message.content" :text="message.content" />
          <IconButton
            :tooltip="t('editMessage')"
            tooltip-placement="bottom"
            :disabled="busy"
            @click="startEditing"
          >
            <IconEditOutline16 />
          </IconButton>
        </div>
        <BranchSwitcher :versions="versions" :disabled="busy" :on-select="onSelectVersion" />
      </div>
    </template>
  </div>
</template>
