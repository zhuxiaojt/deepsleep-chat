import { createVueStore } from '../../utils/vueStore.js'
import type { Source } from '../../services/chat/view.js'

/** 右侧「搜索结果」面板：同一入口再次点击收起，换入口时替换内容 */
type SearchPanelState = {
  entry: string | null
  sources: Source[]
}

export const useSearchPanel = createVueStore<SearchPanelState>(() => ({ entry: null, sources: [] }))

export const toggleSearchPanel = (entry: string, sources: Source[]) =>
  useSearchPanel.setState((state) =>
    state.entry === entry ? { entry: null, sources: [] } : { entry, sources }
  )

export const closeSearchPanel = () => useSearchPanel.setState({ entry: null, sources: [] })
