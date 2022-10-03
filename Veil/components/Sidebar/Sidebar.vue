<script lang="ts" setup>
import ButtonPrimary from '@Veil/components/Base/ButtonPrimary.vue';
import NavLink from '@Veil/components/Sidebar/NavLink.vue';
import NavLinkHome from '@Veil/components/Sidebar/NavLinkHome.vue';
import { isSidebarCollapsed } from '@Veil/state/sections'
import Icon from '@Veil/components/Base/Icon.vue'

const toggleSidebarCollapse = () => isSidebarCollapsed.value = !(isSidebarCollapsed.value)
</script>

<template>
  <div :class="{
    'sidebar': true,
    'collapsed': isSidebarCollapsed,
  }">
    <div class="top">
      <ButtonPrimary>
        <Icon name="compose" color="white" />Compose
      </ButtonPrimary>
      <NavLinkHome text="Home" active />
      <NavLink>
        <Icon name="sent" color="grey" />Sent
      </NavLink>
      <NavLink>
        <Icon name="drafts" color="grey" />Drafts
      </NavLink>

      <NavLink>
        <Icon name="archive" color="grey" />Archive
      </NavLink>
      <NavLink>
        <Icon name="spam" color="grey" />Spam
      </NavLink>
      <NavLink>
        <Icon name="trash" color="grey" />Trash
      </NavLink>
    </div>
    <div class="bottom">
      <div class="sidebar-collapse" title="Collapse sidebar" @click="toggleSidebarCollapse">
        <Icon name="sidebar-collapse" color="grey" />
      </div>
      <a>
        <Icon name="calendar" color="grey" />
      </a>
      <a>
        <Icon name="settings" color="grey" />
      </a>
      <a>
        <Icon name="documentation" color="grey" class="docu" />
      </a>
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

  padding: 4px;
}

.top a img {
  width: 17px;
  margin-right: 7px;
  margin-top: -3px;
}
</style>