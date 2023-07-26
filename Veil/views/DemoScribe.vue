<script lang="ts" setup>
import Icon from "@Veil/components/Base/Icon.vue"
import HeaderRight from "@Veil/components/Header/HeaderRight.vue";
import Board from "@Veil/components/Home/Board.vue"
import { INBOX } from "@Veil/state/notional";

const isMobile = window.innerWidth < 600
// @ts-ignore
document.body.style.zoom = "1.3"
if (isMobile) {
  document.body.style.overflow = 'hidden'
}

</script>

<template>
  <a href="https://aikomail.com">
    <Icon name="logo" color="blue" class="logo" />
  </a>
  <HeaderRight />
  <div class="container mt-5">
    <div class="row row1">
      <div class="col-lg-6">
        <div class="instructions">
          <h2>Feature Demo: Scribe (Quick Reply)</h2>
          <p>Your Aiko Mail inbox is packed with AI features designed to save you time. This is a demo of our 'Quick
            Reply'.</p><br>
          <p class="ml-3" v-if="!isMobile">
            <Icon name="arrow-big-right" color="blue" class="arrow" /> Start by clicking <i>'Quick Reply'</i><br><br>

            <Icon name="arrow-big-right" color="blue" class="arrow" />
            Type a few lines such as <i>"cant come, can move to tomorrow?"</i> and
            click on the
            <Icon name="scribe" color="blue" /> button to let the
            assistant do the rest.
            <br><br>

            Don't feel like typing? You can also click the
            <Icon name="microphone" color="blue" /> button and use it as an assistant. For example: <i>"tell
              John I
              can't
              come
              tomorrow, can we move to next week"</i>
          </p>
        </div>
      </div>
      <div class="col-lg-6">
        <Board isInbox demo :board="INBOX" />
      </div>
    </div>
    <div class="row copy">
      <p>© 2023 Aiko Mail Inc. All Rights Reserved. <i>Restricted use only -- DO NOT SHARE.</i></p>
    </div>
  </div>


</template>

<style lang="scss" scoped>
h2 {
  font-size: 22px;
}

.acont {
  display: none;
}

.instructions p {
  font-size: 15px;
}

.instructions img {
  width: 20px;

}

.copy {
  text-align: center;
}

.copy p {
  margin: auto;
}

.arrow {
  margin-right: 5px;
}

.logo {
  position: absolute;
  top: 0;
  left: 0;
  margin: 30px;
  max-width: 100px !important;
}

i {
  color: var(--strong-font-color) !important;
}

.instructions {
  text-align: left;
  width: 100%;
  margin-bottom: 10px;
  padding: 20px;
  max-width: 500px;
  position: absolute;
  top: 50%;
  left: 50%;
  margin-top: -30px;
  transform: translate(-50%, -50%);
}

.col-md-6,
.row1 {
  position: relative;
  height: calc(100% - 40px);
  margin-top: 5px;
}

@media screen and (max-width: 1000px) {

  .col-md-6,
  .row {
    height: unset;
  }


  .board,
  .instructions {
    position: relative !important;
    top: unset !important;
    left: unset !important;
    margin: auto;
    margin-bottom: 30px;
    margin-top: 20px;
    transform: unset !important;
    margin-right: auto !important;
  }

  .mt-5 {
    margin-top: 0 !important;
  }
}

.board {
  height: fit-content !important;
  overflow: visible;
  border-radius: var(--primary-border-radius) !important;
  overflow: hidden;
  margin-right: 0;
  position: absolute;
  margin-top: -30px;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}

.control-bar {
  margin-top: 20% !important;
}
</style>