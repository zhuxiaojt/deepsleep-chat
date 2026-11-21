<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { isMobile } from '../../app/viewport.js'
import { buildMessageVersions, getVisibleMessages } from '../../services/chat/branches.js'
import { selectMessageVersion } from '../../services/chat/store.js'
import type { Message, Session } from '../../services/chat/types.js'
import { closeSearchPanel } from '../search/searchPanelState.js'
import AssistantMessage from './AssistantMessage.vue'
import UserMessage from './UserMessage.vue'
import { provideScrollToBottom } from './scrollContext.js'
import type { MessageVersions, SelectMessageVersion } from './BranchSwitcher.types.js'
import styles from './MessageList.module.css'

const props = defineProps<{
  session: Session
  streaming: boolean
}>()

/** 距底部小于该值时视为在底部，流式内容增长时跟随 */
const STICKY_THRESHOLD = 40
const EMPTY_VERSIONS: MessageVersions = { ids: [], index: -1 }

/**
 * 会话共用可重试的附件上传失败入口，覆盖当前提问与历史消息中的附件。
 * 点击后按失败的回答重新补传附件并请求。
 */
const getUploadRetryId = (messages: Message[], streaming: boolean) => {
  const last = messages.at(-1)
  return !streaming &&
    last?.role === 'assistant' &&
    last.status === 'error' &&
    last.error?.kind === 'upload' &&
    last.error.retryable
    ? last.id
    : null
}

const containerRef = ref<HTMLElement | null>(null)
const mobileScrollRef = ref<HTMLElement | null>(null)
const contentRef = ref<HTMLElement | null>(null)

let sticky = true
let scrollTop = 0
let restoreScroll: { messageId: string; top: number } | null = null
let resizeObserver: ResizeObserver | undefined
let removeScrollListener: (() => void) | undefined

const messages = computed(() => getVisibleMessages(props.session))

const previousVersions = shallowRef<ReadonlyMap<string, MessageVersions>>(
  buildMessageVersions(props.session, new Map())
)
const versions = computed(() => {
  const next = buildMessageVersions(props.session, previousVersions.value)
  if (next !== previousVersions.value) {
    previousVersions.value = next
  }
  return next
})

const lastMessageId = computed(() => messages.value.at(-1)?.id)
const lastIndex = computed(() => messages.value.length - 1)
const uploadRetryId = computed(() => getUploadRetryId(messages.value, props.streaming))

const getScrollEl = () => (isMobile.value ? mobileScrollRef.value : containerRef.value)

const scrollToBottom = () => {
  const el = getScrollEl()
  if (el && sticky) {
    el.scrollTop = el.scrollHeight
    scrollTop = el.scrollTop
  }
}

provideScrollToBottom(scrollToBottom)

// 内容、键盘和输入框高度变化时，继续遵循当前跟随状态。
const observeContent = () => {
  resizeObserver?.disconnect()
  resizeObserver = undefined
  const content = contentRef.value
  const scroll = getScrollEl()
  if (!content || !scroll) {
    return
  }
  resizeObserver = new ResizeObserver(scrollToBottom)
  resizeObserver.observe(content)
  resizeObserver.observe(scroll)
}

// 切换版本后将选择器留在原位置，避免回答长短变化导致操作区跳出视口。
const restorePosition = () => {
  const scroll = getScrollEl()
  if (restoreScroll && scroll) {
    const switcher = scroll.querySelector<HTMLElement>(
      `[data-message-version="${CSS.escape(restoreScroll.messageId)}"]`
    )
    if (switcher) {
      scroll.scrollTop += switcher.getBoundingClientRect().top - restoreScroll.top
    }
    restoreScroll = null
    return
  }
  sticky = true
  scrollToBottom()
}

// 跨移动端断点时切换滚动层，并保持输入框及当前阅读位置。
const bindScroll = () => {
  removeScrollListener?.()
  removeScrollListener = undefined
  const el = getScrollEl()
  if (!el) {
    return
  }
  if (sticky) {
    scrollToBottom()
  } else {
    el.scrollTop = scrollTop
  }
  const onScroll = () => {
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < STICKY_THRESHOLD
    // 仅在用户向上滚动时停止跟随底部，布局或内容增高时保持跟随状态。
    if (nearBottom) {
      sticky = true
    } else if (el.scrollTop < scrollTop) {
      sticky = false
    }
    scrollTop = el.scrollTop
  }
  el.addEventListener('scroll', onScroll, { passive: true })
  removeScrollListener = () => el.removeEventListener('scroll', onScroll)
}

const selectVersion: SelectMessageVersion = (messageId, anchorTop) => {
  if (props.streaming) {
    return
  }
  restoreScroll = { messageId, top: anchorTop }
  sticky = false
  closeSearchPanel()
  selectMessageVersion(props.session.id, messageId)
}

watch([() => props.session.id, lastMessageId], () => {
  restorePosition()
  closeSearchPanel()
}, { flush: 'post' })

watch(isMobile, () => {
  observeContent()
  bindScroll()
}, { flush: 'post' })

onMounted(() => {
  observeContent()
  restorePosition()
  closeSearchPanel()
  bindScroll()
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  removeScrollListener?.()
})
</script>

<template>
  <div ref="containerRef" :class="styles.container">
    <div ref="mobileScrollRef" :class="styles.scroll">
      <div ref="contentRef" :class="styles.column">
        <template v-for="(message, index) in messages" :key="message.id">
          <UserMessage
            v-if="message.role === 'user'"
            :session-id="session.id"
            :message="message"
            :retry-upload-id="uploadRetryId"
            :is-first="index === 0"
            :is-last="index === lastIndex || index === lastIndex - 1"
            :busy="streaming"
            :versions="versions.get(message.id) ?? EMPTY_VERSIONS"
            :on-select-version="selectVersion"
          />
          <AssistantMessage
            v-else
            :session-id="session.id"
            :message="message"
            :is-last="index === lastIndex"
            :streaming="streaming && index === lastIndex"
            :busy="streaming"
            :versions="versions.get(message.id) ?? EMPTY_VERSIONS"
            :on-select-version="selectVersion"
          />
        </template>
      </div>
    </div>
    <slot name="footer" />
  </div>
</template>
