<script setup lang="ts">
import { useMobileSider } from './mobileSiderState.js'
import { closeMobileSider } from './mobileSiderState.js'
import Sider from './Sider.vue'
import styles from './Sider.module.css'

const open = useMobileSider((state) => state.open)
</script>

<template>
  <template v-if="open">
    <div :class="styles.drawerMask" @click="closeMobileSider" />
    <div :class="styles.drawer">
      <Sider mobile />
    </div>
  </template>
</template>
