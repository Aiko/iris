<script lang="ts" setup>
import Loader from "@Veil/components/Base/Loader.vue";
import ButtonSecondary from "./ButtonSecondary.vue";
import { RosettaStone, i18n } from "@Veil/utils/rosetta/rosetta";
</script>

<template>
  <div class="loader-screen">
    <div class="middle animate2 one">
      <img src="@Veil/assets/img/logo.svg" alt="logo" />
      <Loader />

      <p class="animate two">{{ i18n(RosettaStone.loader.text1) }}</p>
      <p class="animate three">{{ i18n(RosettaStone.loader.text2) }}</p>
      <p class="animate four">{{ i18n(RosettaStone.loader.text3) }}</p>
      <p class="animate five">{{ i18n(RosettaStone.loader.text4) }}</p>
      <p class="animate six">{{ i18n(RosettaStone.loader.text5) }}</p>

    </div>
    <div class="animate2 three bottom">
      <p>{{ i18n(RosettaStone.loader.info) }}</p>
      <ButtonSecondary :text="i18n(RosettaStone.loader.btn)" href="https://aikomail.com/intro" enabled />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.loader-screen {
  position: absolute;
  z-index: 1000;
  background: var(--primary-background-color);
  width: 100%;
  height: calc(100% - 28px);
  overflow: hidden;
}

.bottom {
  position: absolute;
  bottom: 0;
  margin: auto;
  text-align: center;
  width: 100%;
  margin-bottom: 50px;
}

.loader-screen img {
  width: 200px;
  margin: auto;
}

.loader-screen .loader {
  margin: auto;
  margin-top: 30px;
}

.loader-screen .middle {
  display: grid;
  text-align: center;
  width: 100%;
}



a {
  opacity: 0;
}

p {
  font-weight: 500;
}


/* Keyframes for the fade-in */
@-webkit-keyframes inout {
  0% {
    opacity: 0;
    display: none;
  }

  20% {
    opacity: 1;
  }

  80% {
    opacity: 1;
  }

  100% {
    opacity: 0;
    display: none;
  }
}

@-moz-keyframes inout {
  0% {
    opacity: 0;
    display: none;
  }

  20% {
    opacity: 1;
  }

  80% {
    opacity: 1;
  }

  100% {
    opacity: 0;
    display: none;
  }
}

@keyframes inout {
  0% {
    opacity: 0;
    display: none;
  }

  20% {
    opacity: 1;
  }

  80% {
    opacity: 1;
  }

  100% {
    opacity: 0;
    display: none;
  }
}





/* Keyframes for the fade-in */
@-webkit-keyframes inin {
  0% {
    opacity: 0;
  }

  100% {
    opacity: 1;
  }
}

@-moz-keyframes inin {
  0% {
    opacity: 0;
  }

  100% {
    opacity: 1;
  }
}

@keyframes inin {
  0% {
    opacity: 0;
  }

  100% {
    opacity: 1;
  }
}



.animate {
  opacity: 0;
  position: absolute;
  width: 100%;
  margin-top: 100px;
  white-space: nowrap;
  -webkit-animation: inout ease-in 1;
  -moz-animation: inout ease-in 1;
  animation: inout ease-in 1;

  -webkit-animation-fill-mode: forwards;
  -moz-animation-fill-mode: forwards;
  animation-fill-mode: forwards;

  -webkit-animation-duration: 6s;
  -moz-animation-duration: 6s;
  animation-duration: 6s;
}

.animate2 {
  opacity: 0;
  -webkit-animation: inin ease-in 1;
  -moz-animation: inin ease-in 1;
  animation: inin ease-in 1;

  -webkit-animation-fill-mode: forwards;
  -moz-animation-fill-mode: forwards;
  animation-fill-mode: forwards;

  -webkit-animation-duration: 1s;
  -moz-animation-duration: 1s;
  animation-duration: 1s;
}

.one {
  -webkit-animation-delay: 0.1s;
  -moz-animation-delay: 0.1s;
  animation-delay: 0.1s;
}

.two {
  -webkit-animation-delay: 2s;
  -moz-animation-delay: 2s;
  animation-delay: 2s;
}

.three {
  -webkit-animation-delay: 10s;
  -moz-animation-delay: 10s;
  animation-delay: 10s;
}

.four {
  -webkit-animation-delay: 17s;
  -moz-animation-delay: 17s;
  animation-delay: 17s;
}

.five {
  -webkit-animation-delay: 24s;
  -moz-animation-delay: 24s;
  animation-delay: 24s;
}

.six {
  -webkit-animation-delay: 31s;
  -moz-animation-delay: 31s;
  animation-delay: 31s;
}

.seven {
  -webkit-animation-delay: 38s;
  -moz-animation-delay: 38s;
  animation-delay: 38s;
}

.eight {
  -webkit-animation-delay: 2.1s;
  -moz-animation-delay: 2.1s;
  animation-delay: 2.1s;
}

.nine {
  -webkit-animation-delay: 2.4s;
  -moz-animation-delay: 2.4s;
  animation-delay: 2.4s;
}

.ten {
  -webkit-animation-delay: 2.7s;
  -moz-animation-delay: 2.7s;
  animation-delay: 2.7s;
}

.eleven {
  -webkit-animation-delay: 3s;
  -moz-animation-delay: 3s;
  animation-delay: 3s;
}

.twelve {
  -webkit-animation-delay: 3.3s;
  -moz-animation-delay: 3.3s;
  animation-delay: 3.3s;
}
</style>