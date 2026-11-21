<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue'
import clsx from 'clsx'
import { useTranslate } from '../../i18n/index.js'
import {
  getFileViewType,
  isImage,
  useUploads,
  type UploadTask,
} from '../../services/attachments.js'
import type { DraftAttachment } from '../../services/chat/drafts.js'
import { IconCloseFill14, IconRefreshOutline16 } from '../base/icons.js'
import Tooltip from '../base/Tooltip.vue'
import FileCard from '../files/FileCard.vue'
import styles from './ChatInput.module.css'

const props = defineProps<{ items: DraftAttachment[] }>()
const emit = defineEmits<{ retry: [id: string]; remove: [id: string] }>()

const t = useTranslate()

const UPLOADING: UploadTask = { status: 'uploading' }
const tasks = useUploads((state) => state.tasks)

const statusOf = (item: DraftAttachment) => tasks.value[item.id] ?? UPLOADING
const isRetryable = (item: DraftAttachment) => {
  const task = statusOf(item)
  return task.status === 'error' && task.retryable
}
const errorOf = (item: DraftAttachment) => {
  const task = statusOf(item)
  return task.status === 'error' ? t(task.error.key, task.error.params) : undefined
}
const retryLabel = (item: DraftAttachment) =>
  t('uploadRetry', { message: errorOf(item) ?? t('uploadFileStatusFailed') })
const showReason = (item: DraftAttachment) => {
  const message = errorOf(item)
  return statusOf(item).status === 'error' && message !== undefined && message !== t('uploadFileStatusFailed')
}

type FileLink = { href: string; target?: string; rel?: string; download?: string }

/** 草稿里是本地 File，直接生成 blob 视图地址 */
const objectUrls = new Map<string, string>()

const revoke = (id: string) => {
  const url = objectUrls.get(id)
  if (url) {
    URL.revokeObjectURL(url)
    objectUrls.delete(id)
  }
}

const createView = (item: DraftAttachment): { image: boolean; url: string; link: FileLink } => {
  const type = getFileViewType(item.file.name)
  const image = isImage(type)
  const openInTab = type === 'application/pdf' || (image && type !== 'image/svg+xml')
  let url = objectUrls.get(item.id)
  if (!url) {
    const blob = item.file.slice(0, item.file.size, type || 'application/octet-stream')
    url = URL.createObjectURL(blob)
    objectUrls.set(item.id, url)
  }
  return {
    image,
    url,
    link: openInTab ? { href: url, target: '_blank', rel: 'noreferrer' } : { href: url, download: item.file.name },
  }
}

const views = computed(() => new Map(props.items.map((item) => [item.id, createView(item)])))

const imageUrlOf = (item: DraftAttachment) => {
  const view = views.value.get(item.id)
  return view && view.image ? view.url : null
}
const imageLinkOf = (item: DraftAttachment) =>
  statusOf(item).status === 'done' && imageUrlOf(item) ? views.value.get(item.id)?.link : undefined
const fileLinkOf = (item: DraftAttachment) =>
  statusOf(item).status === 'done' ? views.value.get(item.id)?.link : undefined

watch(
  () => props.items.map((item) => item.id).join(','),
  () => {
    const ids = new Set(props.items.map((item) => item.id))
    for (const id of [...objectUrls.keys()]) {
      if (!ids.has(id)) {
        revoke(id)
      }
    }
  }
)

onBeforeUnmount(() => {
  for (const id of [...objectUrls.keys()]) {
    revoke(id)
  }
})
</script>

<template>
  <div v-if="props.items.length > 0" :class="styles.attachments">
    <template v-for="item in props.items" :key="item.id">
      <div
        v-if="imageUrlOf(item) !== null"
        :class="clsx(styles.attachment, statusOf(item).status === 'error' && styles.attachmentFailed)"
        :title="errorOf(item) ?? item.file.name"
      >
        <a v-if="imageLinkOf(item)" v-bind="imageLinkOf(item)">
          <img :src="imageUrlOf(item) ?? ''" :alt="item.file.name" />
        </a>
        <img v-else :src="imageUrlOf(item) ?? ''" :alt="item.file.name" />
        <div v-if="statusOf(item).status === 'uploading'" :class="styles.uploading" />
        <Tooltip v-if="statusOf(item).status === 'error' && isRetryable(item)" :content="retryLabel(item)">
          <button
            type="button"
            :class="styles.failed"
            :aria-label="retryLabel(item)"
            @click="emit('retry', item.id)"
          >
            <IconRefreshOutline16 />
            <span v-if="showReason(item)" :class="styles.failedReason">{{ errorOf(item) }}</span>
          </button>
        </Tooltip>
        <div
          v-if="statusOf(item).status === 'error' && !isRetryable(item)"
          :class="clsx(styles.failed, styles.failedStatic)"
          :aria-label="errorOf(item)"
        >
          <span v-if="showReason(item)" :class="styles.failedReason">{{ errorOf(item) }}</span>
        </div>
        <button
          type="button"
          :class="clsx(styles.remove, statusOf(item).status === 'error' && !isRetryable(item) && styles.invalidRemove)"
          :aria-label="t('delete')"
          @click="emit('remove', item.id)"
        >
          <IconCloseFill14 />
        </button>
      </div>
      <FileCard
        v-else
        :name="item.file.name"
        :size="item.file.size"
        :status="statusOf(item).status"
        :link="fileLinkOf(item)"
        :error="errorOf(item)"
        v-on="isRetryable(item) ? { retry: () => emit('retry', item.id) } : {}"
        @remove="emit('remove', item.id)"
      />
    </template>
  </div>
</template>
