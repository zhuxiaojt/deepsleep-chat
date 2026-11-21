<script setup lang="ts">
import { computed } from 'vue'
import { useTranslate } from '../../i18n/index.js'
import {
  describeReadAloudError,
  toggleReadAloud,
  useReadAloud,
} from '../../services/speech/readAloud.js'
import { IconPlayMediaOutline16 } from '../base/icons.js'
import IconButton from '../base/IconButton.vue'
import { showToast } from '../base/toastState.js'
import ReadingBars from './ReadingBars.vue'

/** 朗读按钮：未朗读时点击开始，加载中或朗读中点击停止；正文原样提交，由服务端过滤 markdown */
const props = defineProps<{ messageId: string; text: string }>()

const t = useTranslate()
const status = useReadAloud((state) =>
  state.messageId === props.messageId ? state.status : 'idle'
)
const barsMode = computed<'loading' | 'playing'>(() =>
  status.value === 'playing' ? 'playing' : 'loading'
)

const toggle = () => {
  toggleReadAloud(props.messageId, props.text, (error) =>
    showToast(describeReadAloudError(error))
  )
}
</script>

<template>
  <IconButton
    :tooltip="status === 'idle' ? t('ttsPlay') : t('ttsStop')"
    tooltip-placement="bottom"
    @click="toggle"
  >
    <IconPlayMediaOutline16 v-if="status === 'idle'" />
    <ReadingBars v-else :mode="barsMode" />
  </IconButton>
</template>
