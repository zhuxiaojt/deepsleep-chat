import { onMounted, onUnmounted, ref, watch, type Ref } from 'vue'

/** 窄于 768px 按移动端布局 */
const query = window.matchMedia('not all and (min-width: 768px)')

/** 全局响应式移动端标记，模板中直接使用会自动解包 */
export const isMobile = ref(query.matches)
query.addEventListener('change', () => {
  isMobile.value = query.matches
})

export const useIsMobile = () => isMobile

const preventPageScroll = (event: TouchEvent) => {
  if (event.touches.length !== 1) {
    return
  }
  for (
    let element = event.target instanceof Element ? event.target : null;
    element && element !== document.body;
    element = element.parentElement
  ) {
    const style = getComputedStyle(element)
    const scrollsY = /auto|scroll/.test(style.overflowY) && element.scrollHeight > element.clientHeight
    const scrollsX = /auto|scroll/.test(style.overflowX) && element.scrollWidth > element.clientWidth
    if (scrollsY || scrollsX) {
      return
    }
  }
  event.preventDefault()
}

/** 阻止移动端整页滚动，保留内部可滚动区域的滚动和双指缩放。 */
export const usePreventPageScroll = (enabled: Ref<boolean>) => {
  let remove: (() => void) | undefined
  watch(
    enabled,
    (on) => {
      remove?.()
      remove = undefined
      if (on) {
        document.addEventListener('touchmove', preventPageScroll, { passive: false })
        remove = () => document.removeEventListener('touchmove', preventPageScroll)
      }
    },
    { immediate: true }
  )
  onUnmounted(() => remove?.())
}

/** 移动端页面跟随视觉视口，键盘弹出后顶栏和输入框仍留在可见区域。 */
export const useMobileViewport = (enabled: Ref<boolean>) => {
  const frameRef = ref<HTMLElement | null>(null)
  let cleanup: (() => void) | undefined

  const setup = (on: boolean) => {
    cleanup?.()
    cleanup = undefined
    const frame = frameRef.value
    if (!on || !frame) {
      return
    }
    const viewport = window.visualViewport
    const inputSelector = 'textarea, input:not([type="file"])'
    let animationFrame = 0
    const reset = () => {
      frame.style.removeProperty('--app-viewport-height')
      frame.style.removeProperty('--app-viewport-top')
    }
    const update = () => {
      if (viewport && viewport.scale !== 1) {
        return
      }
      if (!document.activeElement?.matches(inputSelector)) {
        reset()
        return
      }
      frame.style.setProperty('--app-viewport-height', `${viewport?.height ?? window.innerHeight}px`)
      frame.style.setProperty('--app-viewport-top', `${viewport?.offsetTop ?? 0}px`)
    }
    const scheduleFrame = () => {
      cancelAnimationFrame(animationFrame)
      animationFrame = requestAnimationFrame(update)
    }
    const schedule = () => {
      update()
      scheduleFrame()
    }
    const onFocusIn = () => {
      if (document.activeElement?.matches(inputSelector)) {
        schedule()
      }
    }

    update()
    viewport?.addEventListener('resize', schedule)
    viewport?.addEventListener('scroll', schedule)
    window.addEventListener('resize', schedule)
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', scheduleFrame)
    cleanup = () => {
      cancelAnimationFrame(animationFrame)
      viewport?.removeEventListener('resize', schedule)
      viewport?.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', scheduleFrame)
      reset()
    }
  }

  onMounted(() => {
    watch(frameRef, () => setup(enabled.value), { immediate: true })
    watch(enabled, setup)
  })
  onUnmounted(() => cleanup?.())

  return frameRef
}
