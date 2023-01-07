<script lang="ts" setup>
import Icon from "@Veil/components/Base/Icon.vue"
import HeaderRight from "@Veil/components/Header/HeaderRight.vue";
import Board from "@Veil/components/Home/Board.vue"
</script>

<template>
  <HeaderRight />
  <div class="home" v-if="true">
    <div class="boards">

      <!--Boards are normal unless they have 'isInbox' attribute-->
      <Board isInbox demo />
      <div class="instructions">
        <h2>How it works</h2>
        <p> Your Aiko Mail inbox is packed with AI features designed to save you time. This is a demo of our 'Quick
          Reply'.<br> --> Start by clicking <i>'Quick Reply'</i><br>
          ---->
          <Icon name="microphone" color="blue" /> Click this and use it as an assistant. <i>Example: "tell John I
            can't
            come
            tomorrow, can we move to next week"</i>
          <br>
          ---->
          <Icon name="scribe" color="blue" /> Type a few lines such as <i>"cant come, can move to tomorrow?"</i> and
          click it to let the
          assistant do the rest.
        </p>

      </div>


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

.instructions p {
  font-size: 15px;
}

img {
  width: 20px;

}

i {
  color: var(--strong-font-color) !important;
}

.instructions {
  bottom: 0;
  position: absolute;
  text-align: left;
  width: 100%;
  margin-bottom: 10px;
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