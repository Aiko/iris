<script lang="ts" setup>
import ButtonSecondary from '@Veil/components/Base/ButtonSecondary.vue';
import EmailCard from "@Veil/components/Home/EmailCard.vue"


defineProps({
  inbox: {
    type: Boolean,
    required: false
  }
})
</script>

<template>
  <div class="board">
    <div class="board-header">


      <a v-if="inbox"><img src="@Veil/assets/icons/Home/dots.svg" class="icon" width="28" /></a>
      <a v-if="inbox"><img src="@Veil/assets/icons/Home/sort.svg" class="icon" width="24" /></a>
      <a v-if="inbox"><img src="@Veil/assets/icons/Home/refresh.svg" class="icon" width="24" /></a>


      <h1 v-if="!inbox">Title</h1>
      <div class="options" v-if="!inbox">
        <div class="size">
          <p>Board size</p>
          <ButtonSecondary text="S" enabled class="btn" />
          <ButtonSecondary text="M" enabled class="btn" />
          <ButtonSecondary text="L" enabled class="btn" />
        </div>
        <div class="option">
          <p>Move all emails to trash</p>
          <ButtonSecondary text="Trash all" enabled class="btn" />
        </div>
      </div>


      <div class="switch" v-if="inbox">
        <div class="tab active">
          Priority
          <div class="count">
            99+
          </div>
        </div>
        <div class="tab">
          Others
          <div class="count">
            4
          </div>
        </div>
      </div>


    </div>
    <div class="board-body">
      <EmailCard />
    </div>
  </div>
</template>

<style scoped>
.board {
  width: 300px;
  height: 100%;
  background: var(--primary-background-color);
  border-radius: var(--primary-border-radius) var(--primary-border-radius) 0 0;
  height: 100%;
  margin-right: 15px;
  position: relative;
  contain: size layout;
  box-shadow: var(--board-shadow);
  border: none !important;
  transition: .2s;
}

.board-header {
  height: 50px;
  width: 100%;
  padding: 10px 0;
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

.board-header h1 {
  text-align: center;
  font-size: 17px;
  display: inline;
  text-transform: capitalize;
  white-space: nowrap;
  overflow: hidden;
  padding: 0 10px 0 10px;
  text-overflow: ellipsis;
  max-width: calc(100% - 45px);
  z-index: 2;
  position: relative;
}

.board-header h1:hover~.options {
  display: unset !important;
}

.options:hover {
  display: unset !important;
}

.options {
  display: none;
  background: var(--secondary-background-color);
}

.size p,
.option p {
  margin: 0;
  font-size: 13px;
  margin-bottom: 2px;
  margin-top: 10px;
}

.board-header img {
  padding: 3px;
  margin-right: 5px;
}

.board-body {
  height: 100%;
  overflow-y: scroll;
  padding: 0 15px;
}

.board .switch {
  display: inline-flex;
  height: 35px;
  color: var(--primary-font-color);
  border-radius: var(--primary-border-radius);
  overflow: hidden;
  border: 2px solid var(--secondary-background-color);
  margin-left: 5px;
}

.board .tab {
  display: inline-flex;
  padding: 3px 5px 3px 7px;
  opacity: .5;
  transition: .2s;
}

.board .switch .active {
  background-color: var(--secondary-background-color);
  opacity: 1;
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
</style>