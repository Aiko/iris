<script lang="ts" setup>
import "@aiko/dwarfhaven"
import LoaderScreen from "@Veil/components/Base/LoaderScreen.vue"
import ControlBar from "@Veil/components/Base/ControlBar.vue"
import { isFullScreen } from '@Veil/state/sections'
import { isLoading } from '@Veil/state/sections'
import { selectedModal, Modal } from '@Veil/state/sections'
import ModalShell from '@Veil/components/Modals/ModalShell.vue'
import ModalAddBoard from '@Veil/components/Modals/ModalAddBoard.vue'
import ModalBoardRules from '@Veil/components/Modals/ModalBoardRules.vue'
import ModalEmail from '@Veil/components/Modals/ModalEmail.vue'
import ModalFeedback from '@Veil/components/Modals/ModalFeedback.vue'
import ModalAddMailbox from '@Veil/components/Modals/ModalAddMailbox.vue'
import ModalUpgrade from '@Veil/components/Modals/ModalUpgrade.vue'
import ModalAddSpace from '@Veil/components/Modals/ModalAddSpace.vue'
import Settings from '@Veil/views/Settings.vue'
import ModalInvite from '@Veil/components/Modals/ModalInvite.vue'
import ModalInviteTeam from '@Veil/components/Modals/ModalInviteTeam.vue'
import devtools from '@vue/devtools'
import Logger from '@Veil/services/roots'
if (process.env.NODE_ENV === 'development') devtools.connect()

const Log = new Logger('Veil', { bgColor: "#09d8c1", fgColor: "#000000" })
// @ts-ignore
window.log = Log

</script>

<template>
  <div :class="{
    'app': true,
    'fullscreen': isFullScreen
  }">
    <!-- Control Bar-->
    <ControlBar v-if="!isFullScreen" />

    <router-view />
  </div>
  <!--Full Screen Loader-->
  <LoaderScreen v-if="isLoading" />

  <!--Modals-->
  <ModalShell size="small" v-if="selectedModal === Modal.Upgrade">
    <ModalUpgrade feature="Quick Actions" />
  </ModalShell>

  <ModalShell size="small" v-if="selectedModal == Modal.AddMailbox">
    <ModalAddMailbox />
  </ModalShell>

  <ModalShell size="small" v-if="selectedModal == Modal.AddSpace">
    <ModalAddSpace />
  </ModalShell>

  <ModalShell size="small" v-if="selectedModal == Modal.AddBoard">
    <ModalAddBoard />
  </ModalShell>

  <ModalShell size="small" v-if="selectedModal == Modal.Invite">
    <ModalInvite />
  </ModalShell>

  <ModalShell size="small" v-if="selectedModal == Modal.InviteTeam">
    <ModalInviteTeam />
  </ModalShell>

  <ModalShell size="large" v-if="selectedModal == Modal.BoardRules">
    <ModalBoardRules />
  </ModalShell>

  <ModalShell size="large" v-if="selectedModal == Modal.Email">
    <ModalEmail />
  </ModalShell>

  <ModalShell size="large" v-if="selectedModal == Modal.Settings">
    <Settings />
  </ModalShell>

  <ModalShell size="medium" v-if="selectedModal == Modal.Feedback">
    <ModalFeedback />
  </ModalShell>
</template>

<style lang="scss" scoped>
.app {
  width: 100%;
  height: 100%;
  padding: 16px 0 0 0;
  background-color: transparent;
  display: inline-flex;
  &.fullscreen {
    padding: 0;
  }
}

</style>