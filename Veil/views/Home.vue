<script lang="ts" setup>
import Board from "@Veil/components/Home/Board.vue";
import AddBoard from "@Veil/components/Home/AddBoard.vue";
import SideEmail from "@Veil/components/Home/SideEmail.vue";
import { isRegularView } from '@Veil/state/sections';
import Modal from '@Veil/components/Modals/Modal.vue';
import Icon from '@Veil/components/Base/Icon.vue';
import ButtonPrimary from '@Veil/components/Base/ButtonPrimary.vue';
import ButtonSecondary from '@Veil/components/Base/ButtonSecondary.vue';
import ModalAddBoard from '@Veil/components/Modals/ModalAddBoard.vue';
import ModalBoardRules from '@Veil/components/Modals/ModalBoardRules.vue';
import ModalEmail from '@Veil/components/Modals/ModalEmail.vue';
</script>

<template>
  <div class="home" v-if="true">
    <div class="boards">

      <!--Boards are normal unless they have 'inbox' attribute-->
      <Board is-inbox />

      <!--Work in progress: 'isRegular' will be regular non-kanban view-->
      <Board v-if="!isRegularView" />
      <AddBoard v-if="!isRegularView" />
      <SideEmail v-if="isRegularView" />
    </div>


    <!--Modals-->
    <Modal size="small" v-if="false">
      <ModalAddBoard />
    </Modal>

    <Modal size="large" v-if="false">
      <ModalBoardRules />
    </Modal>

    <Modal size="large" v-if="false">
      <ModalEmail />
    </Modal>

  </div>
</template>

<style scoped>
.home {
  width: 100%;
  overflow-x: scroll;
  height: calc(100% - 50px);
  padding-left: 20px;
  display: inline-flex;
}

.home .boards {
  overflow: visible;
  display: inline-flex;
  width: 100%;
}
</style>