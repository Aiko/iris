<script lang="ts" setup>
import Board from "@Veil/components/Home/Board.vue";
import AddBoard from "@Veil/components/Home/AddBoard.vue";
import SideEmail from "@Veil/components/Home/SideEmail.vue";

defineProps<{
  regular?: boolean
}>()

</script>

<template>
  <div class="home">
    <div class="boards">

      <!--Boards are normal unless they have 'inbox' attribute-->
      <Board is-inbox />

      <!--Work in progress: 'Regular' will be regular non-kanban view-->
      <Board v-if="!regular" />
      <AddBoard v-if="!regular" />
      <SideEmail v-if="regular" />
    </div>
  </div>
</template>

<style scoped>
.home {
  width: 100%;
  overflow-x: scroll;
  height: calc(100% - 50px);
  background-color: var(--secondary-background-color);
  padding-left: 20px;
  display: inline-flex;
}

.home .boards {
  overflow: visible;
  display: inline-flex;
  width: 100%;
}
</style>