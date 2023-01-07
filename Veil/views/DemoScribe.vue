<script lang="ts" setup>
import HeaderRight from "@Veil/components/Header/HeaderRight.vue";
import Board from "@Veil/components/Home/Board.vue"
</script>

<template>
  <HeaderRight />
  <div class="home" v-if="true">
    <div class="boards">

      <!--Boards are normal unless they have 'isInbox' attribute-->
      <Board isInbox demo />

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
  overflow: visible;
  padding-bottom: 30px;
  border-radius: var(--primary-border-radius) !important;
}



.board {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.control-bar {
  margin-top: 20% !important;
}
</style>