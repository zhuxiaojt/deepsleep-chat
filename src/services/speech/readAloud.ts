import { createVueStore } from '../../utils/vueStore.js'
import type { TranslationMessage } from '../../i18n/index.js'
import { useSettings } from '../settings.js'

/**
 * 朗读：同一时间只读一条回复。
 * Vue 版本使用浏览器原生 speechSynthesis，不请求远端 TTS。
 * 状态：loading（已开始、尚未出声）→ playing → 结束回到 idle。
 */
export type ReadAloudStatus = 'idle' | 'loading' | 'playing'

type ReadAloudState = {
  /** 正在朗读的回复 id */
  messageId: string | null
  status: ReadAloudStatus
}

export const useReadAloud = createVueStore<ReadAloudState>(() => ({
  messageId: null,
  status: 'idle',
}))

let current: { messageId: string; utterance: SpeechSynthesisUtterance } | null = null

const finish = (utterance: SpeechSynthesisUtterance) => {
  if (current?.utterance !== utterance) {
    return
  }
  current = null
  useReadAloud.setState({ messageId: null, status: 'idle' })
}

/** 停止当前朗读（发送、停止生成、切换会话等场景调用） */
export const stopReadAloud = () => {
  if (current) {
    current = null
    if (typeof speechSynthesis !== 'undefined') {
      speechSynthesis.cancel()
    }
    useReadAloud.setState({ messageId: null, status: 'idle' })
  }
}

export const describeReadAloudError = (_error: unknown): TranslationMessage | string => ({
  key: 'ttsFailed',
})

/**
 * 开始朗读一条回复的正文；同一条正在朗读时调用等于停止。
 * 文本中的 Markdown 符号会在朗读前做简单清理。
 */
export const toggleReadAloud = (
  messageId: string,
  text: string,
  onError: (error: unknown) => void
) => {
  const reading = useReadAloud.getState().messageId
  stopReadAloud()
  if (reading === messageId) {
    return
  }
  if (typeof speechSynthesis === 'undefined') {
    onError(new Error('speechSynthesis is unavailable'))
    return
  }
  const plain = text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[#>*`_~\-[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!plain) {
    return
  }
  const utterance = new SpeechSynthesisUtterance(plain)
  utterance.lang = useSettings.getState().locale
  utterance.onstart = () => {
    if (current?.utterance === utterance) {
      useReadAloud.setState({ status: 'playing' })
    }
  }
  utterance.onend = () => finish(utterance)
  utterance.onerror = (event) => {
    if (current?.utterance === utterance) {
      finish(utterance)
      if (event.error !== 'canceled' && event.error !== 'interrupted') {
        onError(event.error)
      }
    }
  }
  current = { messageId, utterance }
  useReadAloud.setState({ messageId, status: 'loading' })
  speechSynthesis.cancel()
  speechSynthesis.speak(utterance)
}
