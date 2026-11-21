import { computed, shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue'
import type { AssistantMessage } from '../../services/chat/types.js'
import { buildReplyView, type ReplyView, type Source } from '../../services/chat/view.js'

const sameSource = (a: Source, b: Source) =>
  a.url === b.url &&
  a.title === b.title &&
  a.siteName === b.siteName &&
  a.publishedAt === b.publishedAt &&
  a.snippet === b.snippet &&
  a.siteIcon === b.siteIcon &&
  a.index === b.index

/**
 * 将助手消息转换为界面渲染所需的回复视图数据：步骤时间线、正文、引用来源和搜索结果。
 * 来源内容未变时复用 sources 数组，避免流式文本更新绕过 Markdown 的解析节流。
 */
export const useReplyView = (
  message: MaybeRefOrGetter<AssistantMessage>,
  streaming: MaybeRefOrGetter<boolean>
) => {
  const data = computed(() => buildReplyView(toValue(message), toValue(streaming)))
  const sources = shallowRef<Source[]>(data.value.sources)

  // 仅来源编号、顺序或元数据变化时更新，普通文本增量沿用已有数组。
  watch(
    data,
    (view) => {
      const current = sources.value
      if (
        current !== view.sources &&
        (current.length !== view.sources.length ||
          !current.every((source, index) => sameSource(source, view.sources[index])))
      ) {
        sources.value = view.sources
      }
    },
    { immediate: true }
  )

  const view = computed<ReplyView>(() => ({ ...data.value, sources: sources.value }))

  return {
    view,
    steps: computed(() => view.value.steps),
    answer: computed(() => view.value.answer),
    sources: computed(() => view.value.sources),
    searchResults: computed(() => view.value.searchResults),
  }
}
