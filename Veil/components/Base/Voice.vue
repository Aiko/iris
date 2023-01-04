<script lang="ts" setup>
import Animation from "@Veil/components/Base/Animation.vue";
import Icon from "@Veil/components/Base/Icon.vue";
</script>

<template>
  <!-- TODO: Add/remove 'active' to the class below to show modal-->
  <div class="voice active">


    <!-- Exit out button-->
    <Icon name="x" color="white" class="x" />


    <!-- Experimental for now-->
    <div class="center-info" v-if="true">

    </div>



    <!-- Show while listening/recording-->
    <div class="center-info" v-if="false">
      <Animation name="record" loop class="record" />
      Start speaking<br><br><span class="example">For example: "Tell Tom I can't come to the meeting tomorrow, can we
        reschedule for next week?"</span>
    </div>


    <!-- Show while generating email-->
    <div class="center-info" v-if="true">
      <Animation name="writing" loop class="record" />
      Writing email, please wait
      <br>
      <br>
      <div class="typing" v-if="true">
        <p class="css-typing">Hi [Name]</p>
        <p class="css-typing _1">We are currently writing your email</p>
        <p class="css-typing _2">A second sentence is being typed here, wait a second,
          how are you able to see this?</p>
        <p class="css-typing _3">Wait a second,
          how are you able to see this?</p>
      </div>
    </div>


    <!-- Overlay -->
    <div class="overlay"></div>


  </div>
</template>

<style scoped>
.voice {
  position: absolute;
  margin-left: 8px;
  margin-top: 39px;
  width: 0;
  height: 0;
  top: 0;
  left: 0;
  transition: .2s;
}

.voice.active {
  width: calc(100% - 8px);
  height: calc(100% - 39px);
  z-index: 100;
  transition: .2s;
}

.overlay {
  border-top-left-radius: var(--primary-border-radius);
  background: var(--primary-color);
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 99;
  display: unset !important;
  transition: .2s;
}

.active.voice * {
  display: unset;
  transition: .2s;
}

.voice * {
  display: none;
  transition: .2s;
}

.css-typing {
  position: relative;
  white-space: nowrap;
  font-size: 18px;
  width: 100%;
  max-width: 450px;
  overflow: hidden;
  padding: 0 10px;
  text-overflow: ellipsis;
  color: transparent;
  text-shadow: 0 0 10px #486fff;
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
  display: grid !important;
  z-index: 100;
  text-align: left !important;
  background: #fff;
  border-radius: 10px;
  padding: 30px 15px;
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
  z-index: 100;
}

.record {
  width: 100px;
  text-align: center;
  margin: auto;
  display: block !important;
}

.example {
  font-weight: 400;
  font-size: 16px;
  font-style: italic;
}

.x {
  cursor: pointer;
  margin: 5px;
  z-index: 100;
  position: absolute;
  top: 0;
  left: 0;
}
</style>