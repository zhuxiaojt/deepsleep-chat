<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import clsx from 'clsx'
import {
  IconGlobeLanguageOutline14,
  IconPaperclipOutline16,
  IconSendOutline16,
  IconStopFill16,
  IconThinkOutline14,
} from '../base/icons.js'
import { setSearch, setThinking, useSettings } from '../../services/settings.js'
import { isMobile } from '../../app/viewport.js'
import { sendMessage, stopReply, useChatStore } from '../../services/chat/store.js'
import {
  addDraftFiles,
  EMPTY_DRAFT,
  getDraft,
  prepareDraftMessage,
  removeDraftAttachment,
  retryDraftAttachment,
  setDraftText,
  useDrafts,
} from '../../services/chat/drafts.js'
import { stopReadAloud } from '../../services/speech/readAloud.js'
import IconButton from '../base/IconButton.vue'
import Tooltip from '../base/Tooltip.vue'
import DragMask from './DragMask.vue'
import { showToast } from '../base/toastState.js'
import { ACCEPT, useUploads } from '../../services/attachments.js'
import DraftAttachments from './DraftAttachments.vue'
import { useVoiceInput } from './useVoiceInput.js'
import VoiceButton from './VoiceButton.vue'
import Spectrum from './Spectrum.vue'
import { useTranslate } from '../../i18n/index.js'
import styles from './ChatInput.module.css'

/** 输入框：自适应高度的文本框 + 文件 + 深度思考与智能搜索开关 + 语音输入 + 发送 / 停止 */
const props = defineProps<{ sessionId: string | null }>()

const t = useTranslate()
const draft = useDrafts((state) => state.drafts.get(props.sessionId) ?? EMPTY_DRAFT)
const text = computed(() => draft.value.text)
const attachments = computed(() => draft.value.attachments)
const setText = (value: string) => setDraftText(props.sessionId, value)
const draftReady = useUploads((state) => prepareDraftMessage(draft.value, state.tasks) !== null)
const streaming = useChatStore(
  (state) => props.sessionId !== null && Object.hasOwn(state.streaming, props.sessionId)
)
const thinking = useSettings((state) => state.thinking)
const search = useSettings((state) => state.search)
const importingHistory = useChatStore((state) => state.importingHistory)

const fileInputRef = ref<HTMLInputElement | null>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const togglesRef = ref<HTMLDivElement | null>(null)

const locale = useSettings((state) => state.locale)
let labelObserver: ResizeObserver | undefined

const updateLabels = () => {
  const toggles = togglesRef.value
  if (!toggles) {
    return
  }
  toggles.classList.remove(styles.collapsedToggles)
  toggles.classList.toggle(styles.collapsedToggles, toggles.scrollWidth > toggles.clientWidth)
}

onMounted(() => {
  updateLabels()
  if (togglesRef.value) {
    labelObserver = new ResizeObserver(updateLabels)
    labelObserver.observe(togglesRef.value)
  }
  if (!isMobile.value) {
    textareaRef.value?.focus({ preventScroll: true })
  }
})

watch(locale, updateLabels, { flush: 'post' })

onBeforeUnmount(() => labelObserver?.disconnect())

const acceptFiles = (files: File[]) => {
  if (files.length === 0 || useChatStore.getState().importingHistory) {
    return
  }
  const error = addDraftFiles(props.sessionId, files)
  if (error) {
    showToast(error)
  }
}
const retryFile = (id: string) => {
  if (!useChatStore.getState().importingHistory) {
    retryDraftAttachment(props.sessionId, id)
  }
}
const removeFile = (id: string) => {
  if (!useChatStore.getState().importingHistory) {
    removeDraftAttachment(props.sessionId, id)
  }
}

const hasFiles = (event: DragEvent) => event.dataTransfer?.types.includes('Files') ?? false
const dragging = ref(false)
let removeDropListeners: (() => void) | undefined

// 页面任意位置拖入文件即显示全屏遮罩，松手后交给 acceptFiles
onMounted(() => {
  // dragenter / dragleave 会在子元素间反复触发，用计数判断是否真正离开页面
  let depth = 0
  const enter = (event: DragEvent) => {
    if (hasFiles(event)) {
      depth++
      dragging.value = true
    }
  }
  const leave = (event: DragEvent) => {
    if (hasFiles(event) && --depth <= 0) {
      depth = 0
      dragging.value = false
    }
  }
  const over = (event: DragEvent) => {
    if (hasFiles(event)) {
      event.preventDefault()
    }
  }
  const drop = (event: DragEvent) => {
    if (!hasFiles(event)) {
      return
    }
    event.preventDefault()
    depth = 0
    dragging.value = false
    acceptFiles(Array.from(event.dataTransfer?.files ?? []))
  }
  document.addEventListener('dragenter', enter)
  document.addEventListener('dragleave', leave)
  document.addEventListener('dragover', over)
  document.addEventListener('drop', drop)
  removeDropListeners = () => {
    document.removeEventListener('dragenter', enter)
    document.removeEventListener('dragleave', leave)
    document.removeEventListener('dragover', over)
    document.removeEventListener('drop', drop)
  }
})

onBeforeUnmount(() => removeDropListeners?.())

/** 转写结果插入到光标处，并把光标移到插入内容之后 */
const voice = useVoiceInput((transcript) => {
  const textarea = textareaRef.value
  const current = getDraft(props.sessionId).text
  const start = textarea?.selectionStart ?? current.length
  const end = textarea?.selectionEnd ?? current.length
  setText(current.slice(0, start) + transcript + current.slice(end))
  requestAnimationFrame(() => {
    textarea?.focus({ preventScroll: true })
    textarea?.setSelectionRange(start + transcript.length, start + transcript.length)
  })
})

const {
  status: voiceStatus,
  seconds: voiceSeconds,
  error: voiceError,
  getAnalyser,
  toggle: toggleVoice,
  cancel: cancelVoice,
  clearError: clearVoiceError,
  available: voiceAvailable,
} = voice

watch(voiceError, (message) => {
  if (message) {
    showToast(message)
    clearVoiceError()
  }
})

// 欢迎页导入后会话 ID 不变，不能依赖卸载取消语音；监听导入状态覆盖快速完成的导入。
watch(importingHistory, (value, previous) => {
  if (value && !previous) {
    cancelVoice()
  }
})

// 切换目标时释放录音与转写；文字与附件由草稿服务保留。
watch(
  () => props.sessionId,
  async () => {
    cancelVoice()
    await nextTick()
    if (!isMobile.value) {
      textareaRef.value?.focus({ preventScroll: true })
    }
  }
)

// 移动端录音时用频谱替代输入框内容
const recording = computed(() => voiceStatus.value === 'recording')

// 排队、上传中或上传失败的附件都留在输入框，全部上传成功后才能发送
const canSend = computed(
  () =>
    !importingHistory.value &&
    !streaming.value &&
    voiceStatus.value === 'idle' &&
    draftReady.value
)

const send = () => {
  if (
    useChatStore.getState().importingHistory ||
    voiceStatus.value !== 'idle' ||
    !prepareDraftMessage(getDraft(props.sessionId), useUploads.getState().tasks)
  ) {
    return
  }
  // 文本与上传完成态由提交动作读取最新快照，不使用上一次渲染的草稿。
  if (!sendMessage(props.sessionId)) {
    return
  }
  stopReadAloud()
  if (isMobile.value) {
    textareaRef.value?.blur()
  } else {
    textareaRef.value?.focus()
  }
}

const onWrapperClick = (event: MouseEvent) => {
  if (event.target === event.currentTarget) {
    textareaRef.value?.focus({ preventScroll: true })
  }
}

const onTextareaMouseDown = (event: MouseEvent) => {
  // 首次点击时手动聚焦，避免 Safari 把整个页面滚到输入框位置。
  if (
    isMobile.value &&
    event.button === 0 &&
    document.activeElement !== event.currentTarget
  ) {
    event.preventDefault()
    ;(event.currentTarget as HTMLTextAreaElement).focus({ preventScroll: true })
  }
}

const onKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault()
    send()
  }
}

const onPaste = (event: ClipboardEvent) => {
  const files = Array.from(event.clipboardData?.files ?? [])
  if (files.length > 0) {
    event.preventDefault()
    acceptFiles(files)
  }
}

const onVoiceClick = () => {
  if (voiceStatus.value !== 'idle' || !importingHistory.value) {
    void toggleVoice()
  }
}

const onFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  acceptFiles(Array.from(input.files ?? []))
  input.value = ''
}

const toggleThinking = () => setThinking(!thinking.value)
const toggleSearch = () => setSearch(!search.value)

const stop = () => {
  if (props.sessionId) {
    stopReadAloud()
    stopReply(props.sessionId)
  }
}
</script>

<template>
  <div
    :class="clsx(styles.wrapper, props.sessionId === null ? styles.home : styles.session)"
    @click="onWrapperClick"
  >
    <DraftAttachments :items="attachments" @retry="retryFile" @remove="removeFile" />
    <div :class="styles.textareaWrapper">
      <textarea
        ref="textareaRef"
        :class="clsx(styles.textarea, recording && isMobile && styles.textareaHidden)"
        :placeholder="t('chatInputPlaceholderChat')"
        :rows="2"
        :autofocus="!isMobile"
        :disabled="importingHistory"
        :value="text"
        @input="setText(($event.target as HTMLTextAreaElement).value)"
        @mousedown="onTextareaMouseDown"
        @keydown="onKeyDown"
        @paste="onPaste"
      />
      <Spectrum v-if="recording && isMobile" :get-analyser="getAnalyser" />
      <div :class="styles.mirror" aria-hidden="true">{{ text + '\n' }}</div>
    </div>
    <div :class="styles.functionRow">
      <!-- 深度思考 / 智能搜索开关，tooltip 在按钮上方 -->
      <div ref="togglesRef" :class="styles.toggles">
        <Tooltip :content="t('deactivatedThinkTooltip')">
          <button
            type="button"
            :class="clsx(styles.toggle, thinking && styles.selected)"
            :aria-label="t('thinkingSwitch')"
            :aria-pressed="thinking"
            @click="toggleThinking"
          >
            <IconThinkOutline14 />
            <span :class="styles.toggleLabel">{{ t('thinkingSwitch') }}</span>
          </button>
        </Tooltip>
        <Tooltip :content="t('deactivatedSearchTooltip')">
          <button
            type="button"
            :class="clsx(styles.toggle, search && styles.selected)"
            :aria-label="t('search')"
            :aria-pressed="search"
            @click="toggleSearch"
          >
            <IconGlobeLanguageOutline14 />
            <span :class="styles.toggleLabel">{{ t('search') }}</span>
          </button>
        </Tooltip>
      </div>
      <div :class="styles.right">
        <VoiceButton
          :status="voiceStatus"
          :disabled="!voiceAvailable"
          :seconds="voiceSeconds"
          @click="onVoiceClick"
        />
        <IconButton
          size="m"
          tone="primary"
          :tooltip="t('uploadFile')"
          :disabled="importingHistory"
          @click="fileInputRef?.click()"
        >
          <IconPaperclipOutline16 />
        </IconButton>
        <input
          ref="fileInputRef"
          type="file"
          multiple
          hidden
          :accept="ACCEPT"
          @change="onFileChange"
        />
        <button
          v-if="streaming && props.sessionId"
          type="button"
          :class="styles.sendButton"
          :aria-label="t('chatInputStopButtonTooltip')"
          @click="stop"
        >
          <IconStopFill16 />
        </button>
        <button
          v-else
          type="button"
          :class="clsx(styles.sendButton, !canSend && styles.disabled)"
          :aria-label="t('send')"
          :aria-disabled="!canSend"
          @click="send"
        >
          <IconSendOutline16 />
        </button>
      </div>
    </div>
    <DragMask v-if="dragging" />
  </div>
</template>
