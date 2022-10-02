<script lang="ts" setup>
import Header from '@Veil/components/Header/Header.vue';
import Home from '@Veil/views/Home.vue';
</script>

<template>
  <div class="main">
    <Header />
    <Home regular />
  </div>
</template>

<style scoped>
.main {
  width: calc(100% - 130px);
  height: 100%;
  overflow: hidden;
}
</style>