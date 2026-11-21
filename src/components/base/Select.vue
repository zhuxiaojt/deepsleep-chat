<script setup lang="ts">
import { ref } from 'vue'
import { useAnchoredPosition, useDismiss } from './anchored.js'
import { IconCheckOutline16, IconChevronDownOutline14 } from './icons.js'
import styles from './Select.module.css'

defineOptions({ inheritAttrs: false })

export type SelectOption = { value: string; label: string; lang?: string }

const props = withDefaults(
  defineProps<{
    value: string
    options: SelectOption[]
    placeholder?: string
    ariaLabel?: string
    disabled?: boolean
  }>(),
  { placeholder: '', ariaLabel: '', disabled: false }
)

const emit = defineEmits<{ change: [value: string] }>()

const open = ref(false)
const close = () => (open.value = false)
const { anchorRef, floatingRef, position } = useAnchoredPosition(open, {
  align: 'end',
  maxHeight: 320,
  minSpace: 160,
})
useDismiss(open, [anchorRef, floatingRef], close, { captureEscape: true })

const current = () => props.options.find((option) => option.value === props.value)
const choose = (value: string) => {
  close()
  emit('change', value)
}
</script>

<template>
  <button
    ref="anchorRef"
    type="button"
    v-bind="$attrs"
    :class="[styles.trigger, open && styles.open]"
    :aria-label="ariaLabel"
    aria-haspopup="listbox"
    :aria-expanded="open"
    :disabled="disabled"
    @click="open = !open"
  >
    <span v-if="current()" :lang="current()?.lang">{{ current()?.label }}</span>
    <span v-else :class="styles.placeholder">{{ placeholder }}</span>
    <span :class="styles.arrow"><IconChevronDownOutline14 /></span>
  </button>
  <Teleport to="body">
    <div
      v-if="open && !disabled"
      ref="floatingRef"
      :class="styles.menu"
      :style="position ?? undefined"
      role="listbox"
      :aria-label="ariaLabel"
    >
      <div
        v-for="option in options"
        :key="option.value"
        role="option"
        :lang="option.lang"
        :aria-selected="option.value === value"
        :class="styles.option"
        @click="choose(option.value)"
      >
        <span>{{ option.label }}</span>
        <IconCheckOutline16 v-if="option.value === value" />
      </div>
    </div>
  </Teleport>
</template>
