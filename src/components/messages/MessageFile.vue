<script setup lang="ts">
import { computed, ref } from 'vue'
import clsx from 'clsx'
import { useTranslate } from '../../i18n/index.js'
import { useUploads } from '../../services/attachments.js'
import type { FileAttachment } from '../../services/chat/types.js'
import { IconPhotoErrorFill20, IconRefreshOutline16 } from '../base/icons.js'
import Tooltip from '../base/Tooltip.vue'
import FileCard from '../files/FileCard.vue'
import { useFileView } from '../files/useFileView.js'
import styles from './MessageFile.module.css'

const props = defineProps<{
  file: FileAttachment
  /** 本条消息补传失败且可重试时提供 */
  onRetry: (() => void) | null
}>()

const t = useTranslate()
const { image, url, link } = useFileView(props.file.id, props.file.name)
const failedUrl = ref<string | null>(null)

/** 历史或失效附件的补传状态：只在还没有 serverId 时显示 */
const upload = useUploads((state) => {
  if (props.file.serverId) {
    return null
  }
  const task = state.tasks[props.file.id]
  return task?.status === 'uploading' || task?.status === 'error' ? task : null
})

const uploading = computed(() => upload.value?.status === 'uploading')
const failed = computed(() => upload.value?.status === 'error')
const retryable = computed(() => {
  const task = upload.value
  return task?.status === 'error' && task.retryable
})
const retry = computed(() => (retryable.value ? props.onRetry : null))
const errorText = computed(() => {
  const task = upload.value
  return task?.status === 'error' ? t(task.error.key, task.error.params) : undefined
})
const reason = computed(() => {
  const text = errorText.value
  return text && text !== t('uploadFileStatusFailed') ? text : null
})
const retryLabel = computed(() =>
  t('uploadRetry', { message: errorText.value ?? t('uploadFileStatusFailed') })
)
const cardStatus = computed<'uploading' | 'error' | 'done'>(() =>
  uploading.value ? 'uploading' : failed.value ? 'error' : 'done'
)
const previewFailed = computed(() => url.value !== null && failedUrl.value === url.value)
</script>

<template>
  <template v-if="image && url !== null">
    <!-- 上传中：本地原件已在 IndexedDB，先垫在蒙层下显示，避免只有一块灰色占位 -->
    <div v-if="uploading" :class="clsx(styles.image, styles.imageThumb)" :title="file.name">
      <span v-if="previewFailed" :class="styles.failedIcon" role="img" :aria-label="file.name">
        <IconPhotoErrorFill20 />
      </span>
      <img v-else-if="url" :src="url" :alt="file.name" @error="failedUrl = url" />
      <div :class="styles.overlay">
        <span :class="styles.spinner" />
      </div>
    </div>

    <!-- 上传失败不可重试：保留缩略图，底部渐变显示原因 -->
    <div
      v-else-if="failed && !retry"
      :class="clsx(styles.image, styles.imageThumb)"
      :title="errorText"
      :aria-label="errorText"
    >
      <span v-if="previewFailed || !url" :class="styles.failedIcon">
        <IconPhotoErrorFill20 />
      </span>
      <img v-else :src="url" :alt="file.name" @error="failedUrl = url" />
      <span v-if="reason" :class="styles.reason">{{ reason }}</span>
    </div>

    <!-- 上传失败可重试：缩略图 + 红色描边 + 蒙层重试图标，原因在底部 -->
    <Tooltip v-else-if="failed && retry" :content="retryLabel">
      <button
        type="button"
        :class="clsx(styles.image, styles.imageThumb, styles.retryImage)"
        :aria-label="retryLabel"
        @click="retry?.()"
      >
        <span v-if="previewFailed" :class="styles.failedIcon" role="img" :aria-label="file.name">
          <IconPhotoErrorFill20 />
        </span>
        <img v-else-if="url" :src="url" :alt="file.name" @error="failedUrl = url" />
        <div :class="clsx(styles.overlay, styles.retryOverlay)">
          <IconRefreshOutline16 />
        </div>
        <span v-if="reason" :class="styles.reason">{{ reason }}</span>
      </button>
    </Tooltip>

    <!-- 正常态：链接到原件 -->
    <a
      v-else-if="link"
      v-bind="link"
      :class="clsx(styles.image, styles.imageThumb)"
      :title="file.name"
    >
      <span v-if="previewFailed" :class="styles.failedIcon" role="img" :aria-label="file.name">
        <IconPhotoErrorFill20 />
      </span>
      <img v-else-if="url" :src="url" :alt="file.name" @error="failedUrl = url" />
    </a>

    <!-- 原件还没加载出来（极短暂） -->
    <div v-else :class="styles.image" />
  </template>
  <FileCard
    v-else
    :name="file.name"
    :size="file.size"
    :status="cardStatus"
    :error="errorText"
    :link="link"
    v-on="retry ? { retry } : {}"
  />
</template>
