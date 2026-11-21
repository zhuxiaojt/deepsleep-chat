<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { useTranslate } from '../../i18n/index.js'
import { IconCheckOutline16, IconCopyOutline16 } from '../base/icons.js'
import IconButton from '../base/IconButton.vue'
import { showToast } from '../base/toastState.js'
import { copyText as writeClipboard } from '../../utils/clipboard.js'

/** 复制成功后图标换成对勾 1 秒，期间再次点击不重复复制 */
const props = defineProps<{ text: string }>()

const t = useTranslate()
const copied = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

onBeforeUnmount(() => clearTimeout(timer))

const copy = async () => {
  if (copied.value) {
    return
  }
  if (!(await writeClipboard(props.text))) {
    showToast({ key: 'copyFailed' })
    return
  }
  copied.value = true
  timer = setTimeout(() => (copied.value = false), 1000)
}
</script>

<template>
  <IconButton :tooltip="t('copy')" tooltip-placement="bottom" @click="copy">
    <IconCheckOutline16 v-if="copied" />
    <IconCopyOutline16 v-else />
  </IconButton>
</template>
