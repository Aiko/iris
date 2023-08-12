// User Interface Variables
import { ref, reactive } from '@vue/reactivity'

export const Sidebar = reactive({
  collapsed: false
})

// @ts-ignore
export const platform = ref<string>(window.platform || 'win32')

// Fullscreen State
export const isFullScreen = ref(false)

// Regular View State
export const isRegularView = ref(false)

// Regular View State
export const isLoading = ref(false)

// Global Tooltip Content (Experimental)
export const infoContent = ref('')

// Composer Sidebar Collapse
export const isComposerSidebarCollapsed = ref(true)

// Composer Sidebar Collapse
export const isEmailSidebarCollapsed = ref(true)

// Feedback Modal Dev Controls Collapse
export const isDevControlsCollapsed = ref(true)

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




