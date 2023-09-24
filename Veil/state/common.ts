import ColorFilter from '@Veil/utils/color-filter'
import { ref, reactive } from '@vue/reactivity'

export const Sidebar = reactive({
  collapsed: false
})

// @ts-ignore
export const platform = ref<string>(window.platform || 'win32')
export const isFullScreen = ref(false)
export const isRegularView = ref(false)
export const isLoading = ref(false)
export const infoContent = ref('')
export const isComposerSidebarCollapsed = ref(true)
export const isEmailSidebarCollapsed = ref(false)
export const isDevControlsCollapsed = ref(true)
export const devMode = ref(false)

export const setAccentColor = (color?: string) => {
  const accentColor = parseInt(color?.slice(1) ?? "486FFF", 16)
  const root = document.documentElement
  root.style.setProperty('--primary-color', `#${accentColor.toString(16)}`)
  const hoverOffset = 0x050917
  root.style.setProperty('--primary-color-hover', `#${(accentColor - hoverOffset).toString(16)}`)
  const filter = ColorFilter(color ?? "#486FFF")
  root.style.setProperty('--primary-color-filter', filter)
}
// @ts-ignore
window.setAccentColor = setAccentColor

export enum Modal {
  AddBoard,
  AddMailbox,
  AddSpace,
  BoardRules,
  Email,
  Feedback,
  Upgrade,
  Invite,
  InviteTeam,
  Settings,
  None,
}

export let selectedModal = ref(Modal.None)




