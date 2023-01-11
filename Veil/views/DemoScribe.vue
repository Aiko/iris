<script lang="ts" setup>
import Icon from "@Veil/components/Base/Icon.vue"
import HeaderRight from "@Veil/components/Header/HeaderRight.vue";
import Board from "@Veil/components/Home/Board.vue"
import { INBOX } from "@Veil/state/notional";

const isMobile = window.innerWidth < 600
if (isMobile) {
  // @ts-ignore
  document.body.style.zoom = "1.3"
  document.body.style.overflow = 'hidden'
}

</script>

<template>
  <HeaderRight />

  <div class="container mt-5">
    <div class="row">
      <div class="col-md-6">
        <div class="instructions">
          <Icon name="logo" color="blue" class="logo" />
          <h3>Scribe Demo: How it works</h3>
          <p> Your Aiko Mail inbox is packed with AI features designed to save you time. This is a demo of our 'Quick
            Reply'.<br><br> --> Start by clicking <i>'Quick Reply'</i><br><br>

            -->
            <Icon name="scribe" color="blue" /> Type a few lines such as <i>"cant come, can move to tomorrow?"</i> and
            click on the brain button to let the
            assistant do the rest.
            <br><br>
            -->
            <Icon name="microphone" color="blue" /> Click the microphone and use it as an assistant. <i>Example: "tell
              John I
              can't
              come
              tomorrow, can we move to next week"</i>


          </p>
        </div>
      </div>
      <div class="col-md-6">
        <Board isInbox demo :board="INBOX" />
      </div>
    </div>
  </div>


</template>

<style scoped>
.instructions p {
  font-size: 15px;
}

.instructions img {
  width: 20px;

}

.logo {
  width: 100% !important;
  max-width: 150px !important;
  margin-bottom: 10px;
}

i {
  color: var(--strong-font-color) !important;
}

.instructions {
  text-align: left;
  width: 100%;
  margin-bottom: 10px;
  padding: 10px;
  max-width: 500px;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.col-md-6,
.row {
  position: relative;
  height: 100%;
  margin-top: 5px;
}

@media screen and (max-width: 800px) {

  .col-md-6,
  .row {
    height: unset;
  }

  .board,
  .instructions {
    position: relative;
    height: fit-content;
  }
}

.board {
  height: fit-content !important;
  overflow: visible;
  padding-bottom: 30px;
  border-radius: var(--primary-border-radius) !important;
  overflow: hidden;
  margin-right: 0;
  position: absolute;
  left: 50%;
  transform: translate(-50%, 0%);
}

.control-bar {
  margin-top: 20% !important;
}
</style>