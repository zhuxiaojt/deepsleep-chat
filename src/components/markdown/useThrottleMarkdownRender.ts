import {
  computed,
  onScopeDispose,
  ref,
  toValue,
  watch,
  type ComputedRef,
  type Ref,
} from 'vue'

/** 两次更新的最长间隔 */
const MAX_WAIT = 2000
/** 上次渲染耗时的倍数，过了这段时间才允许下次更新 */
const TIME_CONSUMING_RATE = 2

/**
 * 流式过程中按渲染耗时节流 Markdown 内容的更新：
 * 更新输出时记录开始时间，提交后按耗时 × TIME_CONSUMING_RATE（不超过 MAX_WAIT）
 * 算出下次允许更新的时间点；新内容在到期时更新，连续输入合并为最新内容。
 * 关闭节流时直接返回最新内容。
 */
export const useThrottleMarkdownRender = (
  content: Ref<string> | string,
  enable: Ref<boolean> | boolean
): ComputedRef<string> => {
  // 首次渲染从挂载时开始计时
  const start = ref(performance.now())
  const updatableAt = ref(start.value)
  const output = ref(toValue(content))
  let timer: ReturnType<typeof setTimeout> | undefined

  const clearTimer = () => {
    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }
  }

  watch(output, () => {
    const now = performance.now()
    updatableAt.value = now + Math.min(MAX_WAIT, (now - start.value) * TIME_CONSUMING_RATE)
  })

  watch(
    [() => toValue(content), () => toValue(enable)],
    ([value, enabled]) => {
      clearTimer()
      if (!enabled) {
        return
      }
      const update = () => {
        timer = undefined
        start.value = performance.now()
        output.value = value
      }
      const delay = updatableAt.value - performance.now()
      if (delay <= 0) {
        update()
        return
      }
      timer = setTimeout(update, delay)
    },
    { immediate: true }
  )

  onScopeDispose(clearTimer)

  return computed(() => (toValue(enable) ? output.value : toValue(content)))
}
