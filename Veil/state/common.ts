// User Interface Variables
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
export const isEmailSidebarCollapsed = ref(true)
export const isDevControlsCollapsed = ref(true)
export const devMode = ref(false)

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




