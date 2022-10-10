<script lang="ts" setup>
import ButtonPrimary from '@Veil/components/Base/ButtonPrimary.vue';
import NavLink from '@Veil/components/Sidebar/NavLink.vue';
import NavLinkHome from '@Veil/components/Sidebar/NavLinkHome.vue';
import { isSidebarCollapsed } from '@Veil/state/sections'
import Icon from '@Veil/components/Base/Icon.vue'
import { infoContent } from '@Veil/state/sections'


// Information variables for 'Sidebar' component
// TODO: detect if mac or pc and change CMD to CTRL
const infoCollapse = 'Toggle sidebar collapse (CMD + S)'
const infoDocumentation = 'Open documentation'
const infoSettings = 'Open settings'
const infoCalendar = 'Open calendar'

const toggleSidebarCollapse = () => isSidebarCollapsed.value = !(isSidebarCollapsed.value)
</script>

<template>
  <div :class="{
    'sidebar': true,
    'collapsed': isSidebarCollapsed,
  }">
    <div class="top">
      <ButtonPrimary href="/composer" target="_blank">
        <Icon name="compose" color="white" class="special" />Compose
      </ButtonPrimary>
      <NavLinkHome text="Home" active />
      <NavLink>
        <Icon name="sent" color="normal" />Sent
      </NavLink>
      <NavLink>
        <Icon name="drafts" color="normal" />Drafts
      </NavLink>
      <NavLink>
        <Icon name="archive" color="normal" />Archive
      </NavLink>
      <NavLink>
        <Icon name="spam" color="normal" />Spam
      </NavLink>
      <NavLink>
        <Icon name="trash" color="normal" />Trash
      </NavLink>
    </div>
    <div class="alert">
      <h1>
        <i v-if="!isSidebarCollapsed">Version: </i><b>BETA</b>
      </h1>
      <div>#darwin-3.8.1:INTERNAL</div>
      <p><span v-if="!isSidebarCollapsed">Request features and </span>report issues</p>
      <ButtonPrimary>
        <span v-if="!isSidebarCollapsed">Give feedback</span>
        <Icon name="bug" color="white" v-if="isSidebarCollapsed" />
      </ButtonPrimary>
    </div>
    <div class="bottom">
      <div class="sidebar-collapse" @click="toggleSidebarCollapse" @mouseover="infoContent = infoCollapse"
        @mouseleave="infoContent = ''">
        <Icon name="sidebar-collapse" color="normal" />
      </div>
      <a @mouseover="infoContent = infoCalendar" @mouseleave="infoContent = ''">
        <Icon name="calendar" color="normal" />
      </a>
      <a @mouseover="infoContent = infoSettings" @mouseleave="infoContent = ''">
        <Icon name="settings" color="normal" />
      </a>
      <a @mouseover="infoContent = infoDocumentation" @mouseleave="infoContent = ''">
        <Icon name="documentation" color="normal" class="docu" />
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
  position: relative;
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
  cursor: pointer !important;
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

.sidebar.collapsed .special {
  margin-right: 10px !important;
  margin-left: -2px !important;
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
}

.bottom a {
  background: var(--primary-background-color);
  padding: 4px 5px 7px 5px;
  width: 30px;
  height: 30px;
  border-radius: var(--primary-border-radius);
  margin-left: 12px;
  transition: .2s;
}

.bottom a:hover {
  background: var(--primary-background-color-hover);
  transition: .2s;
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

.alert {
  margin-bottom: 100px;
  width: calc(100% - 16px);
  margin-left: 8px;
  margin-right: 8px;
  position: absolute;
  padding: 7px;
  bottom: 0;
  left: 0;
  background: var(--secondary-background-color);
}

.sidebar.collapsed .alert {
  margin: 0;
  width: 100%;
  border-radius: 0;
  margin-bottom: 200px;
  padding-left: 5px;
  padding-right: 0;
}

.alert h1 {
  font-size: 13px;
  margin: 0;
}

.alert p {
  font-size: 12px;
  margin-bottom: 8px;
  z-index: 1;
  position: relative;
  letter-spacing: -0.1px;
}

.alert a {
  padding: 4px 10px 5px 9px;
  font-size: 13px !important;
  letter-spacing: 0 !important;
  margin-left: -3px;
}

.alert b {
  color: var(--primary-color);
  font-weight: 700;
}

.alert div {
  position: relative;
  color: var(--primary-color);
  background-color: var(--secondary-background-color);
  font-size: 13px;
  margin-top: 0;
  width: 100%;
  left: 0;
  height: 0;
  padding: 2px;
  border-radius: 5px;
  opacity: 0;
  transition: .2s;
  z-index: 1;
}

.alert h1:hover~div {
  margin-top: -20px;
  opacity: 1;
  height: unset;
  transition: .2s;
  position: relative;
}

.alert div:hover {
  margin-top: -20px;
  opacity: 1;
  height: unset;
  transition: .2s;
  position: relative;
}

.sidebar.collapsed .alert h1 {
  margin: 0;
}

.sidebar.collapsed .alert h1:hover~div {
  display: none;
}

.sidebar.collapsed .alert div:hover {
  display: none;
}
</style>