import { defineComponent, h, onMounted, onUpdated, type PropType, type VNode } from 'vue'
import clsx from 'clsx'
import type {
  BlockContent,
  DefinitionContent,
  List as ListNode,
  PhrasingContent,
  Root,
  Table as TableNode,
} from 'mdast'
import type { Source } from '../../services/chat/view.js'
import CitationLink from '../search/CitationLink.vue'
import CodeBlock from './CodeBlock.vue'
import ImageAsLink from './ImageAsLink.vue'
import Link from './Link.vue'
import InlineMath from './InlineMath.vue'
import MathBlock from './MathBlock.vue'

const renderHtml = (value: string, key?: number): VNode =>
  /^<br\s*\/?>$/i.test(value)
    ? h('br', { key })
    : h('span', { key, class: 'ds-markdown-html' }, value)

// 按 \n 拆行插 <br>：源文每个换行（含软换行）都渲染为视觉换行
const renderText = (value: string, key: number): VNode[] => {
  const result: VNode[] = []
  value.split(/\r?\n/).forEach((line, index) => {
    result.push(
      h('span', { key: `${key}-${index}s` }, line),
      h('br', { key: `${key}-${index}br` })
    )
  })
  result.pop()
  return result
}

const renderPhrasingItem = (node: PhrasingContent, key: number): VNode | VNode[] | null => {
  switch (node.type) {
    case 'inlineMath':
      return h(InlineMath, { key, value: node.value })
    case 'break':
      return h('br', { key })
    case 'emphasis':
      return h('em', { key }, renderPhrasing(node.children))
    case 'image':
      return h(ImageAsLink, { key, node })
    case 'html':
      return renderHtml(node.value, key)
    case 'inlineCode':
      return h('code', { key }, node.value)
    case 'link':
      return h(Link, { key, node }, { default: () => renderPhrasing(node.children) })
    case 'strong':
      return h('strong', { key }, renderPhrasing(node.children))
    case 'text':
      return renderText(node.value, key)
    case 'citation':
      return h(CitationLink, { key, source: node.source })
    default:
      // 删除线、脚注、引用式链接已在解析时换成文本
      return null
  }
}

const renderPhrasing = (nodes: PhrasingContent[]): Array<VNode | VNode[] | null> =>
  nodes.map((node, index) => renderPhrasingItem(node, index))

const renderList = (node: ListNode, loading: boolean, key: number): VNode => {
  const tag = node.ordered ? 'ol' : 'ul'
  const start = node.ordered ? node.start || undefined : undefined
  return h(
    tag,
    { key, start },
    node.children.map((child, index) => {
      // GFM: task item 的 checked 为 boolean；普通 listItem 为 null
      const checked = child.checked
      const isTaskItem = typeof checked === 'boolean'
      return h(
        'li',
        { key: index, class: isTaskItem ? 'ds-markdown-task-list-item' : undefined },
        [
          isTaskItem
            ? // □ U+25A1 / ☑ U+2611
              h('span', { class: 'ds-markdown-task-checkbox' }, checked ? '☑  ' : '□  ')
            : null,
          ...renderBlockNodes(child.children, loading),
        ]
      )
    })
  )
}

const renderTable = (node: TableNode, key: number): VNode => {
  const columnCount = node.children[0]?.children.length ?? 0
  const head = node.children[0]
  const body = node.children[1]
  return h('div', { key, class: 'markdown-table-wrapper' }, [
    h('table', [
      head
        ? h('thead', [
            h(
              'tr',
              head.children.map((cell, cellIndex) =>
                h('th', { key: cellIndex }, renderPhrasing(cell.children))
              )
            ),
          ])
        : null,
      body
        ? h(
            'tbody',
            node.children.slice(1).map((row, rowIndex) => {
              const curColumnCount = row.children.length || 0
              return h('tr', { key: rowIndex }, [
                ...row.children.map((cell, cellIndex) =>
                  h('td', { key: cellIndex }, renderPhrasing(cell.children))
                ),
                // 补齐到列数
                ...Array.from({ length: columnCount - curColumnCount }).map((_, idx) =>
                  h('td', { key: `ptd_${idx}` })
                ),
              ])
            })
          )
        : null,
    ]),
  ])
}

const renderBlockNodes = (
  nodes: Array<BlockContent | DefinitionContent>,
  loading: boolean
): Array<VNode | null> =>
  nodes.map((node, index) => {
    switch (node.type) {
      case 'math':
        return h(MathBlock, { key: index, value: node.value })
      case 'thematicBreak':
        return h('hr', { key: index })
      case 'blockquote':
        return h('blockquote', { key: index }, renderBlockNodes(node.children, loading))
      case 'html':
        return renderHtml(node.value, index)
      case 'heading':
        return node.children.length === 0
          ? null
          : h(`h${node.depth}`, { key: index }, renderPhrasing(node.children))
      case 'paragraph':
        return h('p', { key: index, class: 'ds-markdown-paragraph' }, renderPhrasing(node.children))
      case 'code':
        return h(CodeBlock, {
          key: index,
          code: node.value,
          infostring: node.lang || 'text',
          loading,
        })
      case 'table':
        return renderTable(node, index)
      case 'list':
        return renderList(node, loading, index)
      default:
        // 脚注与定义已在解析时换成段落
        return null
    }
  })

export const MarkdownAstRenderer = defineComponent({
  name: 'MarkdownAstRenderer',
  props: {
    ast: { type: Object as PropType<Root>, required: true },
    loading: { type: Boolean, default: false },
    sources: { type: Array as PropType<Source[]>, default: undefined },
    disableLink: { type: Boolean, default: false },
    className: { type: String, default: undefined },
    onUpdate: { type: Function as PropType<() => void>, default: undefined },
  },
  setup(props) {
    onMounted(() => props.onUpdate?.())
    onUpdated(() => props.onUpdate?.())

    return () =>
      h(
        'div',
        { class: clsx('ds-markdown', props.className) },
        renderBlockNodes(
          props.ast.children as Array<BlockContent | DefinitionContent>,
          props.loading
        )
      )
  },
})
