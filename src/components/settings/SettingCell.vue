<script setup lang="ts">
import clsx from 'clsx'
import { useTranslate, type TranslationKey, type TranslationMessage } from '../../i18n/index.js'
import styles from './Settings.module.css'

/** 失败原因文案 key 的提示；error 时以错误色展示。 */
type Status = (TranslationMessage & { error?: boolean; reason?: TranslationKey }) | null

withDefaults(
  defineProps<{
    label: string
    description?: string
    status?: Status
  }>(),
  { description: '', status: null }
)

const t = useTranslate()
</script>

<template>
  <div :class="clsx(styles.cell, styles.row)">
    <div :class="styles.text">
      <div :class="styles.label">{{ label }}</div>
      <div
        v-if="status || description"
        :class="clsx(styles.description, status?.error && styles.error)"
      >
        {{
          status
            ? t(status.key, status.reason ? { message: t(status.reason) } : status.params)
            : description
        }}
      </div>
    </div>
    <slot name="action" />
  </div>
</template>
