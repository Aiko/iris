<script lang="ts" setup>
import { ref } from '@vue/reactivity'
import ButtonSecondary from '@Veil/components/Base/ButtonSecondary.vue'
import { Sortable } from "sortablejs-vue3";
import type SortableJS from "sortablejs";
import EmailCard from "@Veil/components/Home/EmailCard.vue"
import Icon from "@Veil/components/Base/Icon.vue"
import Empty from "@Veil/components/Home/Empty.vue"
import { infoContent, selectedModal, Modal } from '@Veil/state/sections'
import Loader from '@Veil/components/Base/Loader.vue'
import { resolveEmail, } from '@Veil/state/notional'
import Logger from '@Veil/services/roots'
import { RosettaStone, i18n } from "@Veil/utils/rosetta/rosetta";
const Log = new Logger('Board')

const props = defineProps<{
  isInbox?: boolean
  demo?: boolean
  board?: {
    name: string
    emails: { mid: string }[]
  }
}>()

if (props.demo && props.board) props.board.emails = [props.board.emails[0]]

const showBoardMenu = ref(false)
const size = ref('large')

// Information variables for 'Board' component
const infoPriorityOther = i18n(RosettaStone.boards.board.priority_other)
const infoBoardRules = i18n(RosettaStone.boards.board.board_rules)
</script>

<template>
  <!--TODO: loading to 'board' based on if loading -->
  <div :class="{
    'board': true,
    [size]: true
  }">
    <div class="small-board-click-area" @click="size = 'large'"></div>
    <div class="board-header">
      <div class="acont" v-if="!demo">
        <a v-if="isInbox" @click="showBoardMenu = true">
          <Icon name="dots" color="normal" class="t8" />
        </a>
        <a v-if="isInbox">
          <Icon name="refresh" color="normal" class="refresh" />
        </a>
      </div>

      <h1 v-if="!isInbox" class="board-width-trigger">
        <div class="board-width-picker">
          <div @click="size = 'small'">S</div>
          <div @click="size = 'medium'">M</div>
          <div @click="size = 'large'">L</div>
        </div>
        {{ board?.name ?? "New Board"}}
        <div class="count count2">
          {{ board?.emails.length }}
        </div>
      </h1>


      <div class="options" v-if="showBoardMenu" tabindex="0" ref="options" @focusout="showBoardMenu = false" autofocus>
        <div class="option" v-if="isInbox">
          <p>Manage board rules</p>
          <ButtonSecondary lass="btn" @click="selectedModal = Modal.BoardRules"
            @mouseover="infoContent = infoBoardRules" @mouseleave="infoContent = ''">
            {{ i18n(RosettaStone.boards.board.board_rules_btn) }}
          </ButtonSecondary>
        </div>
        <div class="option" v-if="isInbox">
          <p>{{ i18n(RosettaStone.boards.board.sort_emails_btn) }}</p>
          <ButtonSecondary lass="btn">{{ i18n(RosettaStone.boards.board.sort_emails_date1_btn) }}</ButtonSecondary>
          <ButtonSecondary lass="btn">{{ i18n(RosettaStone.boards.board.sort_emails_date1_btn) }}</ButtonSecondary>
          <ButtonSecondary lass="btn">{{ i18n(RosettaStone.boards.board.sort_emails_unread_btn) }}</ButtonSecondary>
        </div>
      </div>





      <div :class="{
        'switch': true,
        'demoswitch': demo
      }
      " v-if="isInbox" @mouseover="infoContent = infoPriorityOther" @mouseleave="infoContent = ''">
        <div class="tab active">
          {{ i18n(RosettaStone.boards.board.priority) }}
          <div class="count">
            7
          </div>
        </div>
        <div class="tab">
          {{ i18n(RosettaStone.boards.board.other) }}
          <div class="count">
            99+
          </div>
        </div>
      </div>
    </div>


    <div class="board-body">

      <Sortable :list="board?.emails ?? []" item-key="mid" tag="div" style="min-height: 100%;" :options="{
        draggable: '.email-card',
        ghostClass: 'ghost',
        group: { name: 'emails' },
        dragHandle: '.email-card',
      }" class="dragarea" @end="(event: SortableJS.SortableEvent) => Log.info('Drag end', event)"
        @move.capture="(event: SortableJS.MoveEvent, event2: Event) => { Log.info('Drag move', event, event2); return true }">
        <template #item="{ element, index }">
          <EmailCard v-if="resolveEmail(element.mid)" :key="element.mid" :email="resolveEmail(element.mid)"
            :demo="demo" />
        </template>
        <template #footer>
          <Empty v-if="!isInbox && (board?.emails ?? []).length == 0">
            <Icon name="drag" color="normal" />
            <p class="mt-2"> {{ i18n(RosettaStone.boards.board.drag_emails_here) }}</p>
          </Empty>
          <Empty v-if="isInbox == true && !demo">
            <Loader class="mt-4" />
            <p class="mb-2 mt-2"> {{ i18n(RosettaStone.boards.board.loading_more_emails) }}</p>
            <ButtonSecondary class="mb-4"> {{ i18n(RosettaStone.boards.board.check_others) }}</ButtonSecondary>
          </Empty>
        </template>
      </Sortable>

    </div>
  </div>
</template>

<style scoped>
.board {
  width: 300px;
  background: var(--primary-background-color);
  border-radius: var(--primary-border-radius) var(--primary-border-radius) 0 0;
  height: 100%;
  margin-right: 15px;
  position: relative;
  box-shadow: var(--board-shadow);
  border: none !important;
  transition: .2s;
}

.empty img {
  width: 20px;
  margin-top: 5px;
}

.dot {
  position: absolute;
  left: 0;
  margin-left: 0px;
}

.board-header {
  height: 50px;
  width: 100%;
  padding: 18px 0;
  cursor: pointer;
  display: inline-block;
  text-align: center;
  -webkit-touch-callout: none;
  /* iOS Safari */
  -webkit-user-select: none;
  /* Safari */
  -khtml-user-select: none;
  /* Konqueror HTML */
  -moz-user-select: none;
  /* Old versions of Firefox */
  -ms-user-select: none;
  /* Internet Explorer/Edge */
  user-select: none;
}

.medium {
  width: 150px;
}

.demoswitch {
  left: 0 !important;
  right: unset !important;
  margin-left: 10px;
}

.medium .email-card {
  padding: 6px 6px 0 6px;
}

.small {
  width: 30px;
  box-shadow: none !important;
  background: transparent !important;
}

.small .dot {
  display: none;
}

.small .email-card {
  pointer-events: none;
  display: none;
}

.small .board-header {
  border-radius: var(--primary-border-radius);
  background: var(--primary-background-color);
  height: 185px !important;
  position: relative;
  z-index: 5;
  cursor: pointer !important;
  filter: brightness(1);
  transition: .2s;
}

.small .board-header:hover {
  filter: brightness(1.2);
  transition: .2s;
}

.small-board-click-area:hover+.board-header {
  filter: brightness(1.2);
  transition: .2s;
}

.small h1 {
  writing-mode: vertical-rl;
  padding: 15px 10px 0 10px !important;
  margin-top: -15px !important;
  transition: .2s;
  z-index: 11;
  position: relative;
  overflow: visible;
  text-align: left;
  max-width: 100% !important;
  margin-top: 0;
  margin-left: 5px;
}

.small .board-body {
  padding: 0;
  width: 40px;
  margin-left: -5px;
  height: 180px;
  margin-top: -150px;
  pointer-events: none;


}

.board-header h1 {
  text-align: center;
  font-size: 17px;
  display: inline;
  text-transform: capitalize;
  white-space: nowrap;
  overflow: hidden;
  padding: 20px 15px 10px 15px;
  text-overflow: ellipsis;
  max-width: calc(100% - 45px);

}

.small .board-header h1 {
  position: unset;
}

.board-header img {
  padding: 7px 0px;
  width: 23px;
  transition: .2s;
}

.board-header img:hover {
  opacity: .6;
  transition: .2s;
}

.board-body {
  padding: 1px 10px 0 10px;
  overflow-y: scroll;
  height: calc(100% - 51px);
  scroll-behavior: smooth;
  overflow-x: hidden;
  position: relative;
}

.board .switch {
  display: inline-flex;
  position: absolute;
  right: 0;
  margin-right: 10px;
  height: 35px;
  margin-top: -5px;
  color: var(--primary-font-color);
  border-radius: var(--primary-border-radius);
  overflow: hidden;
  border: 2px solid var(--secondary-background-color);
  cursor: pointer;
}

.board .tab {
  display: inline-flex;
  background-color: var(--primary-background-color);
  padding: 3px 5px 3px 7px;
  opacity: .5;
  letter-spacing: .2px;
  transition: .2s;
}

.board .tab:hover {
  opacity: 1;
  transition: .2s;
}

.board .switch .active {
  background-color: var(--secondary-background-color);
  opacity: 1;
  font-weight: 500;
  transition: .2s;
}

.count {
  padding: 0px 4px;
  min-width: 20px;
  margin-left: 5px;
  font-size: 13px;
  height: 20px;
  margin-top: 3px;
  text-align: center;
  background: var(--secondary-background-color);
  border-radius: var(--primary-border-radius);
}

.active .count {
  background: var(--primary-background-color);
}

.board-header .btn {
  font-size: 12px;
  margin-top: -4px;
}

.top .t8 {
  widows: 28px;
  margin-left: -15px;
}

.acont {
  position: absolute;
  left: 0;
  margin-left: 5px;
  margin-top: -5px;
}

.refresh {
  width: 20px !important;
  margin-left: 5px;
}


















@property --rotate {
  syntax: "<angle>";
  initial-value: 132deg;
  inherits: false;
}

.loading::before {
  position: absolute;
  content: "";
  top: 0;
  left: 0;
  height: 100%;
  border-radius: var(--primary-border-radius);
  width: 100%;
  margin: 0 auto;
  background-image: linear-gradient(var(--primary-background-color) 10%, var(--secondary-background-color));
  opacity: 1;
  transition: opacity .5s;
  animation: spin 2.5s linear infinite;
}

@keyframes spin {
  0% {
    height: 0%;
    opacity: .5;
  }

  100% {
    height: 150%;
    opacity: 0;
  }
}


.board-header .options {
  position: absolute;
  z-index: 1;
  top: 0;
  left: 0;
  overflow: visible;
  outline: none !important;
  display: inline-block;
  width: 100%;
  border-radius: var(--primary-border-radius);
  border: 3px solid var(--primary-background-color);
  box-shadow: 11px 14px 10px #00000040;
  background: var(--secondary-background-color);
}

.board-header .options div {
  padding: 0 5px 10px 5px;
}

.size {
  text-align: left;
  white-space: nowrap;
  margin-right: 10px;
}

.medium .options {
  display: inline-table;
  padding: 0;
  margin: 0;
  margin-left: -12px;
}

.medium .option {
  width: 100%;
  padding: 0;
  margin: 0;
}

.size p,
.option p {
  font-size: 13px;
  margin-bottom: 2px;
  margin-top: 10px;
  margin-left: 5px;
}

.option {
  width: 100%;
  text-align: left;
  overflow: visible;
}

.option a img {
  width: 20px;
}







.board-width-picker {
  background: var(--secondary-background-color);
  border-radius: 5px;
  padding: 0 3px 2px 0;
  margin-top: -25px;
  border: 1px solid var(--primary-background-color);
  display: inline-flex;
  position: absolute;
  left: 50%;
  transform: translate(-50%, 0%);
}

.board-width-trigger .board-width-picker {
  visibility: hidden;
}

.board-width-trigger {
  z-index: 6;
}

.board-width-trigger:hover .board-width-picker {
  visibility: visible;
}

.small .board-width-trigger:hover .board-width-picker {
  visibility: visible;
}

.small .board-width-picker {
  display: none;
}

.small .board-width-trigger:hover {
  overflow: visible;
}

.clicktoexpand:hover .board-width-picker {
  visibility: visible;
}

.board-width-picker div {
  background: var(--primary-background-color);
  box-shadow: inset 0 0 3px 1px rgb(0 0 0 / 11%);
  height: 18px;
  margin-top: 2px;
  border-radius: 3px;
  font-size: 15px;
  text-align: center;
}

.board-width-picker div:hover {
  background-color: var(--primary-font-color);
  color: var(--modal-backdrop);
  transition: .2s;
}

.board-width-picker div:nth-child(3) {
  width: 33px;
  margin-left: 3px;
}

.board-width-picker div:nth-child(2) {
  width: 23px;
  margin-left: 3px;
}

.board-width-picker div:nth-child(1) {
  width: 17px;
  margin-left: 3px;
}

.hoverzone:hover+.board-header {
  background: #f8f9fade !important;
  transition: .2s;
}

.hoverzone {
  width: 40px;
  margin-left: -5px;
  height: 180px;
  position: absolute;
  margin-top: 35px;
  z-index: 4;
  top: 0;
}

.email-card.ghost,
.email-card.cloned {
  opacity: 0;
  height: fit-content;
  transition: unset !important;
  visibility: hidden;
}

.small-board-click-area {
  display: none;
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 100;
  cursor: pointer;
}

.count2 {
  max-width: 30px;
  display: inline-block;
  height: 20px;
  padding: 2px 6px;
}

.small .count2 {
  transform: rotate(270deg);
  position: absolute;
  bottom: 0;
  width: 100%;
  right: 0;
  margin-bottom: 5px;
  height: 25px;

}

.small .small-board-click-area {
  display: unset;
}
</style>