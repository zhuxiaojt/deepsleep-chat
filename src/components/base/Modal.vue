<script setup lang="ts">
import { onBeforeUnmount, onMounted, useId } from 'vue'
import { useTranslate } from '../../i18n/index.js'
import IconButton from './IconButton.vue'
import { IconCloseOutline16 } from './icons.js'
import styles from './Modal.module.css'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    title?: string
    closable?: boolean
    mainClass?: string
  }>(),
  { title: '', closable: false }
)

const emit = defineEmits<{ close: [] }>()
const t = useTranslate()
const titleId = useId()

/** 当前打开的弹窗，后打开的在末尾；叠放时 Esc 只关闭最上层 */
const openModals: object[] = []

const onKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && openModals.at(-1) === token) {
    emit('close')
  }
}

const token = {}
onMounted(() => {
  openModals.push(token)
  document.addEventListener('keydown', onKeyDown)
})
onBeforeUnmount(() => {
  openModals.splice(openModals.indexOf(token), 1)
  document.removeEventListener('keydown', onKeyDown)
})
</script>

<template>
  <Teleport to="body">
    <div :class="styles.overlay" @mousedown.self="emit('close')">
      <div
        :class="[styles.content, $attrs.class]"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
      >
        <div :class="styles.header">
          <div :id="titleId" :class="styles.title">
            <slot name="title">{{ props.title }}</slot>
          </div>
          <IconButton
            v-if="closable"
            :class="styles.close"
            tone="primary"
            :tooltip="t('close')"
            @click="emit('close')"
          >
            <IconCloseOutline16 />
          </IconButton>
        </div>
        <div v-if="$slots.default" :class="[styles.main, props.mainClass]">
          <slot />
        </div>
        <div v-if="$slots.footer" :class="styles.footer">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>
