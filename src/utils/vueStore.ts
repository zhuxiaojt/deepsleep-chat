import { computed, reactive, type ComputedRef } from 'vue'

type Listener<T> = (state: T, previous: T) => void

/**
 * 轻量响应式 store：保留原 zustand 的调用风格（selector / getState / setState / subscribe），
 * 组件里 `useStore(s => s.x)` 得到 computed，模板中自动解包。
 */
export type VueStore<T extends object> = {
  (): T
  <U>(selector: (state: T) => U): ComputedRef<U>
  getState: () => T
  setState: (partial: Partial<T> | ((state: T) => Partial<T> | T)) => void
  subscribe: (listener: Listener<T>) => () => void
}

export const createVueStore = <T extends object>(initial: T | (() => T)): VueStore<T> => {
  const state = reactive(
    (typeof initial === 'function' ? (initial as () => T)() : initial) as object
  ) as T
  const listeners = new Set<Listener<T>>()

  const setState: VueStore<T>['setState'] = (partial) => {
    const previous = { ...state }
    const next =
      typeof partial === 'function' ? (partial as (state: T) => Partial<T> | T)(state) : partial
    if (next && next !== state) {
      Object.assign(state, next)
    }
    for (const listener of listeners) {
      listener(state, previous)
    }
  }

  const store = ((selector?: (state: T) => unknown) =>
    selector ? computed(() => selector(state)) : state) as VueStore<T>

  store.getState = () => state
  store.setState = setState
  store.subscribe = (listener) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }
  return store
}
