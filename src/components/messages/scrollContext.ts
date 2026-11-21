import { inject, provide, type InjectionKey } from 'vue'

/** 渲染更新后请求滚到底部；用户上滑离开底部时由列表忽略 */
const SCROLL_TO_BOTTOM_KEY: InjectionKey<() => void> = Symbol('scroll-to-bottom')

const noop = () => {}

export const provideScrollToBottom = (scrollToBottom: () => void) => {
  provide(SCROLL_TO_BOTTOM_KEY, scrollToBottom)
}

/** 列表外（如 Markdown 独立渲染）没有 provider 时返回空操作 */
export const useScrollToBottom = (): (() => void) => inject(SCROLL_TO_BOTTOM_KEY, noop)
