<script lang="ts" setup>
import { ref } from '@vue/reactivity'
import ButtonSecondary from '@Veil/components/Base/ButtonSecondary.vue'
import EmailCard from "@Veil/components/Home/EmailCard.vue"
import Icon from "@Veil/components/Base/Icon.vue"
import Empty from "@Veil/components/Home/Empty.vue"
import { infoContent, selectedModal, Modal } from '@Veil/state/sections'
import Loader from '@Veil/components/Base/Loader.vue'

defineProps<{
  isInbox?: boolean
}>()

let showBoardDots = ref(false)
const toggleBoardDots = () => showBoardDots.value = !(showBoardDots.value)


// Information variables for 'Board' component
const infoPriorityOther = 'Priority includes important emails and Others tab include secondary importance emails.'
const infoBoardRules = 'Board rules let you automatically sort emails into existing boards based on content, type, sender...'
</script>

<template>
  <!--TODO: Add small medium large to 'board' based on width option -->
  <!--TODO: loading to 'board' based on if loading -->
  <div class="board">
    <div class="board-header">
      <div class="acont">
        <a :class="{ 'dot': !isInbox }" @click="showBoardDots = true">
          <Icon name="dots" color="normal" class="t8" />
        </a>
        <a v-if="isInbox">
          <Icon name="refresh" color="normal" class="refresh" />
        </a>
      </div>
      <h1 v-if="!isInbox">Title</h1>
      <div class="options" v-if="showBoardDots" tabindex="0" ref="options" @focusout="showBoardDots = false" autofocus>
        <div class="size" v-if="!isInbox">
          <p>Board size</p>
          <ButtonSecondary class="btn">Small</ButtonSecondary>
          <ButtonSecondary class="btn">Medium</ButtonSecondary>
          <ButtonSecondary class="btn">Large</ButtonSecondary>
        </div>
        <div class="option" v-if="!isInbox">
          <p>Move all emails</p>
          <ButtonSecondary class="btn" color="red">
            Trash all
          </ButtonSecondary>
        </div>
        <div class="option" v-if="!isInbox">
          <p>Board actions</p>
          <ButtonSecondary class="btn" color="red">
            Delete board
          </ButtonSecondary>
        </div>
        <div class="option" v-if="isInbox">
          <p>Manage board rules</p>
          <ButtonSecondary lass="btn" @click="selectedModal = Modal.BoardRules"
            @mouseover="infoContent = infoBoardRules" @mouseleave="infoContent = ''">
            Board rules
          </ButtonSecondary>
        </div>
        <div class="option" v-if="isInbox">
          <p>Sort emails</p>
          <ButtonSecondary lass="btn">Date (Newest first)</ButtonSecondary>
          <ButtonSecondary lass="btn">Date (Oldest first)</ButtonSecondary>
          <ButtonSecondary lass="btn">Unread First</ButtonSecondary>
        </div>
      </div>
      <div class="switch" v-if="isInbox" @mouseover="infoContent = infoPriorityOther" @mouseleave="infoContent = ''">
        <div class="tab active">
          Priority
          <div class="count">
            7
          </div>
        </div>
        <div class="tab">
          Others
          <div class="count">
            99+
          </div>
        </div>
      </div>
    </div>
    <div class="board-body">



      <EmailCard />


      <Empty>
        <Icon name="drag" color="normal" />
        <p class="mt-2">Drag emails here</p>
      </Empty>


      <Empty>
        <Loader class="mt-4" />
        <p class="mb-2 mt-2">Loading more emails</p>
        <ButtonSecondary class="mb-4">Check 'Others' tab</ButtonSecondary>
      </Empty>


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
  overflow: hidden;
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
  cursor: unset !important;
  filter: brightness(1);
  transition: .2s;
}

.small .board-header:hover {
  filter: brightness(1.2);
  transition: .2s;
}

.small h1 {
  writing-mode: vertical-rl;
  padding: 15px 10px 0 10px;
  margin-top: -15px;
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
  padding: 0 10px 20px 10px;
  text-overflow: ellipsis;
  max-width: calc(100% - 45px);
  position: relative;
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
  width: 50%;
  text-align: left;
  overflow: visible;
}

.option a img {
  width: 20px;
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
</style>