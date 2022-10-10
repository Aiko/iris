// User Interface Variables
import { ref } from '@vue/reactivity';

// Sidebar collapse state
export let isSidebarCollapsed = ref(false)

// Fullscreen State
export let isFullScreen = ref(false)

// Regular View State
export let isRegularView = ref(false)

// Regular View State
export let isLoading = ref(false)

// Global Tooltip Content (Experimental)
export let infoContent = ref('')

// Composer Sidebar Collapse
export let isComposerSidebarCollapsed = ref(true)

// Composer Sidebar Collapse
export let isEmailSidebarCollapsed = ref(true)

// Feedback Modal Dev Controls Collapse
export let isDevControlsCollapsed = ref(true)

export enum Modal {
    AddBoard,
    AddMailbox,
    AddSpace,
    BoardRules,
    Email,
    Feedback,
    Upgrade,
    None,
  }

export let selectedModal = ref(Modal.None)




