import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { getFileViewType, isImage } from '../../services/attachments.js'
import { loadFile } from '../../services/chat/db.js'

/** 文件卡片的链接属性：图片或 PDF 新标签打开，其余下载 */
export type FileViewLink = {
  href: string
  target?: string
  rel?: string
  download?: string | boolean
}

const createViewUrl = (original: Blob, type: string) => {
  const blob = original.slice(0, original.size, type || 'application/octet-stream')
  if (type !== 'image/svg+xml') {
    return URL.createObjectURL(blob)
  }
  // SVG 缩略图用 data: 地址，单独打开图片时也与应用隔离。
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/** 草稿传 File，已发送的附件传 IndexedDB 原件 ID。 */
export const useFileView = (
  source: MaybeRefOrGetter<File | string>,
  name: MaybeRefOrGetter<string>
) => {
  const type = computed(() => getFileViewType(toValue(name)))
  const state = ref<{ source: File | string; type: string; url: string | null }>()

  watch(
    [() => toValue(source), type],
    ([current, currentType], _previous, onCleanup) => {
      let active = true
      const original = typeof current === 'string' ? loadFile(current) : Promise.resolve(current)
      const pending = original
        .then((blob) => (active && blob ? createViewUrl(blob, currentType) : null))
        .catch(() => null)
      void pending.then((url) => {
        if (active) {
          state.value = { source: current, type: currentType, url }
        }
      })
      onCleanup(() => {
        active = false
        void pending.then((url) => {
          if (url?.startsWith('blob:')) {
            URL.revokeObjectURL(url)
          }
        })
      })
    },
    { immediate: true }
  )

  const url = computed(() => {
    const current = state.value
    return current?.source === toValue(source) && current.type === type.value
      ? current.url
      : undefined
  })
  const image = computed(() => isImage(type.value))
  const link = computed<FileViewLink | undefined>(() => {
    if (!url.value) {
      return undefined
    }
    const openInTab = type.value === 'application/pdf' || (image.value && type.value !== 'image/svg+xml')
    const action = openInTab
      ? { target: '_blank', rel: 'noreferrer' }
      : { download: toValue(name) }
    return { href: url.value, ...action }
  })

  return { url, image, link }
}
