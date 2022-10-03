<script lang="ts" setup>
import ButtonPrimary from '@Veil/components/Base/ButtonPrimary.vue';
import NavLink from '@Veil/components/Sidebar/NavLink.vue';
import NavLinkHome from '@Veil/components/Sidebar/NavLinkHome.vue';
import { sidebarIsCollapsed } from '@Veil/state/sections'

const toggleSidebarCollapse = () => sidebarIsCollapsed.value = !(sidebarIsCollapsed.value)
</script>

<template>
  <div :class="{
    'sidebar': true,
    'collapsed': sidebarIsCollapsed,
  }">
    <div class="top">
      <ButtonPrimary text="Compose" class="compose" />
      <NavLinkHome text="Home" active />
      <NavLink text="Sent" />
      <NavLink text="Drafts" />
      <NavLink text="Archive" />
      <NavLink text="Spam" />
      <NavLink text="Trash" />
    </div>
    <div class="bottom">
      <div class="sidebar-collapse" title="Collapse sidebar" @click="toggleSidebarCollapse">
        <img src="@Veil/assets/icons/Sidebar/sidebar-collapse.svg" class="icon" />
      </div>
      <a><img src="@Veil/assets/icons/Sidebar/calendar.svg" class="icon" alt="Calendar" /></a>
      <a><img src="@Veil/assets/icons/Sidebar/settings.svg" class="icon" alt="Settings" /></a>
      <a><img src="@Veil/assets/icons/Sidebar/documentation.svg" class="icon docu" alt="Documentation" /></a>
    </div>
  </div>
</template>

<style scoped>
.sidebar {
  width: 130px;
  height: 100%;
  background-color: var(--primary-background-color);
  padding: 8px;
  box-shadow: var(--sidebar-shadow);
  z-index: 1;
  border-top-right-radius: var(--primary-border-radius);
  -webkit-touch-callout: none;
  /* iOS Safari */
  -webkit-user-select: none;
  /* Safari */
  -khtml-user-select: none;
  /* Konqueror HTML */
  -moz-user-select: none;
  /* Old versions of Firefox */
  -ms-user-select: none;
  /* Internet Explorer/Edge */
  user-select: none;
}

.sidebar-collapse {
  position: absolute;
  right: 0;
  top: 0;
  margin-top: -10px;
  margin-right: -14px;
  border-top-right-radius: 0 !important;
  border-bottom-right-radius: 0 !important;
  z-index: 1;
  padding: 0 2px;
  height: 19px;
  cursor: default;
  background: var(--secondary-background-color);
  border-radius: 5px;
}

.sidebar-collapse img {
  width: 15px !important;
  margin-top: -8px;
  opacity: .3;
  transition: .2s;
}

.sidebar-collapse img:hover {
  opacity: 1;
  transition: .2s;
}

.compose {
  margin-top: 0;
}

.sidebar .top {
  display: grid;
}

.sidebar.collapsed {
  width: 46px;
}

.sidebar.collapsed .sidebar-collapse {
  margin-right: -8px;
}

.sidebar.collapsed .top a {
  width: 30px;
  overflow: hidden;
}



.sidebar.collapsed .bottom {
  display: inline-grid;
}

.sidebar.collapsed .bottom a {
  margin-bottom: 10px;
  margin-left: 8px;
  padding: 1px 5px 7px 6px;
}

.bottom {
  margin-bottom: 20px;
  position: absolute;
  border-top: 1px solid var(--secondary-background-color);
  padding-top: 20px;
  bottom: 0;
  left: 0;
  background: var(--primary-background-color);
}

.bottom a {
  background: var(--secondary-background-color);
  padding: 4px 5px 7px 5px;
  width: 30px;
  height: 30px;
  border-radius: var(--primary-border-radius);
  margin-left: 11px;
}

.bottom img {
  width: 18px;
}

.docu {

  padding: 5px;
}
</style>