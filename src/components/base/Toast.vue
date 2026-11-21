<script setup lang="ts">
import { computed } from 'vue'
import { useTranslate } from '../../i18n/index.js'
import { IconToastError16 } from './icons.js'
import { useToast } from './toastState.js'
import styles from './Toast.module.css'

const t = useTranslate()
const id = computed(() => useToast.getState().id)
const message = computed(() => useToast.getState().message)
const error = computed(() => typeof message.value !== 'string' && message.value?.type === 'error')
</script>

<template>
  <div
    v-if="message"
    :key="id"
    :class="[styles.toast, error && styles.error]"
    role="status"
  >
    <template v-if="typeof message === 'string'">{{ message }}</template>
    <template v-else>
      <span v-if="error" :class="styles.icon"><IconToastError16 /></span>
      <span :class="styles.content">
        {{ t(message.key, message.params) }}
        <a
          v-if="message.link"
          :class="styles.link"
          :href="message.link.href"
          target="_blank"
          rel="noreferrer"
        >{{ t(message.link.key) }}</a>
      </span>
    </template>
  </div>
</template>
