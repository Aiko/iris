<script lang="ts" setup>
import { isRegularView, selectedModal, Modal } from '@Veil/state/sections'
import Board from "@Veil/components/Home/Board.vue"
import AddBoard from "@Veil/components/Home/AddBoard.vue"
import SideEmail from "@Veil/components/Home/SideEmail.vue"
</script>

<template>
  <div class="home" v-if="true">
    <div class="boards">

      <!--Boards are normal unless they have 'isInbox' attribute-->
      <Board isInbox />

      <!-- 'isRegular' is for regular, non-kanban view-->
      <Board v-if="!isRegularView" />

      <AddBoard v-if="!isRegularView" @click="selectedModal = Modal.AddBoard" />
      <SideEmail v-if="isRegularView" />
    </div>
  </div>
</template>

<style scoped>
.home {
  width: 100%;
  padding-top: 10px;
  margin-top: -10px;
  overflow-x: scroll;
  height: calc(100% - 40px);
  padding-left: 20px;
  display: inline-flex;
}

.home .boards {
  overflow-x: visible;
  overflow-y: hidden;
  display: inline-flex;
  padding-right: 20px;
  margin-top: -10px;
  padding-top: 10px;
}
</style>