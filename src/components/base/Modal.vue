<script setup lang="ts">
import { onBeforeUnmount, useId, watch } from 'vue'
import { useTranslate } from '../../i18n/index.js'
import IconButton from './IconButton.vue'
import { IconCloseOutline16 } from './icons.js'
import styles from './Modal.module.css'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    open?: boolean
    title?: string
    closable?: boolean
    mainClass?: string
  }>(),
  { open: true, title: '', closable: false }
)

const emit = defineEmits<{ close: [] }>()
const t = useTranslate()
const titleId = useId()

/** 当前打开的弹窗，后打开的在末尾；叠放时 Esc 只关闭最上层 */
const openModals: object[] = []

const onKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.open && openModals.at(-1) === token) {
    emit('close')
  }
}

const token = {}
const removeFromStack = () => {
  const index = openModals.indexOf(token)
  if (index !== -1) {
    openModals.splice(index, 1)
  }
}
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      openModals.push(token)
    } else {
      removeFromStack()
    }
  },
  { immediate: true }
)
document.addEventListener('keydown', onKeyDown)
onBeforeUnmount(() => {
  removeFromStack()
  document.removeEventListener('keydown', onKeyDown)
})
</script>

<template>
  <Teleport to="body">
    <Transition
      :enter-active-class="styles.overlayEnterActive"
      :leave-active-class="styles.overlayLeaveActive"
    >
      <div v-if="props.open" :class="styles.overlay" @mousedown.self="emit('close')">
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
    </Transition>
  </Teleport>
</template>
