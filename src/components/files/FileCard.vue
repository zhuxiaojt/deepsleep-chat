<script setup lang="ts">
import { computed, getCurrentInstance } from 'vue'
import clsx from 'clsx'
import { useTranslate } from '../../i18n/index.js'
import { formatSize, getExtension } from '../../services/attachments.js'
import { IconCloseFill14, IconRefreshOutline16 } from '../base/icons.js'
import FileIcon from './FileIcon.vue'
import styles from './FileCard.module.css'

/**
 * 文档文件卡片：图标 + 文件名 + 「扩展名 大小」或状态文案。
 * 输入框内失败时描边和说明标红；可重试时显示刷新图标，不可重试时常显红色删除按钮。
 * 消息里的不可重试文件保留普通边框和状态说明。
 */
const props = withDefaults(
  defineProps<{
    name: string
    size: number
    status?: 'uploading' | 'done' | 'error'
    error?: string
    link?: { href: string; target?: string; rel?: string; download?: string | boolean }
  }>(),
  { status: 'done' }
)

const emit = defineEmits<{ retry: []; remove: [] }>()

const t = useTranslate()
const instance = getCurrentInstance()

/** 事件监听在 vnode.props 上，用来区分「可重试 / 可删除」 */
const hasRetry = () => typeof instance?.vnode.props?.onRetry === 'function'
const hasRemove = () => typeof instance?.vnode.props?.onRemove === 'function'

const ext = computed(() => getExtension(props.name))
const description = computed(() => {
  if (props.status === 'uploading') {
    return t('uploadFileStatusUploading')
  }
  if (props.status === 'error') {
    return props.error ?? t('uploadFileStatusFailed')
  }
  return [ext.value, formatSize(props.size)].filter(Boolean).join(' ')
})

const isRetryable = () => props.status === 'error' && hasRetry()
const fileLink = computed(() => (props.status === 'done' ? props.link : undefined))
const isClickable = () => isRetryable() || Boolean(fileLink.value)
const cardTitle = () => {
  if (props.status !== 'error') {
    return props.name
  }
  const message = description.value
  return hasRetry() ? t('uploadRetry', { message }) : message
}

const handleClick = () => {
  if (isRetryable()) {
    emit('retry')
  }
}

const handleRemove = (event: MouseEvent) => {
  event.stopPropagation()
  emit('remove')
}
</script>

<template>
  <div
    :class="
      clsx(
        styles.card,
        hasRemove() && styles.editable,
        status === 'error' && (hasRemove() || hasRetry()) && styles.failed,
        isClickable() && styles.clickable
      )
    "
    :title="cardTitle()"
    @click="handleClick"
  >
    <div :class="clsx(styles.icon, isRetryable() && styles.retry)">
      <span v-if="status === 'uploading'" :class="styles.spinner" />
      <IconRefreshOutline16 v-else-if="isRetryable()" />
      <FileIcon v-else :ext="ext" />
    </div>
    <div :class="styles.content">
      <div :class="styles.caption">{{ name }}</div>
      <div :class="styles.subCaption">{{ description }}</div>
    </div>
    <a v-if="fileLink" v-bind="fileLink" :aria-label="name" />
    <button
      v-if="hasRemove()"
      type="button"
      :class="clsx(styles.remove, status === 'error' && !hasRetry() && styles.invalidRemove)"
      :aria-label="t('delete')"
      @click="handleRemove"
    >
      <IconCloseFill14 />
    </button>
  </div>
</template>
