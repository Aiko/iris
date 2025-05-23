<script lang="ts" setup>
import { Sidebar, infoContent, selectedModal, Modal } from "@Veil/state/sections";
import ButtonPrimary from "@Veil/components/Base/ButtonPrimary.vue";
import NavLink from "@Veil/components/Sidebar/NavLink.vue";
import Icon from "@Veil/components/Base/Icon.vue";
import Alert from "@Veil/components/Sidebar/Alert.vue";
import { RosettaStone, i18n } from "@Veil/utils/rosetta/rosetta";

// Information variables for 'Sidebar' component
const infoCollapse = i18n(RosettaStone.sidebar.toggle_collapse);
const infoDocumentation = "Open documentation";
const infoSettings = "Open settings";
const infoCalendar = "Open calendar";

const toggleSidebarCollapse = () => (Sidebar.collapsed = !Sidebar.collapsed);
</script>

<template>
  <div :class="{
    sidebar: true,
    collapsed: Sidebar.collapsed,
  }">
    <div class="top">
      <ButtonPrimary href="/composer" target="_blank">
        <Icon name="compose" color="white" class="special" />Compose
      </ButtonPrimary>

      <NavLink active>
        <Icon name="home" color="blue" />
        <span class="name">Home</span>
        <span class="count">99</span>
      </NavLink>

      <NavLink>
        <Icon name="home" color="blue" />
        <span class="name">Times Square</span>
        <span class="count">3</span>
      </NavLink>

      <NavLink>
        <Icon name="home" color="blue" />
        <span class="name">Aiko Email</span>
        <span class="count">9</span>
      </NavLink>

      <NavLink>
        <Icon name="home" color="blue" />
        <span class="name">Gmail</span>
        <span class="count">0</span>
      </NavLink>

      <div class="space-actions">
        <span v-if="!Sidebar.collapsed">
          <Icon name="home" color="normal" class="spaces-icon" /> Edit Spaces
        </span>
      </div>

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
    <Alert>
      <!-- TODO: channel & version from Chiton -->
      <h1><b>BETA</b></h1>
      <div>#darwin-3.8.1:INTERNAL</div>
      <p><span v-if="!Sidebar.collapsed">Request features and </span>report issues</p>
      <ButtonPrimary @click="selectedModal = Modal.Feedback">
        <span v-if="!Sidebar.collapsed">Give feedback</span>
        <Icon name="bug" color="white" v-if="Sidebar.collapsed" />
      </ButtonPrimary>
    </Alert>
    <div class="bottom">
      <div class="sidebar-collapse" @click="toggleSidebarCollapse" @mouseover="infoContent = infoCollapse"
        @mouseleave="infoContent = ''">
        <Icon name="sidebar-collapse" color="normal" />
      </div>
      <a @mouseover="infoContent = infoCalendar" @mouseleave="infoContent = ''">
        <Icon name="calendar" color="normal" />
      </a>
      <a @click="selectedModal = Modal.Settings" @mouseover="infoContent = infoSettings" @mouseleave="infoContent = ''">
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
  width: 160px;
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
  border-top-right-radius: 0 !important;
  border-bottom-right-radius: 0 !important;
  z-index: 1;
  padding: 0 2px;
  height: 19px;
  background: var(--secondary-background-color);
  border-radius: 5px;
}

.sidebar-collapse img {
  width: 15px !important;
  margin-top: -8px;
  opacity: 0.3;
  transition: 0.2s;
}

.sidebar-collapse img:hover {
  opacity: 1;
  transition: 0.2s;
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

.sidebar.collapsed .special {
  margin-right: 10px !important;
  margin-left: -2px !important;
}

.special {
  margin-top: -3px;
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
  width: 100%;
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
  margin-left: 19px;
  transition: 0.2s;
}

.bottom a:hover {
  background: var(--primary-background-color-hover);
  transition: 0.2s;
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
  z-index: 3;
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
  width: 100%;
  text-align: center;
  height: 28px;
  font-size: 13px !important;
  display: inline-grid;
  letter-spacing: 0 !important;
  margin-bottom: 0;
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
  transition: 0.2s;
  z-index: 1;
}

.alert h1:hover~div {
  margin-top: -20px;
  opacity: 1;
  height: unset;
  transition: 0.2s;
  position: relative;
}

.alert div:hover {
  margin-top: -20px;
  opacity: 1;
  height: unset;
  transition: 0.2s;
  position: relative;
}

.sidebar.collapsed .alert h1 {
  margin: 0;
}

.sidebar.collapsed .alert a {
  margin-left: -2px;
}

.sidebar.collapsed .alert h1:hover~div {
  display: none;
}

.sidebar.collapsed .alert div:hover {
  display: none;
}

.count {
  width: 16px;
  line-height: 9px;
  padding-top: 0;
  height: 11px;
  margin-bottom: 7px;
  float: right;
  position: absolute;
  z-index: 1;
  font-weight: 500;
  left: 0;
  bottom: 0;
  margin-left: 7px;
  font-size: 11px;
  text-align: center;
  background: var(--primary-color);
  color: #ffffff;
  border-radius: 2px;

}

.sidebar.collapsed .count {
  border-radius: 50%;
    margin-bottom: 0;
    margin-left: 0;
    height: 14px;
    z-index: 3;
    min-width: 14px;
    width: 14px;
    line-height: 14px;

}
.sidebar.collapsed .count:before {
display: none;
}


.count:before {
  content: "\A";
  border-style: solid;
  border-width: 8px 6px 8px 0;
  border-color: transparent var(--primary-color) transparent transparent;
  position: absolute;
  top: -11px;
  z-index: 0;
  transform: rotate(90deg);
  left: 0;
  margin-left: 4px;
}

.space-actions {
  border-top: 2px solid var(--secondary-background-color);
  margin: 10px 0 10px 0;
  position: relative;
  border-radius: var(--primary-border-radius);
}

.space-actions span {
  position: absolute;
  background: var(--primary-background-color);
  border: 2px solid var(--secondary-background-color);
  font-size: 12px;
  top: 0;
  color: var(--primary-font-color);
  margin-top: -12px;
  cursor: pointer;
  padding: 0 4px;
  border-radius: var(--primary-border-radius);
  margin-left: 25px;
  opacity: 0;
  transition: .2s;
}

.space-actions span:hover {
  background-color: var(--primary-background-color-hover);
  transition: .2s;
}

.top:hover .space-actions span {
  opacity: 1;
  transition: .2s;
}

.spaces-icon {
  width: 13px;
  margin-top: -3px;
}

.space-icon {
  position: relative;
}

.space-icon span {
  position: absolute;
  left: 0;
  top: 0;
  margin-left: 7px;
  margin-top: 5px;
  font-size: 10px;
}

.sidebar.collapsed .name {
  position: absolute;
    left: 0;
    bottom: 0;
    font-size: 10px;
    margin-bottom: 7px;
    width: 7px;
    overflow: hidden;
    margin-left: 11px;
    z-index: 2;
    color: var(--primary-font-color);
    height: 14px;
}
</style>
