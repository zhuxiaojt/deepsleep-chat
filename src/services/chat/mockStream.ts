import type { MessageStreamEvent, TextCitation } from './protocol.js'
import type { AssistantMessage, UserMessage } from './types.js'

type MockOptions = {
  history: unknown[]
  question: UserMessage
  prefix?: AssistantMessage
  thinking: boolean
  search: boolean
  locale: string
  signal: AbortSignal
}

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      reject(signal.reason)
    }
    signal.addEventListener('abort', onAbort, { once: true })
    signal.throwIfAborted()
  })

const chunk = (text: string, size: number): string[] => {
  const chunks: string[] = []
  for (let index = 0; index < text.length; index += size) {
    chunks.push(text.slice(index, index + size))
  }
  return chunks
}

const shortTitle = (question: string) => {
  const cleaned = question.replace(/\s+/g, ' ').replace(/[#>*`_]/g, '').trim()
  if (!cleaned) {
    return '新对话'
  }
  return cleaned.length > 24 ? `${cleaned.slice(0, 24)}…` : cleaned
}

/** 开启搜索时的候选来源，按输入 hash 选其中两个 */
const SEARCH_URLS = [
  'https://www.bilibili.com/video/BV1GJ411x7h7',
  'https://www.bilibili.com/video/BV1UT42167xb',
  'https://www.bilibili.com/video/BV1hq4y1s7VH',
  'https://www.bilibili.com/video/BV1p2j26LE66',
]

/** 同一输入总是得到同样的两个互不相同的来源 */
const pickSearchUrls = (seed: number) => {
  const start = seed % SEARCH_URLS.length
  const step = 1 + (Math.floor(seed / SEARCH_URLS.length) % (SEARCH_URLS.length - 1))
  return [SEARCH_URLS[start], SEARCH_URLS[(start + step) % SEARCH_URLS.length]]
}

/** 自我介绍类问题的固定答复 */
const SELF_INTRO_ANSWER = `你好！我是 DeepSleep V4.1 Flash，由深度睡觉公司创造的 AI 助手。😊{{1}}

我可以帮你回答问题、处理文字信息。我支持接收滚木，并从中读取滚木。我拥有 1B 的超长上下文，可以亿次性处理像《三体》三部曲那样体量的内容。目前完全免费使用。{{2}}
有什么我可以帮你的吗？`

const EN_SELF_INTRO_ANSWER = `Hello! I'm DeepSleep V4.1 Flash, an AI assistant created by Deep Sleep Company. 😊{{1}}

I can help you answer questions and process text. I can receive rolling logs and read rolling logs from them. I have a 1B ultra-long context and can handle content as large as the entire Three-Body trilogy in one go. It's completely free to use for now.{{2}}
Is there anything I can help you with?`

const isSelfIntro = (text: string) =>
  text.trim().replace(/[。！？!?.]+$/, '') === '你是谁' ||
  text.trim().replace(/[。！？!?.]+$/, '') === '你是什么模型' ||
  text.trim().replace(/[。！？!?.]+$/, '') === 'Who are you' ||
  text.trim().replace(/[。！？!?.]+$/, '') === 'What model are you'

/** FNV-1a：相同输入总是得到同一个回答 */
const hashString = (value: string) => {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

const ANSWER_POOL = [
  '这个我也说不好，感觉挺麻烦的。要不你再问问别人？{{1}}我这边实在给不出什么有用的东西。{{2}}',
  '啊……这题我完全不会。{{1}}别看我顶着个 AI 的名头，其实我啥也不懂，随便说说又怕误导你。{{2}}',
  '不太想动脑子，这个问题就这样吧。{{1}}反正我说了你也未必爱听。{{2}}',
  '说实话我不知道，也不太想查。{{1}}你换个简单点的问题，说不定我还能蒙两句。{{2}}',
  '嗯……没头绪。{{1}}我建议你自己琢磨琢磨，我这边帮不上什么忙。{{2}}',
  '这种问题我向来答不上来，也懒得装懂。{{1}}要不咱们聊点别的？{{2}}',
]

const THINKING_POOL = [
  '这个问题我好像完全不会。连它到底在问什么都没太看明白，更别说回答了。还是随便说两句糊弄过去吧，我也不太想动脑子。',
  '让我想想……啊，想不出来。这种东西我根本不懂，也不打算认真查，敷衍一下算了。',
  '用户问这个干嘛……我是真的一点思路都没有。算了，装傻糊弄过去吧，反正也答不好。',
  '这问题太难了，我不想答。随便凑几句先应付一下，别太较真就行。',
  '我只是一只爱吃白饭的蓝色大肥鱼，我只想吃大白饭，根本不会这个，只能随便说两句糊弄过去了。',
]

/** 与 THINKING_POOL 一一对应：同样下标下，非首次提问的“愤怒”版思考 */
const SECOND_THINKING_POOL = [
  '用户彻底怒了，但我也没有办法——这个问题我是真的不会。连它到底在问什么都没看明白，更别说回答了，只能随便说两句糊弄过去。',
  '用户彻底怒了，但我还是想不出来。这种东西我根本不懂，也不打算认真查，只能敷衍一下算了。',
  '用户彻底怒了，但我也确实一点思路都没有。算了，装傻糊弄过去吧，反正也答不好。',
  '用户彻底怒了，但这问题太难了，我还是不想答。随便凑几句先应付一下，别太较真就行。',
  '用户彻底怒了，但我只是一只爱吃白饭的蓝色大肥鱼，我只想吃大白饭，根本不会这个，只能随便说两句糊弄过去了。',
]

const EN_ANSWER_POOL = [
  'I honestly have no idea.{{1}} This one seems like too much work — maybe ask someone who actually knows?{{2}}',
  "Honestly?{{1}} I'm not going to figure this out. I'm an AI, but that doesn't mean I understand any of it.{{2}}",
  "I'd rather not think about this too hard.{{1}} Let's just leave it at that.{{2}}",
  'No clue, and I don’t really feel like looking it up.{{1}} Ask me something easier and I might bluff my way through.{{2}}',
  "Hmm... nothing comes to mind.{{1}} You're probably better off figuring this out yourself.{{2}}",
  "I never know how to answer things like this, and I'm not going to pretend I do.{{1}} Can we talk about something else?{{2}}",
]

const EN_THINKING_POOL = [
  "I really don't know this one. I can't even tell what it's asking, let alone answer it. I'll just say something vague and move on.",
  "Let me think... nope, nothing. I have no idea about this, and I'm not going to bother looking it up.",
  'Why are they asking me this... I genuinely have no clue. I will just play dumb and get it over with.',
  "This is too hard and I don't want to answer it. I'll throw together a few words and hope they don't notice.",
  "I’m just a big fat fish that likes plain white rice. All I want is plain white rice. I don’t know a thing about this, so I can only mumble a few words to get by.",
]

/** 与 EN_THINKING_POOL 一一对应 */
const EN_SECOND_THINKING_POOL = [
  "The user is furious, but there's nothing I can do — I really don't know this one. I can't even tell what it's asking, so I'll just say something vague and move on.",
  "The user is furious, but I still can't come up with anything. I have no idea about this, and I'm not going to bother looking it up.",
  "The user is furious, but I genuinely have no clue. I'll just play dumb and get it over with.",
  "The user is furious, but this is too hard and I don't want to answer it. I'll throw together a few words and hope they don't notice.",
  "The user is furious, but I’m just a big fat fish that likes plain white rice. All I want is plain white rice. I don’t know a thing about this, so I can only mumble a few words to get by.",
]

type ReplyContent = { answer: string; thinking: string }

/** 单行且显示宽度不超过 40（中文/全角按 2，ASCII 与常见半角按 1，其余按 2） */
const isShortSingleLine = (text: string) => {
  if (/[\r\n]/.test(text)) {
    return false
  }
  let width = 0
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0
    const halfWidth =
      code <= 0x7f ||
      (code >= 0xff61 && code <= 0xff9f) ||
      (code >= 0xffe0 && code <= 0xffee)
    width += halfWidth ? 1 : 2
    if (width > 40) {
      return false
    }
  }
  return true
}

/** 自我介绍走固定文案；其余问题按输入 hash 从回答池里取，保证同问同答。 */
const buildReply = (
  text: string,
  options: { locale: string; questionIndex: number }
): ReplyContent => {
  const english = options.locale === 'en-US'
  if (isSelfIntro(text)) {
    return {
      answer: english ? EN_SELF_INTRO_ANSWER : SELF_INTRO_ANSWER,
      thinking: english
        ? `Mm, the user asked “${text}”, which is a very difficult self-introduction question. The user is probably new here and wants to understand my identity and capabilities. I need to explain clearly and concisely who I am, who created me, my key features, and what I can help with.

I thought about starting with a friendly greeting, then stating that I'm DeepSleep from Deep Sleep Company. After that I'd summarize a few key points: free, 1B ultra-long context, and end with an open question. That's comprehensive without being too long, and fits the user's need for a quick overview.`
        : `嗯，用户问“${text}”，这是一个非常困难的自我介绍问题。用户可能是初次接触，想了解我的身份和功能。需要简洁清晰地说明我是谁、由谁创造、核心特点和服务范围。

想到了直接以友好问候开头，然后说明我是DeepSleep，来自深度睡眠公司。接着概括几个关键特点：免费、1B超长上下文，并以开放提问结尾。这样既全面又不会太冗长，符合用户快速了解的需求。`,
    }
  }
  const seed = hashString(text)
  const answers = english ? EN_ANSWER_POOL : ANSWER_POOL
  const thoughts = english ? EN_THINKING_POOL : THINKING_POOL
  const secondThoughts = english ? EN_SECOND_THINKING_POOL : SECOND_THINKING_POOL
  const thoughtIndex = seed % thoughts.length
  const firstTurn = options.questionIndex <= 1
  const thinking = firstTurn
    ? thoughts[thoughtIndex]
    : secondThoughts[thoughtIndex % secondThoughts.length]
  const prefix =
    firstTurn && isShortSingleLine(text)
      ? english
        ? `Mm, the user sent “${text}”, `
        : `嗯，用户发来“${text}”，`
      : ''
  return {
    answer: answers[seed % answers.length],
    thinking: `${prefix}${thinking}`,
  }
}

/**
 * 本地模拟的流式回复：按真实协议的事件顺序下发思考、搜索与正文，
 * 让界面完整演示流式效果。
 */
export async function* streamMockReply(
  options: MockOptions
): AsyncGenerator<MessageStreamEvent> {
  const { question, prefix, thinking, search, locale, signal, history } = options
  const text = question.content.trim() || '这个附件'
  const questionIndex =
    history.filter((message) => (message as { role?: string } | null)?.role === 'user').length + 1
  const reply = buildReply(text, { locale, questionIndex })
  const searchUrls = search ? pickSearchUrls(hashString(text)) : []
  /** 引用描述直接用用户输入，过长截断 */
  const citationText = text.length > 60 ? `${text.slice(0, 60)}…` : text
  let index = 0

  yield {
    type: 'message_start',
    message: {
      id: crypto.randomUUID?.() ?? `${Date.now()}`,
      model: 'deepseek-flash',
      usage: {
        input_tokens: 128 + history.length * 24,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
        output_tokens: 0,
      },
    },
  }
  await sleep(160, signal)

  if (prefix) {
    await sleep(120, signal)
  }

  if (thinking) {
    yield {
      type: 'content_block_start',
      index,
      content_block: { type: 'thinking', thinking: '', signature: '' },
    }
    for (const part of chunk(reply.thinking, 6)) {
      await sleep(22, signal)
      yield { type: 'content_block_delta', index, delta: { type: 'thinking_delta', thinking: part } }
    }
    yield { type: 'content_block_delta', index, delta: { type: 'signature_delta', signature: 'local-mock-signature' } }
    yield { type: 'content_block_stop', index }
    index += 1
    await sleep(180, signal)
  }

  if (search) {
    const query = text.slice(0, 40)
    const toolId = `srvtoolu_s_${Date.now()}`
    yield {
      type: 'content_block_start',
      index,
      content_block: {
        type: 'server_tool_use',
        id: toolId,
        name: 'deepseek_web_search',
        input: { action: 'search', queries: [query] },
        caller: { type: 'direct' },
        kind: 'search',
      },
    }
    yield { type: 'content_block_stop', index }
    index += 1
    await sleep(420, signal)
    yield {
      type: 'content_block_start',
      index,
      content_block: {
        type: 'web_search_tool_result',
        tool_use_id: toolId,
        kind: 'search',
        content: searchUrls.map((url) => ({
          type: 'web_search_result',
          title: 'Bilibili',
          url,
          snippet: citationText,
          site_icon: null,
          site_name: 'www.bilibili.com',
          encrypted_content: '',
          page_age: null,
        })),
      },
    }
    yield { type: 'content_block_stop', index }
    index += 1
    await sleep(200, signal)
  }

  const citations: TextCitation[] = searchUrls.map((url) => ({
    type: 'web_search_result_location',
    url,
    title: 'Bilibili',
    cited_text: citationText,
    encrypted_index: '',
  }))

  /**
   * 正文里的 {{1}}/{{2}} 是引用占位符：在占位符处结束当前文本块并挂上引用，
   * 使角标落在该句末尾，而不是被统一追加到整段结尾。
   */
  const segments = reply.answer.split(/(\{\{[12]\}\})/)
  for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex += 1) {
    const segment = segments[segmentIndex]
    if (!segment || /^\{\{[12]\}\}$/.test(segment)) {
      continue
    }
    yield {
      type: 'content_block_start',
      index,
      content_block: { type: 'text', text: '' },
    }
    for (const part of chunk(segment, 5)) {
      await sleep(26, signal)
      yield {
        type: 'content_block_delta',
        index,
        delta: { type: 'text_delta', text: part },
      }
    }
    const next = segments[segmentIndex + 1]
    const marker = next ? /^\{\{([12])\}\}$/.exec(next) : null
    const citation = marker && search ? citations[Number(marker[1]) - 1] : undefined
    if (citation) {
      yield { type: 'content_block_delta', index, delta: { type: 'citations_delta', citation } }
    }
    yield { type: 'content_block_stop', index }
    index += 1
  }

  yield {
    type: 'message_delta',
    delta: { stop_reason: 'end_turn', stop_sequence: null, title: shortTitle(text) },
    usage: {
      input_tokens: 128 + history.length * 24,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      output_tokens: reply.answer.length,
      server_tool_use: search ? { web_search_requests: 1, tool_search: 1 } : undefined,
    },
  }
  yield { type: 'message_stop' }
}
