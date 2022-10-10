<script lang="ts" setup>
import { isRegularView, selectedModal, Modal } from '@Veil/state/sections'
</script>

<template>
  <div class="settings" v-if="true">
    <div class="boards">

      <!--Boards are normal unless they have 'inbox' attribute-->
      <Board is-inbox />

      <!-- 'isRegular' is for regular, non-kanban view-->
      <Board v-if="!isRegularView" />
      <AddBoard v-if="!isRegularView" @click="selectedModal = Modal.AddBoard" />
      <SideEmail v-if="isRegularView" />

    </div>
  </div>
</template>

<style scoped>
.settings {
  width: 100%;
  overflow-y: scroll;
  height: 100%;
  display: inline-flex;
}
</style>