<script setup lang="ts">
import { computed } from 'vue'
import clsx from 'clsx'
import { useTranslate } from '../../i18n/index.js'
import { describeReply } from '../../services/chat/describe.js'
import { canContinueReply } from '../../services/chat/reply.js'
import { continueReply, regenerateReply } from '../../services/chat/store.js'
import { stopReadAloud } from '../../services/speech/readAloud.js'
import type { AssistantMessage as AssistantMessageType } from '../../services/chat/types.js'
import { IconRefreshOutline16, IconWarningOutline16 } from '../base/icons.js'
import Button from '../base/Button.vue'
import IconButton from '../base/IconButton.vue'
import Markdown from '../markdown/Markdown.vue'
import SiteThumbnails from '../search/SiteThumbnails.vue'
import { toggleSearchPanel, useSearchPanel } from '../search/searchPanelState.js'
import BranchSwitcher from './BranchSwitcher.vue'
import CopyButton from './CopyButton.vue'
import ReadAloudButton from './ReadAloudButton.vue'
import ReplyArea from './ReplyArea.vue'
import { useReplyView } from './useReplyView.js'
import type { MessageVersions, SelectMessageVersion } from './BranchSwitcher.types.js'
import styles from './AssistantMessage.module.css'


const props = defineProps<{
  sessionId: string
  message: AssistantMessageType
  isLast: boolean
  streaming: boolean
  busy: boolean
  versions: MessageVersions
  onSelectVersion: SelectMessageVersion
}>()

const t = useTranslate()
const { view, answer: viewAnswer, sources, searchResults } = useReplyView(
  () => props.message,
  () => props.streaming
)
const panelEntry = useSearchPanel((state) => state.entry)
const notice = computed(() => (props.streaming ? null : describeReply(props.message)))
// 安全拒绝：已下发的思考与正文按协议丢弃，只显示模板答复。
const refused = computed(() => props.message.stopReason === 'refusal')
const answer = computed(() => (refused.value ? null : viewAnswer.value))
const answerMarkdown = computed(() => answer.value?.markdown ?? '')
const noticeText = computed(() => notice.value?.text ?? '')
const noticeIsResponse = computed(() => notice.value?.presentation === 'response')
const responseText = computed(() =>
  [
    answer.value?.text,
    notice.value?.presentation === 'response' ? notice.value.text : null,
  ]
    .filter(Boolean)
    .join('\n\n')
)
const copyText = computed(() => responseText.value || notice.value?.text || '')
const waiting = computed(
  () =>
    props.streaming &&
    view.value.steps.length === 0 &&
    !viewAnswer.value &&
    !props.message.thinking
)
const summaryEntry = computed(() => `${props.message.id}-summary`)
const canContinue = computed(() => canContinueReply(props.message))

const regenerate = () => {
  stopReadAloud()
  regenerateReply(props.sessionId, props.message.id)
}

const continueGeneration = () => {
  stopReadAloud()
  continueReply(props.sessionId, props.message.id)
}
</script>

<template>
  <div :class="styles.message">
    <ReplyArea
      v-if="!refused"
      :message="message"
      :view="view"
      :streaming="streaming"
      :has-response="!!responseText"
    />
    <Markdown
      v-if="answer"
      class-name="ds-assistant-message-main-content"
      :content="answerMarkdown"
      :loading="streaming"
      :cache-key="message.id"
      :disable-link="false"
      :sources="sources"
    />
    <div v-if="waiting" :class="styles.waiting">
      <span v-for="index in 3" :key="index" :class="styles.waitingDot" />
    </div>
    <Markdown
      v-if="noticeIsResponse"
      class-name="ds-assistant-message-main-content"
      :content="noticeText"
      :loading="false"
      :cache-key="`${message.id}-template`"
      :disable-link="false"
    />
    <div v-else-if="notice" :class="styles.notice">
      <IconWarningOutline16 />
      <span>
        {{ noticeText }}
      </span>
    </div>
    <div
      v-if="!streaming && !refused && searchResults.length > 0"
      :class="clsx(styles.summary, panelEntry === summaryEntry && styles.summaryActive)"
      @click="toggleSearchPanel(summaryEntry, searchResults)"
    >
      <SiteThumbnails :sources="searchResults" />
      <span>
        {{
          t(
            searchResults.length === 1 ? 'messageSearchSummary' : 'messageSearchSummaries',
            { count: searchResults.length }
          )
        }}
      </span>
    </div>
    <div v-if="!streaming" :class="styles.bottom">
      <BranchSwitcher :versions="versions" :disabled="busy" :on-select="onSelectVersion" />
      <div :class="clsx(styles.actions, isLast && styles.alwaysShow)">
        <CopyButton v-if="copyText" :text="copyText" />
        <ReadAloudButton v-if="responseText && !refused" :message-id="message.id" :text="responseText" />
        <IconButton
          :tooltip="t('regenerate')"
          tooltip-placement="bottom"
          :disabled="busy || refused"
          @click="regenerate"
        >
          <IconRefreshOutline16 />
        </IconButton>
      </div>
      <Button
        v-if="isLast && canContinue"
        variant="outlined"
        size="s"
        :class="styles.continueButton"
        :disabled="busy"
        @click="continueGeneration"
      >
        {{ t('continueGenerating') }}
      </Button>
    </div>
  </div>
</template>
