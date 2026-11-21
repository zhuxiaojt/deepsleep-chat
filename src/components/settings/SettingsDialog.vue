<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import clsx from 'clsx'
import {
  IconDataOutline16,
  IconDarkOutline16,
  IconDownloadOutline16,
  IconFollowsystemOutline16,
  IconLightOutline16,
  IconSettingsOutline16,
  IconUploadOutline14,
} from '../base/icons.js'
import {
  BackupError,
  clearHistory,
  exportHistory,
  importHistory,
} from '../../services/chat/backup.js'
import { useChatStore } from '../../services/chat/store.js'
import { regionCodes, getRegionName, provinces } from '../../services/location.js'
import {
  isChineseBrowser,
  setLocale,
  setLocation,
  setThemePreference,
  useSettings,
  type Locale,
  type ThemePreference,
} from '../../services/settings.js'
import { useTranslate, type TranslationKey, type TranslationMessage } from '../../i18n/index.js'
import Button from '../base/Button.vue'
import Modal from '../base/Modal.vue'
import Select from '../base/Select.vue'
import { showToast } from '../base/toastState.js'
import { closeSettings, useSettingsDialog, type SettingsSection } from './settingsDialogState.js'
import SettingCell from './SettingCell.vue'
import styles from './Settings.module.css'

/** `reason` 为失败原因的文案 key，展示时按当前语言翻译后填入 `message` 参数。 */
type Status = (TranslationMessage & { error?: boolean; reason?: TranslationKey }) | null

const t = useTranslate()
const open = useSettingsDialog((state) => state.open)
// 打开时按调用方指定的分组选中，之后在弹窗内切换
const section = ref<SettingsSection>(useSettingsDialog.getState().section)

const sections: { value: SettingsSection; label: TranslationKey }[] = [
  { value: 'general', label: 'settingDialogAsideGeneralOptionLabel' },
  { value: 'data', label: 'settingDialogAsideDataOptionLabel' },
]

const replacingHistory = useChatStore((state) => state.importingHistory)

const emptyHistory = useChatStore((state) => state.sessions.length === 0)
const exportBusy = ref(false)
const exportStatus = ref<Status>(null)

const errorStatus = (key: TranslationKey, error: unknown): Status => ({
  key,
  ...(error instanceof BackupError
    ? { reason: error.key }
    : { params: { message: error instanceof Error ? error.message : String(error) } }),
  error: true,
})

const closeDialog = () => {
  if (!deleteState.busy) {
    closeSettings()
  }
}

/** 导入 = 覆盖：用选中文件替换本地全部会话与附件。 */
const importState = reactive<{ file: File | null; busy: boolean; status: Status }>({
  file: null,
  busy: false,
  status: null,
})
let importing = false

const selectImportFile = (file: File) => {
  importState.file = file
}

const cancelImport = () => {
  importState.file = null
}

const confirmImport = async () => {
  const file = importState.file
  if (!file || importing) {
    return
  }
  importing = true
  importState.file = null
  importState.busy = true
  importState.status = null
  try {
    const count = await importHistory(file)
    importState.status = {
      key: count === 1 ? 'historyImportedOne' : 'historyImported',
      params: { count },
    }
  } catch {
    importState.status = { key: 'historyImportFailed', error: true }
  } finally {
    importing = false
    importState.busy = false
  }
}

const deleteState = reactive({ opened: false, busy: false })
let deleting = false

const openDelete = () => {
  deleteState.opened = true
}

const cancelDelete = () => {
  if (!deleting) {
    deleteState.opened = false
  }
}

const confirmDelete = async () => {
  if (deleting) {
    return
  }
  deleting = true
  deleteState.busy = true
  try {
    await clearHistory()
    deleteState.opened = false
    showToast({ key: 'historyDeleted' })
  } catch {
    showToast({ key: 'historyDeleteFailed', type: 'error' })
  } finally {
    deleting = false
    deleteState.busy = false
  }
}

const historyBusy = computed(
  () => importState.busy || deleteState.busy || replacingHistory.value
)

/** 每次打开时重置弹窗内的临时状态，正在进行的导入与删除保持原样。 */
watch(open, (isOpen) => {
  if (!isOpen) {
    return
  }
  section.value = useSettingsDialog.getState().section
  importState.file = null
  deleteState.opened = false
  exportStatus.value = null
})

const inputRef = ref<HTMLInputElement | null>(null)

const onFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file) {
    selectImportFile(file)
  }
}

const onExport = async () => {
  exportBusy.value = true
  exportStatus.value = null
  try {
    const { name, blob } = await exportHistory()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = name
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  } catch (error) {
    exportStatus.value = errorStatus('historyExportFailed', error)
  } finally {
    exportBusy.value = false
  }
}

const themePreference = useSettings((state) => state.themePreference)
const themeOptions: { value: ThemePreference; label: TranslationKey }[] = [
  { value: 'light', label: 'avatarMenuSettingsDialogThemeSelectLightOption' },
  { value: 'dark', label: 'avatarMenuSettingsDialogThemeSelectDarkOption' },
  { value: 'system', label: 'avatarMenuSettingsDialogThemeSelectSystemOption' },
]

const locale = useSettings((state) => state.locale)
const location = useSettings((state) => state.location)
const chineseBrowser = isChineseBrowser()

const localeOptions = computed(() => [
  { value: 'zh-CN', label: t('settingsLocaleZhCN'), lang: 'zh-CN' },
  { value: 'en-US', label: t('settingsLocaleEnUS'), lang: 'en' },
])

const onLocaleChange = (value: string) => {
  setLocale(value as Locale)
}

const province = computed(() =>
  location.value?.region === 'CN'
    ? provinces.find((item) => item.code === location.value?.province)
    : undefined
)

const provinceOptions = provinces.map((item) => ({ value: item.code, label: item.name }))
const cityOptions = computed(
  () => province.value?.cities.map((item) => ({ value: item.code, label: item.name })) ?? []
)

const regionOptions = computed(() =>
  regionCodes
    .map((code) => ({ value: code, label: getRegionName(code, locale.value) }))
    .sort((a, b) => a.label.localeCompare(b.label, locale.value))
)

const onProvinceChange = (value: string) => {
  if (value !== province.value?.code) {
    setLocation({ region: 'CN', province: value })
  }
}

const onCityChange = (value: string) => {
  if (province.value) {
    setLocation({ region: 'CN', province: province.value.code, city: value })
  }
}
</script>

<template>
  <Modal
    v-if="open"
    :title="t('settings')"
    closable
    :class="styles.dialog"
    :main-class="styles.dialogMain"
    @close="closeDialog"
  >
    <div role="tablist" :class="styles.navigation">
      <button
        v-for="item in sections"
        :key="item.value"
        type="button"
        role="tab"
        :aria-selected="section === item.value"
        :class="clsx(styles.navItem, section === item.value && styles.navItemActive)"
        @click="section = item.value"
      >
        <IconSettingsOutline16 v-if="item.value === 'general'" />
        <IconDataOutline16 v-else />
        {{ t(item.label) }}
      </button>
    </div>
    <div role="tabpanel" :class="styles.content">
      <template v-if="section === 'general'">
        <div :class="styles.theme">
          {{ t('avatarMenuSettingsDialogThemeItemLabel') }}
          <div
            role="radiogroup"
            :aria-label="t('avatarMenuSettingsDialogThemeItemLabel')"
            :class="styles.themeOptions"
          >
            <button
              v-for="option in themeOptions"
              :key="option.value"
              type="button"
              role="radio"
              :aria-checked="themePreference === option.value"
              :class="
                clsx(
                  styles.themeOption,
                  themePreference === option.value && styles.themeOptionSelected
                )
              "
              @click="setThemePreference(option.value)"
            >
              <IconLightOutline16 v-if="option.value === 'light'" />
              <IconDarkOutline16 v-else-if="option.value === 'dark'" />
              <IconFollowsystemOutline16 v-else />
              {{ t(option.label) }}
            </button>
          </div>
        </div>
        <SettingCell :label="t('settingsLocalePreference')" :status="null">
          <template #action>
            <Select
              :aria-label="t('settingsLocalePreference')"
              :value="locale"
              :options="localeOptions"
              @change="onLocaleChange"
            />
          </template>
        </SettingCell>
        <SettingCell
          :label="t('settingsLocation')"
          :status="null"
          :class="styles.locationCell"
        >
          <template #action>
            <div :class="styles.locationSelectors">
              <template v-if="chineseBrowser">
                <Select
                  :aria-label="t('settingsLocationProvince')"
                  :class="styles.provinceSelect"
                  :value="province?.code ?? ''"
                  :placeholder="t('settingsLocationProvince')"
                  :options="provinceOptions"
                  @change="onProvinceChange"
                />
                <Select
                  :aria-label="t('settingsLocationCity')"
                  :class="styles.citySelect"
                  :value="province ? (location?.city ?? '') : ''"
                  :disabled="!province?.cities.length"
                  :placeholder="t('settingsLocationCity')"
                  :options="cityOptions"
                  @change="onCityChange"
                />
              </template>
              <Select
                v-else
                :aria-label="t('settingsLocationRegion')"
                :class="styles.regionSelect"
                :value="location?.region ?? ''"
                :placeholder="t('settingsLocationRegion')"
                :options="regionOptions"
                @change="setLocation({ region: $event })"
              />
            </div>
          </template>
        </SettingCell>
      </template>
      <template v-else>
        <SettingCell
          :label="t('historyImport')"
          :description="t('historyImportDescription')"
          :status="importState.status"
        >
          <template #action>
            <Button
              variant="outlined"
              size="m"
              :class="clsx(styles.cellButton, styles.uploadButton)"
              :disabled="historyBusy"
              @click="inputRef?.click()"
            >
              <IconUploadOutline14 />
              {{ t('upload') }}
            </Button>
            <input
              ref="inputRef"
              type="file"
              accept=".zip,application/zip,application/x-zip-compressed"
              hidden
              @change="onFileChange"
            />
          </template>
        </SettingCell>
        <SettingCell
          :label="t('exportAllLabel')"
          :description="t('historyExportDescription')"
          :status="exportStatus"
        >
          <template #action>
            <Button
              variant="outlined"
              size="m"
              :class="styles.cellButton"
              :disabled="historyBusy || exportBusy || emptyHistory"
              @click="onExport"
            >
              <IconDownloadOutline16 />
              {{ t('exportAllDownload') }}
            </Button>
          </template>
        </SettingCell>
        <SettingCell :label="t('deleteAllSessions')" :status="null">
          <template #action>
            <Button
              variant="dangerOutlined"
              size="m"
              :class="styles.cellButton"
              :disabled="historyBusy"
              @click="openDelete"
            >
              {{ t('delete') }}
            </Button>
          </template>
        </SettingCell>
      </template>
    </div>
  </Modal>
  <Modal
    v-if="importState.file"
    :title="t('historyImportConfirmTitle')"
    :class="styles.importConfirm"
    @close="cancelImport"
  >
    <div :class="styles.importConfirmText">{{ t('historyImportConfirmDescription') }}</div>
    <template #footer>
      <Button variant="outlined" size="m" autoFocus @click="cancelImport">
        {{ t('cancel') }}
      </Button>
      <Button variant="dangerOutlined" size="m" @click="confirmImport">
        {{ t('historyImportConfirm') }}
      </Button>
    </template>
  </Modal>
  <Modal
    v-if="deleteState.opened"
    :title="t('deleteAllSessionsModalTitle')"
    :class="styles.deleteConfirm"
    @close="cancelDelete"
  >
    {{ t('deleteAllSessionsModalDescription') }}
    <template #footer>
      <div :class="styles.deleteActions" :aria-busy="deleteState.busy">
        <Button variant="outlined" autoFocus :disabled="deleteState.busy" @click="cancelDelete">
          {{ t('cancel') }}
        </Button>
        <Button variant="danger" :disabled="deleteState.busy" @click="confirmDelete">
          {{ t(deleteState.busy ? 'historyDeleting' : 'deleteAllSessions') }}
        </Button>
      </div>
    </template>
  </Modal>
</template>
