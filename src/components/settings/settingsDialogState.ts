import { createVueStore } from '../../utils/vueStore.js'

/** 设置弹窗的分组：通用设置 / 数据管理 */
export type SettingsSection = 'general' | 'data'

/** 设置弹窗：侧边栏底部与数据管理入口都可以打开；section 为打开时选中的分组 */
export const useSettingsDialog = createVueStore<{
  open: boolean
  section: SettingsSection
}>(() => ({
  open: false,
  section: 'general',
}))

export const openSettings = (section: SettingsSection) =>
  useSettingsDialog.setState({ open: true, section })

export const closeSettings = () => useSettingsDialog.setState({ open: false })
