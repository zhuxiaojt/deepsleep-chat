<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch, type ComputedRef, type Ref } from 'vue'
import clsx from 'clsx'
import { useTranslate } from '../../i18n/index.js'
import {
  IconBrowseOutline16,
  IconBrowseWarningOutline16,
  IconCheckedOutline14,
  IconChevronDownOutline14,
  IconChevronRightOutline14,
  IconCloseFill14,
  IconLinkOutline16,
  IconRightUpOutline14,
  IconSearchOutline16,
  IconSearchWarningOutline16,
  IconThinkOutline16,
} from '../base/icons.js'
import type { AssistantMessage } from '../../services/chat/types.js'
import {
  getAreaTitle,
  isDeepSearchKind,
  isImageSearchKind,
  type PageItem,
  type ReplyView,
  type Source,
  type ToolStatus,
} from '../../services/chat/view.js'
import Tooltip from '../base/Tooltip.vue'
import Markdown from '../markdown/Markdown.vue'
import SiteThumbnails from '../search/SiteThumbnails.vue'
import { toggleSearchPanel, useSearchPanel } from '../search/searchPanelState.js'
import styles from './ReplyArea.module.css'
import './thinking.markdown.css'

const props = defineProps<{
  message: AssistantMessage
  view: ReplyView
  streaming: boolean
  hasResponse: boolean
}>()

/** 进行中时每秒刷新，用于思考用时与搜索词轮播 */
const useTicker = (active: Ref<boolean> | ComputedRef<boolean>, interval: number) => {
  const tick = ref(0)
  let timer: ReturnType<typeof setInterval> | undefined
  watch(
    active,
    (on) => {
      clearInterval(timer)
      timer = undefined
      if (on) {
        timer = setInterval(() => (tick.value += 1), interval)
      }
    },
    { immediate: true }
  )
  onBeforeUnmount(() => clearInterval(timer))
  return tick
}

type RowType = 'thinking' | 'text' | 'search' | 'open' | 'find' | 'read_link'

type FindItem = { id: string; pattern: string; status: ToolStatus; tooltip: string | null }

type RowModel = {
  type: RowType
  key: string
  markdown: string
  loading: boolean
  disableLink: boolean
  sources: Source[] | undefined
  cacheKey: string
  failed: boolean
  clickable: boolean
  active: boolean
  panelEntry: string
  results: Source[]
  query: string | null
  text: string | null
  summary: string | null
  allFailed: boolean
  intro: string
  pages: PageItem[]
  pageFailedTip: string | null
  showViewAll: boolean
  viewAllEntry: string | null
  viewAllSources: Source[]
  items: FindItem[]
  links: PageItem[]
}

const EMPTY_ROW: Omit<RowModel, 'type' | 'key'> = {
  markdown: '',
  loading: false,
  disableLink: false,
  sources: undefined,
  cacheKey: '',
  failed: false,
  clickable: false,
  active: false,
  panelEntry: '',
  results: [],
  query: null,
  text: null,
  summary: null,
  allFailed: false,
  intro: '',
  pages: [],
  pageFailedTip: null,
  showViewAll: false,
  viewAllEntry: null,
  viewAllSources: [],
  items: [],
  links: [],
}

const t = useTranslate()
const open = ref(true)
const entry = useSearchPanel((state) => state.entry)
const titleActive = computed(() => props.streaming && !props.hasResponse)
const titleTick = useTicker(titleActive, 1000)
const carouselActive = computed(() =>
  props.view.steps.some(
    (step) => step.type === 'search' && step.status === 'wip' && step.queries.length > 1
  )
)
const queryTick = useTicker(carouselActive, 2000)

const visible = computed(
  () => props.view.steps.length > 0 || Boolean(props.message.thinking && props.streaming)
)

const thinking = computed(
  () =>
    props.message.thinking ?? props.view.steps.some((step) => step.type === 'thinking')
)

const title = computed(() => {
  // 读取 ticker，让思考用时与搜索状态每秒刷新。
  void titleTick.value
  return thinking.value
    ? getAreaTitle(props.view, props.streaming, Date.now(), props.hasResponse)
    : null
})

const stopped = computed(() => !props.streaming && !props.hasResponse)

const rows = computed<RowModel[]>(() =>
  props.view.steps.map((step, index): RowModel => {
    if (step.type === 'thinking') {
      const lastBlock = step.blocks.at(-1)
      const active =
        props.streaming && lastBlock?.startedAt !== undefined && lastBlock.endedAt === undefined
      return {
        ...EMPTY_ROW,
        type: 'thinking',
        key: step.key,
        markdown: step.blocks.map((block) => block.thinking).join(''),
        loading: active,
        disableLink: true,
        cacheKey: `${props.message.id}-${step.key}`,
      }
    }
    if (step.type === 'text') {
      return {
        ...EMPTY_ROW,
        type: 'text',
        key: step.key,
        markdown: step.markdown,
        loading: props.streaming && index === props.view.steps.length - 1,
        sources: props.view.sources,
        cacheKey: `${props.message.id}-${step.key}`,
      }
    }
    if (step.type === 'search') {
      const wip = step.status === 'wip'
      const count = step.results.length
      const failed = step.status === 'failed'
      const interrupted = failed && !props.streaming && props.message.status === 'stopped'
      const panelEntry = `${props.message.id}-search-${step.key}`
      const query =
        wip && step.queries.length > 0
          ? step.queries[queryTick.value % step.queries.length]
          : null
      let text: string | null = null
      if (query === null) {
        if (wip) {
          text = t(isImageSearchKind(step.kind) ? 'imageSearching' : 'messageSearching')
        } else if (interrupted) {
          text = t('searchStopped')
        } else if (failed) {
          text = t('toolSearchFail')
        } else if (count === 0) {
          text = t(isDeepSearchKind(step.kind) ? 'toolSearchNoResult' : 'messageSearchNoResult')
        }
      }
      const summary =
        query === null && text === null
          ? t(
              isDeepSearchKind(step.kind)
                ? count === 1
                  ? 'toolSearch1Result'
                  : 'toolSearchResults'
                : count === 1
                  ? 'messageSearchResult'
                  : 'messageSearchResults',
              { count }
            )
          : null
      return {
        ...EMPTY_ROW,
        type: 'search',
        key: step.key,
        failed,
        clickable: !wip && count > 0,
        active: entry.value === panelEntry,
        panelEntry,
        results: step.results,
        query,
        text,
        summary,
      }
    }
    if (step.type === 'open') {
      const count = step.pages.length
      return {
        ...EMPTY_ROW,
        type: 'open',
        key: `${step.type}-${index}`,
        allFailed: step.pages.every((page) => page.status === 'failed'),
        intro: t(count === 1 ? 'toolOpenOneIntro' : 'toolOpensIntro', { count }),
        pages: step.pages.slice(0, 5),
        pageFailedTip: t('toolOpenFailTooltip'),
        showViewAll: count > 5,
        viewAllEntry: `open-${step.pages[0]?.id}`,
        viewAllSources: props.view.sources.filter((source) =>
          step.pages.some((page) => page.url === source.url)
        ),
      }
    }
    if (step.type === 'find') {
      return {
        ...EMPTY_ROW,
        type: 'find',
        key: `${step.type}-${index}`,
        allFailed: step.patterns.every((item) => item.status === 'failed'),
        items: step.patterns.map((item) => ({
          id: item.id,
          pattern: item.pattern,
          status: item.status,
          tooltip: item.status === 'failed' ? t('toolFindFailTooltip') : null,
        })),
      }
    }
    return { ...EMPTY_ROW, type: 'read_link', key: `${step.type}-${index}`, links: step.links }
  })
)

const openViewAll = (panelEntry: string | null, sources: Source[]) => {
  if (panelEntry) {
    toggleSearchPanel(panelEntry, sources)
  }
}
</script>

<template>
  <div v-if="visible" :class="styles.area">
    <div v-if="title" :class="styles.title" @click="open = !open">
      <span :class="clsx(styles.titleIcon, stopped && styles.stoppedIcon)">
        <IconThinkOutline16 />
      </span>
      <span :class="clsx(styles.titleText, titleActive && styles.shimmer)">{{ title }}</span>
      <IconChevronDownOutline14 v-if="open" />
      <IconChevronRightOutline14 v-else />
    </div>
    <div v-if="open || !title">
      <template v-for="(row, index) in rows" :key="row.key">
        <div
          v-if="row.type === 'thinking' || row.type === 'text'"
          :class="clsx(styles.content, 'ds-think-content', index === rows.length - 1 && styles.lastItem)"
        >
          <span :class="styles.dot">
            <span :class="clsx(styles.dotInner, !row.loading && styles.inactive)" />
          </span>
          <Markdown
            :content="row.markdown"
            :loading="row.loading"
            :cache-key="row.cacheKey"
            :disable-link="row.disableLink"
            :sources="row.sources"
          />
        </div>
        <div
          v-else-if="row.type === 'search'"
          :class="
            clsx(
              styles.row,
              index < rows.length - 1 && styles.withLine,
              row.clickable && styles.clickable,
              row.active && styles.active
            )
          "
          @click="row.clickable && toggleSearchPanel(row.panelEntry, row.results)"
        >
          <span :class="styles.rowIcon">
            <IconSearchWarningOutline16 v-if="row.failed" />
            <IconSearchOutline16 v-else />
          </span>
          <template v-if="row.query !== null">
            <span :class="styles.prefix">{{ t('toolSearchIntro') }}</span>
            <!-- key 随搜索词变化重挂载，重播 fadeIn 动画 -->
            <span v-for="query in [row.query]" :key="query" :class="styles.query">{{ query }}</span>
          </template>
          <span v-else-if="row.text !== null">{{ row.text }}</span>
          <template v-else>
            <span :class="styles.summary">{{ row.summary }}</span>
            <SiteThumbnails :sources="row.results" />
          </template>
        </div>
        <div
          v-else-if="row.type === 'open'"
          :class="clsx(styles.tool, index < rows.length - 1 && styles.withLine)"
        >
          <span :class="clsx(styles.rowIcon, styles.toolIcon)">
            <IconBrowseWarningOutline16 v-if="row.allFailed" />
            <IconBrowseOutline16 v-else />
          </span>
          <div :class="styles.toolBody">
            <template v-if="row.allFailed">{{ t('toolOpenFail') }}</template>
            <template v-else>
              <span :class="styles.intro">{{ row.intro }}</span>
              <span
                v-for="page in row.pages"
                :key="page.id"
                :class="
                  clsx(
                    styles.page,
                    page.status === 'failed' || !page.url ? styles.pageFailed : styles.pageDone
                  )
                "
              >
                <Tooltip v-if="page.status === 'failed'" :content="row.pageFailedTip ?? ''">
                  <span :class="styles.pageText">{{ page.title }}</span>
                </Tooltip>
                <a
                  v-else
                  :class="styles.pageText"
                  :href="page.url"
                  target="_blank"
                  rel="noreferrer"
                >
                  {{ page.title }}
                </a>
                <span :class="styles.pageIcon">
                  <IconRightUpOutline14 />
                </span>
              </span>
              <span
                v-if="row.showViewAll"
                :class="styles.chip"
                @click="openViewAll(row.viewAllEntry, row.viewAllSources)"
              >
                {{ t('toolOpenViewAll') }}
              </span>
            </template>
          </div>
        </div>
        <div
          v-else-if="row.type === 'find'"
          :class="clsx(styles.tool, index < rows.length - 1 && styles.withLine)"
        >
          <span :class="clsx(styles.rowIcon, styles.toolIcon)">
            <IconBrowseWarningOutline16 v-if="row.allFailed" />
            <IconBrowseOutline16 v-else />
          </span>
          <div :class="styles.toolBody">
            <template v-if="row.allFailed">{{ t('toolFindFail') }}</template>
            <template v-else>
              <span :class="styles.intro">{{ t('toolFindIntro') }}</span>
              <Tooltip
                v-for="item in row.items"
                :key="item.id"
                :content="item.tooltip ?? ''"
              >
                <span :class="clsx(styles.chip, item.status === 'failed' && styles.chipFailed)">
                  <span v-if="item.status !== 'wip'" :class="styles.chipIcon">
                    <IconCloseFill14 v-if="item.status === 'failed'" />
                    <IconCheckedOutline14 v-else />
                  </span>
                  <span :class="styles.chipText">{{ item.pattern }}</span>
                </span>
              </Tooltip>
            </template>
          </div>
        </div>
        <div v-else :class="clsx(styles.tool, index < rows.length - 1 && styles.withLine)">
          <span :class="clsx(styles.rowIcon, styles.toolIcon)">
            <IconLinkOutline16 />
          </span>
          <div :class="styles.toolBody">
            <span :class="clsx(styles.intro, styles.shimmer)">{{ t('readingLink') }}</span>
            <span
              v-for="link in row.links"
              :key="link.id"
              :class="
                clsx(
                  styles.page,
                  link.status === 'failed' || !link.url ? styles.pageFailed : styles.pageDone
                )
              "
            >
              <Tooltip v-if="link.status === 'failed'" content="">
                <span :class="styles.pageText">{{ link.title }}</span>
              </Tooltip>
              <a v-else :class="styles.pageText" :href="link.url" target="_blank" rel="noreferrer">
                {{ link.title }}
              </a>
              <span :class="styles.pageIcon">
                <IconRightUpOutline14 />
              </span>
            </span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
