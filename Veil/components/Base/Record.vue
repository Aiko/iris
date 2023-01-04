<script lang="ts" setup>
</script>

<template>
  <!-- TODO: Add 'recording to the class below'-->
  <div class="overlay">
  </div>
  <div class="toast-shadow"></div>
</template>

<style scoped>
.recording.overlay {
  opacity: .6;
  width: 100%;
  transition: .2s;
}

.overlay {
  background: var(--primary-color);
  position: absolute;
  top: 0;
  left: 0;
  width: 0%;
  height: 100%;
  z-index: 100;
  opacity: 0;
  transition: .2s;
}

.toast-shadow {
  -webkit-box-shadow: 0px 0px 0px 24px var(--secondary-background-color);
  box-shadow: 0px 0px 0px 24px var(--secondary-background-color);
  z-index: 100;
  position: absolute;
  top: 0;
  right: 0;
  width: 300px;
  height: 230px;
  margin-top: -140px;
  background: var(--secondary-background-color);
  border-radius: 50%;
  border-bottom-right-radius: 0;
}
</style>