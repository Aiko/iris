<script lang="ts" setup>
import Animation from "@Veil/components/Base/Animation.vue";
import Icon from "@Veil/components/Base/Icon.vue";
</script>

<template>
  <!-- TODO: Add 'recording to the class below'-->
  <div class="overlay active">
    <div class="typing" v-if="false">
      <p class="css-typing">Hi [Name]</p>

      <p class="css-typing _1">We are currently writing your email</p>

      <p class="css-typing _2">A second sentence is being typed here, wait a second,
        how are you able to see this?</p>

      <p class="css-typing _3">Wait a second,
        how are you able to see this?</p>

    </div>



    <Icon name="x" color="white" class="x" />


    <div class="center-info" v-if="true">
      <Animation name="record" loop class="record" />
      Start speaking<br><br><span class="example">For example: "Tell Tom I can't come to the meeting tomorrow, can
        we
        reschedule for next week?"</span>
    </div>

    <div class="center-info" v-if="false">
      <Animation name="writing" loop class="record" />
      Writing email<br><br><span class="example">For example: "Tell Tom I can't come to the meeting tomorrow, can
        we
        reschedule for next week?"</span>
    </div>

  </div>
  <div class="toast-shadow"></div>
</template>

<style scoped>
.active.overlay {
  margin-top: 39px;
  margin-left: 8px;
  margin-right: 8px;
  border-top-left-radius: var(--primary-border-radius);
  width: calc(100% - 8px);
  height: calc(100% - 39px);
  opacity: 1;
  transition: .2s;
}

.overlay {
  background: var(--primary-color);
  position: absolute;
  top: 0;
  left: 0;
  width: 0%;
  height: 0%;
  z-index: 100;
  opacity: 0;
  transition: .2s;
}

.css-typing {
  position: relative;
  white-space: nowrap;
  font-size: 18px;
  width: 100%;
  max-width: 600px;
  overflow: hidden;
  padding: 0 10px;
  text-overflow: ellipsis;
  color: transparent;
  text-shadow: 0 0 10px rgb(255 255 255);
}

.css-typing._1 {
  width: 70em;
  -webkit-animation: type 0s steps(50, end);
  animation: type 0s steps(50, end);
}

.css-typing._2 {
  width: 70em;
  -webkit-animation: type 20s steps(50, end);
  animation: type 20s steps(50, end);
}

.css-typing._3 {
  width: 70em;
  -webkit-animation: type 20s steps(20, end);
  animation: type 20s steps(20, end);
}

/* code for animated blinking cursor */
.typed-cursor {
  position: absolute;
  right: -2px;
  opacity: 1;
  font-weight: 900;
  -webkit-animation: blink 0.7s infinite;
  -moz-animation: blink 0.7s infinite;
  -ms-animation: blink 0.7s infinite;
  -o-animation: blink 0.7s infinite;
  animation: blink 0.7s infinite;
}

@keyframes type {
  from {
    width: 0;
  }
}

@-webkit-keyframes type {
  from {
    width: 0;
  }
}


@-keyframes blink {
  0% {
    opacity: 1;
  }

  50% {
    opacity: 0;
  }

  100% {
    opacity: 1;
  }
}

@-webkit-keyframes blink {
  0% {
    opacity: 1;
  }

  50% {
    opacity: 0;
  }

  100% {
    opacity: 1;
  }
}

@-moz-keyframes blink {
  0% {
    opacity: 1;
  }

  50% {
    opacity: 0;
  }

  100% {
    opacity: 1;
  }
}

@-ms-keyframes blink {
  0% {
    opacity: 1;
  }

  50% {
    opacity: 0;
  }

  100% {
    opacity: 1;
  }
}

@-o-keyframes blink {
  0% {
    opacity: 1;
  }

  50% {
    opacity: 0;
  }

  100% {
    opacity: 1;
  }
}

.typing {
  width: 100%;
  max-width: 500px;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.center-info {
  width: 100%;
  max-width: 500px;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #fff;
  text-align: center;
  font-weight: 500;
  font-size: 18px;
}

.record {
  width: 100px;
  text-align: center;
  margin: auto;
}

.example {
  font-weight: 400;
  font-size: 16px;
  font-style: italic;
}

.x {
  cursor: pointer;
  margin: 5px;
}
</style>