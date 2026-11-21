<script setup lang="ts">
import { ref, type Component } from 'vue'
import { useAnchoredPosition, useDismiss } from './anchored.js'
import styles from './Menu.module.css'

defineOptions({ inheritAttrs: false })

type MenuOption = {
  key: string
  label: string
  icon?: Component
  danger?: boolean
  onSelect: () => void
}

const props = defineProps<{ options: MenuOption[] }>()

const open = ref(false)
const close = () => (open.value = false)
const toggle = () => (open.value = !open.value)

const { anchorRef, floatingRef, position } = useAnchoredPosition(open, {
  align: 'start',
  alignOffset: -5,
  offset: 4,
})
useDismiss(open, [anchorRef, floatingRef], close)

const select = (option: MenuOption) => {
  close()
  option.onSelect()
}
</script>

<template>
  <span ref="anchorRef" :class="styles.anchor">
    <slot :open="open" :toggle="toggle" />
  </span>
  <Teleport to="body">
    <Transition :enter-active-class="styles.menuEnterActive" :leave-active-class="styles.menuLeaveActive">
      <div
        v-if="open"
        ref="floatingRef"
        :class="styles.menu"
        :style="position ?? undefined"
        role="menu"
      >
        <div
          v-for="option in props.options"
          :key="option.key"
          role="menuitem"
          :class="[styles.option, option.danger && styles.danger]"
          @click="select(option)"
        >
          <span :class="styles.icon">
            <component :is="option.icon" v-if="option.icon" />
          </span>
          {{ option.label }}
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
