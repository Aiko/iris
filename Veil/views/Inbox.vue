<script lang="ts" setup>
import Sidebar from "@Veil/components/Sidebar/Sidebar.vue";
import Main from "@Veil/components/Base/Main.vue";
import Logger from "@Veil/services/roots";

const Log = new Logger("Inbox")

Log.success("Mounted application.");
</script>

<template>
  <Sidebar />
  <Main />
</template>

<style lang="scss" scoped>
.main {
  width: calc(100% - 170px);
  height: calc(100% - 10px);
  overflow: hidden;
  margin-top: 10px;
}

.main.collapsed-sidebar {
  width: calc(100% - 46px);
}
</style>
