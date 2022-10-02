<script lang="ts" setup>
import Loader from "@Veil/components/Base/Loader.vue";
</script>

<template>
  <div class="loader-screen">
    <div class="middle">
      <img src="@Veil/assets/img/logo.svg" alt="logo" />
      <Loader />
    </div>
  </div>
</template>

<style scoped>
.loader-screen {
  position: absolute;
  z-index: 1000;
  background: var(--primary-background-color);
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.loader-screen img {
  width: 200px;
}

.loader-screen .loader {
  margin: auto;
}

.loader-screen .middle {
  display: grid;
}
</style>