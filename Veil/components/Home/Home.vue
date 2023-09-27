<script lang="ts" setup>
import { isRegularView, selectedModal, Modal } from '@Veil/state/common'
import Board from "@Veil/components/Home/Board.vue"
import AddBoard from "@Veil/components/Home/AddBoard.vue"
import SideEmail from "@Veil/components/Home/SideEmail.vue"
import { Sortable } from "sortablejs-vue3";
import { boards, resolveBoard, INBOX } from "@Veil/state/notional";


//Filter Imports (Testing purposes)
import Filter from "@Veil/components/Filters/Filter.vue";
import FilterChoose from "@Veil/components/Filters/FilterChoose.vue";
import FilterDate from "@Veil/components/Filters/FilterDate.vue";
import FilterDateRange from "@Veil/components/Filters/FilterDateRange.vue";
import FilterInput from "@Veil/components/Filters/FilterInput.vue";
import FilterLabel from "@Veil/components/Filters/FilterLabel.vue";
import FilterList from "@Veil/components/Filters/FilterList.vue";
import FilterListogram from "@Veil/components/Filters/FilterListogram.vue";
import FilterManyChoose from "@Veil/components/Filters/FilterManyChoose.vue";
import FilterRange from "@Veil/components/Filters/FilterRange.vue";
import FilterTags from "@Veil/components/Filters/FilterTags.vue";
import FilterSlider from "@Veil/components/Filters/FilterSlider.vue";

</script>

<template>
  <div class="home" v-if="true">
    <div class="boards">

      <Board isInbox :board="INBOX" />

      <Sortable v-if="!isRegularView" tag="div" style="display: inline-flex;" :list="boards" item-key="slug" :options="{
        draggable: '.board',
        dragHandle: '.board-drag-handle',
        ghostClass: 'ghost',
        group: { name: 'boards' },
      }">
        <template #item="{ element, index }">
          <Board :board="resolveBoard(element.slug)" />
        </template>
      </Sortable>

      <AddBoard v-if="!isRegularView" @click="selectedModal = Modal.AddBoard" />
      <SideEmail v-if="isRegularView" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.home {
  width: 100%;
  padding-top: 10px;
  margin-top: -10px;
  padding-left: 20px;
  overflow-x: scroll !important;
  height: calc(100% - 40px);
  display: inline-flex;
  overflow: hidden;
}

.home .boards {
  overflow: visible;
  display: inline-flex;
  padding-right: 20px;
  margin-top: -10px;
  padding-top: 10px;
}

.board.ghost,
.board.cloned {
  opacity: 0;
  width: 300px;
  visibility: hidden;
}

.test-sidebar {
  position: absolute;
  top: 0;
  left: 0;
  width: 260px;
  height: 100%;
  padding: 15px;
  padding-top: 35px;
  z-index: 100000;
  overflow-y: scroll;
  opacity: 1;
  background-color: #222222;
  box-shadow: 0px 0px 20px 20px #00000052;
  ;
}
</style>@Veil/state/common