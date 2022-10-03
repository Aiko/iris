<script lang="ts" setup>
import Header from '@Veil/components/Header/Header.vue';
import Home from '@Veil/views/Home.vue';
import { sidebarIsCollapsed } from '@Veil/state/sections'

</script>

<template>
  <div :class="{
    'main': true,
    'collapsed-sidebar': sidebarIsCollapsed,
  }">

    <!--Header now has Search and toasts-->
    <Header />

    <!--Current page, default is Home-->
    <Home />
  </div>
</template>

<style scoped>
.main {
  width: calc(100% - 130px);
  height: 100%;
  overflow: hidden;
}

.main.collapsed-sidebar {
  width: calc(100% - 46px);
}
</style>