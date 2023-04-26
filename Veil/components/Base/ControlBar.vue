<script lang="ts" setup>
import { Sidebar } from "@Veil/state/sections";
</script>

<template>
  <div class="control-bar">
    <div :class="{
      'bg-right': true,
      'collapsed-sidebar': Sidebar.collapsed,
    }"></div>
    <div :class="{
        'bg-left': true,
        'collapsed-sidebar': Sidebar.collapsed,
      }"></div>
  </div>
</template>

<style scoped>
.control-bar {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  background-color: transparent;
  z-index: 1000;
  margin-bottom: 10px;
  display: inline-flex;
  height: 28px;
  cursor: default !important;
  user-select: none;
  -webkit-app-region: drag;
}

.bg-right {
  background-color: var(--main-bg);
  height: 100%;
  position: absolute;
  right: 0;
  width: calc(100% - 170px);
}

.collapsed-sidebar.bg-right {
  width: 100%;
}

.bg-left {
  background-color: var(--sidebar-bg);
  height: 100%;
  position: absolute;
  left: 0;
  width: 170px;
}

.collapsed-sidebar.bg-left {
  width: 0;
}
</style>