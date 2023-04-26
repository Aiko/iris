<script lang="ts" setup>
import Icon from "@Veil/components/Base/Icon.vue"
import { infoContent } from '@Veil/state/sections'
import { RosettaStone, i18n } from "@Veil/utils/rosetta/rosetta";



// Information variables for 'AddBoard' component
const infoAddBoard = i18n(RosettaStone.boards.new_board.tip)
</script>

<template>
  <div class="add-board" @mouseover="infoContent = infoAddBoard" @mouseleave="infoContent = ''">
    <Icon name="plus" color="normal" />
  </div>
</template>

<style scoped>
.add-board {
  cursor: pointer;
  width: 30px;
  height: 185px;
  background: var(--primary-background-color);
  border-radius: var(--primary-border-radius);
  position: relative;
  contain: size layout;
  box-shadow: var(--board-shadow);
  border: none !important;
  text-align: center;
  opacity: 8;
  display: inline-table;
  transition: .2s;
}

.add-board:hover {
  opacity: 1;
  transition: .2s;
}

.add-board img {
  margin-top: 80px;
  width: 15px;
}
</style>