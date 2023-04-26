<script lang="ts" setup>
import Header from "@Veil/components/Header/Header.vue";
import Home from "@Veil/components/Home/Home.vue";
import { Sidebar } from "@Veil/state/sections";
</script>

<template>
  <div :class="{
    'main': true,
    'collapsed-sidebar': Sidebar.collapsed,
  }">
    <Header />
    <Home />
  </div>
</template>

<style scoped>
.main {
  width: calc(100% - 170px);
  height: 100%;
  background-color: var(--main-bg);
  overflow: hidden;
}

.main.collapsed-sidebar {
  width: calc(100% - 46px);
}
</style>
