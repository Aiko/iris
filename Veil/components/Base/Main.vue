<script lang="ts" setup>
import Header from "@Veil/components/Header/Header.vue";
import Record from "@Veil/components/Base/Record.vue";
import Home from "@Veil/views/Home.vue";
import { Sidebar } from "@Veil/state/sections";
import Logger from "@Veil/services/roots";

const Log = new Logger("Main", {
  bgColor: "#ff99ff",
  fgColor: "#000000",
});

Log.success("Mounted application.");
</script>

<template>
  <div :class="{
    'main': true,
    'collapsed-sidebar': Sidebar.collapsed,
  }">
    <Header />
    <Home />

    <Record />
  </div>
</template>

<style scoped>
.main {
  width: calc(100% - 160px);
  height: 100%;
  overflow: hidden;
}

.main.collapsed-sidebar {
  width: calc(100% - 46px);
}
</style>
