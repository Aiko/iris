<script lang="ts" setup>
import Header from "@Veil/components/Header/Header.vue";
import Home from "@Veil/components/Home/Home.vue";
import { Sidebar } from "@Veil/state/common";
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

<style lang="scss" scoped>
.main {
  width: calc(100% - 170px);
  height: calc(100% - 10px);
  background-color: var(--main-bg);
  overflow: hidden;
  margin-top: 10px;
}

.main.collapsed-sidebar {
  width: calc(100% - 46px);
}
</style>
@Veil/state/common