<script lang="ts" setup>
import Icon from "@Veil/components/Base/Icon.vue"
import { infoContent } from '@Veil/state/common'
import { RosettaStone, i18n } from "@Veil/utils/rosetta/rosetta";



// Information variables for 'AddBoard' component
const infoAddBoard = i18n(RosettaStone.boards.new_board.tip)
</script>

<template>
  <div class="add-board" @mouseover="infoContent = infoAddBoard" @mouseleave="infoContent = ''">
    <Icon name="plus" color="normal" />
  </div>
</template>

<style lang="scss" scoped>
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
  display: inline-table;
  transition: .1s;
}

.add-board:hover {
  filter: brightness(1.2);
  transition: .1s;
}

.add-board img {
  margin-top: 80px;
  width: 15px;
}
</style>@Veil/state/common