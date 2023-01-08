<script lang="ts" setup>
import { isRegularView, selectedModal, Modal } from '@Veil/state/sections'
import Board from "@Veil/components/Home/Board.vue"
import AddBoard from "@Veil/components/Home/AddBoard.vue"
import SideEmail from "@Veil/components/Home/SideEmail.vue"
import { Sortable } from "sortablejs-vue3";
import type SortableJS from "sortablejs";
import { boards, resolveBoard, INBOX } from "@Veil/state/notional";
</script>

<template>
  <div class="home" v-if="true">
    <div class="boards">

      <Board isInbox :board="INBOX" />

			<Sortable
				v-if="!isRegularView"
				tag="div"
				style="display: inline-flex;"
				:list="boards"
				item-key="slug"
				:options="{
					draggable: '.board',
					dragHandle: '.board-drag-handle',
					ghostClass: 'ghost',
					group: {name: 'boards'},
				}"
			>
				<template #item="{element, index}">
					<Board :board="resolveBoard(element.slug)" />
				</template>
			</Sortable>

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

.board.ghost, .board.cloned {
  opacity: 0;
  width: 300px;
  visibility: hidden;
}
</style>