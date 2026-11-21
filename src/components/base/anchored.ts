import { nextTick, onBeforeUnmount, ref, watch, type Ref } from 'vue'

/** 浮层与视口边缘的最小间距 */
export const VIEWPORT_PADDING = 8

export type Side = 'top' | 'bottom'
export type Align = 'start' | 'center' | 'end'
export type TooltipPlacement = Side

export type AnchoredPosition = {
  top: number
  left?: number
  right?: number
  maxHeight?: number
}

export type AnchoredOptions = {
  side?: Side
  align?: Align
  alignOffset?: number
  offset?: number
  maxHeight?: number
  minSpace?: number
  /** 用触发元素的第一个子元素作为测量与对齐基准（触发元素自身 display: contents） */
  measureFirstChild?: boolean
  /** 内容标识，变化时同步重新测量 */
  measureKey?: unknown
}

const clampLeft = (left: number, width: number) =>
  Math.max(VIEWPORT_PADDING, Math.min(left, window.innerWidth - width - VIEWPORT_PADDING))

const alignLeft = (anchor: DOMRect, width: number, align: Align, alignOffset: number) => {
  if (align === 'center') {
    return clampLeft(anchor.left + anchor.width / 2 - width / 2 + alignOffset, width)
  }
  if (align === 'end') {
    return Math.max(VIEWPORT_PADDING, anchor.right - width + alignOffset)
  }
  return clampLeft(anchor.left + alignOffset, width)
}

const resolveSide = (spaceAbove: number, spaceBelow: number, preferred: Side, needed: number) => {
  const fitsAbove = spaceAbove >= needed
  const fitsBelow = spaceBelow >= needed
  if (fitsAbove && !fitsBelow) {
    return 'top'
  }
  if (fitsBelow && !fitsAbove) {
    return 'bottom'
  }
  if (fitsAbove) {
    return preferred
  }
  return spaceAbove > spaceBelow ? 'top' : 'bottom'
}

/** 相对触发元素给浮层定位；浮层挂到 body 后按视口坐标摆放，挂载前 position 为 null。 */
export const useAnchoredPosition = (open: Ref<boolean>, options: AnchoredOptions = {}) => {
  const anchorRef = ref<HTMLElement | null>(null)
  const floatingRef = ref<HTMLElement | null>(null)
  const position = ref<AnchoredPosition | null>(null)
  let cleanup: (() => void) | undefined

  const getAnchor = () =>
    options.measureFirstChild
      ? (anchorRef.value?.firstElementChild as HTMLElement | null)
      : anchorRef.value

  /** 除了更新 ref，也直接写入 DOM，避免样式绑定未生效时浮层落在 (0,0) */
  const apply = (value: AnchoredPosition | null) => {
    position.value = value
    const element = floatingRef.value
    if (!element) {
      return
    }
    if (!value) {
      element.style.removeProperty('top')
      element.style.removeProperty('left')
      element.style.removeProperty('right')
      element.style.removeProperty('max-height')
      return
    }
    element.style.top = `${value.top}px`
    if (value.left === undefined) {
      element.style.removeProperty('left')
    } else {
      element.style.left = `${value.left}px`
    }
    if (value.right === undefined) {
      element.style.removeProperty('right')
    } else {
      element.style.right = `${value.right}px`
    }
    if (value.maxHeight === undefined) {
      element.style.removeProperty('max-height')
    } else {
      element.style.maxHeight = `${value.maxHeight}px`
    }
    element.style.visibility = ''
  }

  /** 触发元素若因 hover 结束被隐藏（display:none），保留最后一次有效位置继续定位 */
  let lastAnchorRect: DOMRect | null = null

  const update = () => {
    const anchor = getAnchor()
    const floating = floatingRef.value
    if (!anchor || !floating) {
      return
    }
    const offset = options.offset ?? 4
    const align = options.align ?? 'start'
    const alignOffset = options.alignOffset ?? 0
    const side = options.side ?? 'bottom'
    const minSpace = options.minSpace ?? 160
    let rect = anchor.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) {
      if (!lastAnchorRect) {
        return
      }
      rect = lastAnchorRect
    } else {
      lastAnchorRect = rect
    }
    const spaceAbove = rect.top - offset - VIEWPORT_PADDING
    const spaceBelow = window.innerHeight - rect.bottom - offset - VIEWPORT_PADDING

    if (options.maxHeight === undefined) {
      const { width, height } = floating.getBoundingClientRect()
      const resolved = resolveSide(spaceAbove, spaceBelow, side, height)
      apply({
        top: resolved === 'top' ? rect.top - offset - height : rect.bottom + offset,
        left: alignLeft(rect, width, align, alignOffset),
      })
      return
    }

    const resolved = resolveSide(spaceAbove, spaceBelow, side, minSpace)
    const available = Math.max(0, resolved === 'top' ? spaceAbove : spaceBelow)
    const height = Math.max(40, Math.min(options.maxHeight, available, floating.scrollHeight + 2))
    apply({
      top:
        resolved === 'top'
          ? Math.max(VIEWPORT_PADDING, rect.top - offset - height)
          : rect.bottom + offset,
      right: Math.max(VIEWPORT_PADDING, window.innerWidth - rect.right),
      maxHeight: height,
    })
  }

  const observe = () => {
    cleanup?.()
    cleanup = undefined
    if (!open.value) {
      lastAnchorRect = null
      // 保留最后一次坐标，退出动画期间浮层不会回落到 (0,0)
      return
    }
    const floating = floatingRef.value
    if (floating) {
      // 首个同步定位前先隐藏，避免在 (0,0) 闪一下
      floating.style.visibility = 'hidden'
    }
    update()
    void nextTick(() => {
      update()
      const element = floatingRef.value
      if (!element) {
        return
      }
      if (position.value) {
        element.style.visibility = ''
      }
      const anchor = getAnchor()
      const observer = new ResizeObserver(() => update())
      observer.observe(element)
      if (anchor) {
        observer.observe(anchor)
      }
      window.addEventListener('scroll', update, { capture: true, passive: true })
      window.addEventListener('resize', update, { passive: true })
      cleanup = () => {
        observer.disconnect()
        window.removeEventListener('scroll', update, { capture: true })
        window.removeEventListener('resize', update)
      }
    })
  }

  watch([open, floatingRef, () => options.measureKey], observe, { immediate: true, flush: 'post' })
  onBeforeUnmount(() => cleanup?.())

  return { anchorRef, floatingRef, position }
}

/** 点击浮层与触发元素之外、或按 Esc 时关闭 */
export const useDismiss = (
  open: Ref<boolean>,
  refs: Ref<HTMLElement | null>[],
  onDismiss: () => void,
  { captureEscape = false }: { captureEscape?: boolean } = {}
) => {
  let remove: (() => void) | undefined
  watch(
    open,
    (isOpen) => {
      remove?.()
      remove = undefined
      if (!isOpen) {
        return
      }
      const onPointerDown = (event: PointerEvent) => {
        const target = event.target as Node
        if (!refs.some((ref) => ref.value?.contains(target))) {
          onDismiss()
        }
      }
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== 'Escape') {
          return
        }
        if (captureEscape) {
          event.stopPropagation()
        }
        onDismiss()
      }
      document.addEventListener('pointerdown', onPointerDown)
      document.addEventListener('keydown', onKeyDown, captureEscape)
      remove = () => {
        document.removeEventListener('pointerdown', onPointerDown)
        document.removeEventListener('keydown', onKeyDown, captureEscape)
      }
    },
    { immediate: true }
  )
  onBeforeUnmount(() => remove?.())
}

/** 悬停类浮层的进出延迟：同一时间只有一个待执行的切换 */
export const useDelayedOpen = () => {
  const open = ref(false)
  let timer = 0
  const schedule = (next: boolean, delay: number) => {
    window.clearTimeout(timer)
    if (delay <= 0) {
      open.value = next
      return
    }
    timer = window.setTimeout(() => {
      open.value = next
    }, delay)
  }
  const cancel = () => window.clearTimeout(timer)
  onBeforeUnmount(cancel)
  return { open, setOpen: (value: boolean) => (open.value = value), schedule, cancel }
}
