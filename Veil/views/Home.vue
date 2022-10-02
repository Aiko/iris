<script lang="ts" setup>
import Board from "@Veil/components/Home/Board.vue";
import AddBoard from "@Veil/components/Home/AddBoard.vue";
import SideEmail from "@Veil/components/Home/SideEmail.vue";

defineProps({
  regular: {
    type: Boolean,
    required: false
  }
})
</script>

<template>
  <div class="home">
    <div class="boards">
      <Board inbox />
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
}
</style>