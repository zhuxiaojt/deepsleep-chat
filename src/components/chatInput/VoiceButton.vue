<script setup lang="ts">
import clsx from 'clsx'
import { useTranslate } from '../../i18n/index.js'
import { IconMicFill16, IconMicOutline16 } from '../base/icons.js'
import Tooltip from '../base/Tooltip.vue'
import type { VoiceInputStatus } from './useVoiceInput.js'
import styles from './VoiceButton.module.css'

/**
 * 语音输入按钮。
 * 录音中为两层圆：外层半透明光圈 + 内层实心品牌色；
 * 外层先展开、内层随后放大，之后外层按固定节奏呼吸，与音量无关。
 * 按钮左侧显示「录音中 Ns」，窄屏不展示读秒。
 */
const props = withDefaults(
  defineProps<{
    status: VoiceInputStatus
    /** 非安全上下文中按钮置灰，tooltip 提示录音需要 HTTPS */
    disabled?: boolean
    /** 本次录音已录秒数，录音中显示在按钮左侧 */
    seconds: number
  }>(),
  { disabled: false }
)

const emit = defineEmits<{ click: [] }>()

const t = useTranslate()
const recording = () => props.status === 'recording'

const label = () =>
  props.disabled
    ? t('voiceInputRequiresHttps')
    : recording()
      ? t('voiceInputStop')
      : props.status === 'transcribing'
        ? t('voiceInputCancel')
        : t('voiceInput')
</script>

<template>
  <span v-if="recording()" :class="styles.timer">
    {{ t('voiceInputTimer', { seconds: props.seconds }) }}
  </span>
  <Tooltip :content="label()">
    <button
      type="button"
      :class="clsx(styles.button, recording() && styles.recording, props.disabled && styles.disabled)"
      :aria-label="label()"
      :aria-pressed="recording()"
      :aria-disabled="props.disabled"
      @click="!props.disabled && emit('click')"
    >
      <span v-if="recording()" :class="styles.active">
        <span :class="styles.halo" />
        <span :class="styles.core" />
        <span :class="styles.outline">
          <IconMicOutline16 />
        </span>
        <span :class="styles.glyph">
          <IconMicFill16 />
        </span>
      </span>
      <span v-else-if="props.status === 'transcribing'" :class="styles.loading" />
      <IconMicOutline16 v-else />
    </button>
  </Tooltip>
</template>
