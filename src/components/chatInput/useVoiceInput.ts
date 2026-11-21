import { onBeforeUnmount, ref, shallowRef, watch, type Ref } from 'vue'
import type { TranslationMessage } from '../../i18n/index.js'
import { startRecording, type Recording } from '../../services/speech/recorder.js'
import { useSettings } from '../../services/settings.js'

export type VoiceInputStatus = 'idle' | 'recording' | 'transcribing'

/**
 * 录音依赖 getUserMedia，只在安全上下文可用（HTTPS、localhost、file://）。
 * 普通 HTTP 页面上直接禁用入口，避免点击后必然失败。
 */
const AVAILABLE = typeof window === 'undefined' || window.isSecureContext

/** 浏览器语音识别（Web Speech API），不支持时由 ChatInput 提示 */
const SpeechRecognitionCtor =
  typeof window === 'undefined' ? undefined : window.SpeechRecognition ?? window.webkitSpeechRecognition

const describeRecordingError = (error: unknown): TranslationMessage => {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
      return { key: 'voiceInputPermissionDenied' }
    }
    if (error.name === 'NotFoundError') {
      return { key: 'voiceInputNoDevice' }
    }
  }
  return { key: 'voiceInputFailed' }
}

const describeRecognitionError = (code: string | undefined): TranslationMessage => {
  if (code === 'not-allowed' || code === 'service-not-allowed') {
    return { key: 'voiceInputPermissionDenied' }
  }
  if (code === 'audio-capture') {
    return { key: 'voiceInputNoDevice' }
  }
  if (code === 'no-speech') {
    return { key: 'voiceInputEmpty' }
  }
  return { key: 'voiceInputFailed' }
}

/**
 * 语音输入（oneshot）：点击开始录音，再次点击结束，结果交给 onText 填入输入框。
 * 转写由浏览器 Web Speech API 实时完成；录音只用于频谱与计时，不发送到服务端。
 * 录满 120 秒自动结束，转写中再次点击取消。
 */
export const useVoiceInput = (onText: (text: string) => void) => {
  const status: Ref<VoiceInputStatus> = ref('idle')
  /** 本次录音已录秒数，只在录音中递增 */
  const seconds = ref(0)
  /** 失败原因，由 ChatInput 订阅后 toast 并清除 */
  const error = ref<TranslationMessage | null>(null)
  const recording = shallowRef<Recording | null>(null)
  let recognition: SpeechRecognition | null = null
  let operation = 0
  let received = false

  const releaseRecording = () => {
    recording.value?.cancel()
    recording.value = null
  }

  const releaseRecognition = () => {
    const current = recognition
    recognition = null
    if (!current) {
      return
    }
    current.onresult = null
    current.onerror = null
    current.onend = null
    try {
      current.abort()
    } catch {
      // 已经结束的识别对象忽略。
    }
  }

  /** 取消当前录音与识别，不写入转写结果 */
  const cancel = () => {
    operation++
    releaseRecognition()
    releaseRecording()
    seconds.value = 0
    status.value = 'idle'
  }

  /** 结束录音并等待识别把最后一段结果交回来 */
  const finish = () => {
    const current = operation
    if (!recording.value) {
      // 仍在等待麦克风授权时也允许取消；迟到的录音对象会立即释放。
      cancel()
      return
    }
    releaseRecording()
    const active = recognition
    recognition = null
    if (!active) {
      status.value = 'idle'
      return
    }
    status.value = 'transcribing'
    const done = () => {
      if (current !== operation || status.value !== 'transcribing') {
        return
      }
      status.value = 'idle'
      if (!received) {
        error.value = { key: 'voiceInputEmpty' }
      }
    }
    active.onend = done
    try {
      active.stop()
    } catch {
      done()
    }
    // 个别浏览器停止后不回触发 onend，兜底恢复按钮状态
    window.setTimeout(done, 800)
  }

  const start = async () => {
    if (!AVAILABLE) {
      return
    }
    if (!SpeechRecognitionCtor) {
      error.value = { key: 'voiceInputFailed' }
      return
    }
    const current = ++operation
    received = false
    seconds.value = 0
    status.value = 'recording'

    const recognitionInstance = new SpeechRecognitionCtor()
    recognitionInstance.lang = useSettings.getState().locale
    recognitionInstance.continuous = true
    recognitionInstance.interimResults = true
    let finalized = 0
    recognitionInstance.onresult = (event) => {
      if (current !== operation) {
        return
      }
      for (let index = finalized; index < event.results.length; index += 1) {
        const result = event.results[index]
        if (!result.isFinal) {
          break
        }
        finalized = index + 1
        const text = result[0]?.transcript?.trim()
        if (text) {
          received = true
          onText(text)
        }
      }
    }
    recognitionInstance.onerror = (event) => {
      if (current !== operation) {
        return
      }
      const code = (event as Event & { error?: string }).error
      if (code === 'aborted') {
        return
      }
      error.value = describeRecognitionError(code)
      operation++
      releaseRecognition()
      releaseRecording()
      status.value = 'idle'
    }
    recognitionInstance.onend = () => {
      // 静音或浏览器自行结束时，按用户结束处理
      if (current === operation && status.value === 'recording') {
        finish()
      }
    }
    recognition = recognitionInstance
    try {
      recognitionInstance.start()
    } catch {
      if (current === operation) {
        error.value = { key: 'voiceInputFailed' }
        cancel()
      }
      return
    }

    try {
      const recordingInstance = await startRecording(() => {
        if (current === operation) {
          error.value = { key: 'voiceInputLimitReached' }
          finish()
        }
      })
      if (current !== operation || status.value !== 'recording') {
        recordingInstance.cancel()
        return
      }
      recording.value = recordingInstance
    } catch (failure) {
      if (current === operation && status.value === 'recording') {
        error.value = describeRecordingError(failure)
        cancel()
      }
    }
  }

  const toggle = async () => {
    if (status.value === 'recording') {
      finish()
      return
    }
    if (status.value === 'transcribing') {
      cancel()
      return
    }
    await start()
  }

  watch(status, (value, _previous, onCleanup) => {
    if (value !== 'recording') {
      return
    }
    const startedAt = Date.now()
    seconds.value = 0
    // 半秒刷新一次，让显示的秒数与实际录音时长保持一致
    const timer = window.setInterval(() => {
      seconds.value = Math.floor((Date.now() - startedAt) / 1000)
    }, 500)
    onCleanup(() => window.clearInterval(timer))
  })

  onBeforeUnmount(cancel)

  /** 当前录音的频谱分析节点，未录音时为 null */
  const getAnalyser = () => recording.value?.analyser ?? null
  const clearError = () => {
    error.value = null
  }

  return {
    status,
    seconds,
    error,
    getAnalyser,
    toggle,
    cancel,
    clearError,
    available: AVAILABLE,
    supported: Boolean(SpeechRecognitionCtor),
  }
}
