<script lang="ts" setup>
import Board from "@Veil/components/Home/Board.vue"
</script>

<template>
  <div class="home" v-if="true">
    <div class="boards">

      <!--Boards are normal unless they have 'isInbox' attribute-->
      <Board isInbox />

    </div>
  </div>
</template>

<style scoped>
.home {
  width: 100%;
  overflow-x: scroll;
  overflow-y: hidden;
  height: calc(100% - 50px);
  padding-left: 20px;
  display: inline-flex;
}

.home .boards {
  overflow-x: visible;
  display: inline-flex;
  padding-right: 20px;
}

.board {
	height: fit-content !important;
}
</style>