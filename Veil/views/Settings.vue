<script lang="ts" setup>
import { isRegularView, selectedModal, Modal } from '@Veil/state/sections'
import NavLink from '../components/Sidebar/NavLink.vue'
</script>

<template>
  <div class="settings" v-if="true">
    <div class="sidebar">
      <h1>Settings</h1>
      <NavLink>Account</NavLink>
      <NavLink>Appearance</NavLink>
      <NavLink>Team</NavLink>
      <NavLink>Spaces</NavLink>
      <NavLink>Unsubscribe</NavLink>
      <NavLink>Templates</NavLink>
      <NavLink>Billing</NavLink>
      <NavLink>Integrations</NavLink>
      <NavLink>Others</NavLink>


    </div>
    <div class="content">

    </div>
  </div>
</template>

<style scoped>
.settings {
  width: 100%;
  overflow-y: scroll;
  height: 100%;
  display: inline-flex;
  background-color: var(--secondary-background-color);
  border: 3px solid var(--primary-background-color);
}

.sidebar {
  width: 130px;
  height: 100%;
  background-color: var(--primary-background-color);
  padding: 8px;
  position: relative;
  box-shadow: var(--sidebar-shadow);
  z-index: 1;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

.sidebar a {
  display: block;
}

.sidebar h1 {
  font-size: 18px;
  margin-bottom: 30px;
}
</style>