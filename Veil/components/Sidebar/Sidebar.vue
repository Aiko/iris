<script lang="ts" setup>
import { Sidebar, infoContent, selectedModal, Modal } from "@Veil/state/sections";
import ButtonPrimary from "@Veil/components/Base/ButtonPrimary.vue";
import NavLink from "@Veil/components/Sidebar/NavLink.vue";
import Icon from "@Veil/components/Base/Icon.vue";
import Alert from "@Veil/components/Sidebar/Alert.vue";
import { RosettaStone, i18n } from "@Veil/utils/rosetta/rosetta";
import { scribeVoice } from "@Veil/utils/whisper/whisper";
import Logger from "@Veil/services/roots"
const Log = new Logger("Sidebar")

// Information variables for 'Sidebar' component
const infoCollapse = i18n(RosettaStone.sidebar.toggle_collapse);
const infoDocumentation = i18n(RosettaStone.sidebar.open_documentation);
const infoSettings = i18n(RosettaStone.sidebar.open_settings);
const infoCalendar = i18n(RosettaStone.sidebar.open_calendar);

const toggleSidebarCollapse = () => (Sidebar.collapsed = !Sidebar.collapsed);
</script>

<template>
  <div :class="{
    sidebar: true,
    collapsed: Sidebar.collapsed,
  }">
    <div class="top">
      <div class="composecont">
        <ButtonPrimary @click="scribeVoice" target="_blank" class="voice">
          <Icon name="microphone" color="white" class="special" />
        </ButtonPrimary>
        <ButtonPrimary target="_blank" class="norm">
          <Icon name="compose" color="white" class="special" />{{ i18n(RosettaStone.sidebar.menu.compose) }}
        </ButtonPrimary>
      </div>

      <NavLink class="space" active>
        <Icon name="home" color="blue" />
        <span class="name">{{ i18n(RosettaStone.sidebar.menu.home) }}</span>
        <span class="count">99</span>
      </NavLink>

      <NavLink class="space">
        <Icon name="home" color="blue" />
        <span class="name">Legal</span>
        <span class="count">3</span>
      </NavLink>

      <NavLink class="space">
        <Icon name="home" color="blue" />
        <span class="name">Accounting</span>
        <span class="count">9</span>
      </NavLink>

      <NavLink class="space">
        <Icon name="home" color="blue" />
        <span class="name">Personal</span>
        <span class="count">0</span>
      </NavLink>

      <div class="space-actions">
        <span v-if="!Sidebar.collapsed">
          <Icon name="home" color="normal" class="spaces-icon" /> {{ i18n(RosettaStone.sidebar.menu.edit_spaces) }}
        </span>
      </div>

      <NavLink>
        <Icon name="sent" color="normal" />{{ i18n(RosettaStone.sidebar.menu.sent) }}
      </NavLink>
      <NavLink>
        <Icon name="drafts" color="normal" />{{ i18n(RosettaStone.sidebar.menu.drafts) }}
      </NavLink>
      <NavLink>
        <Icon name="archive" color="normal" />{{ i18n(RosettaStone.sidebar.menu.archive) }}
      </NavLink>
      <NavLink>
        <Icon name="spam" color="normal" />{{ i18n(RosettaStone.sidebar.menu.spam) }}
      </NavLink>
      <NavLink>
        <Icon name="trash" color="normal" />{{ i18n(RosettaStone.sidebar.menu.trash) }}
      </NavLink>
    </div>
    <Alert>
      <!-- TODO: channel & version from Chiton -->
      <h1><b>BETA</b></h1>
      <div>#darwin-3.8.1:INTERNAL</div>

      <p v-if="!Sidebar.collapsed"><span>{{ i18n(RosettaStone.settings.request1) }} </span> {{
        i18n(RosettaStone.settings.request2)
      }}</p>
      <ButtonPrimary @click="selectedModal = Modal.Feedback">
        <span v-if="!Sidebar.collapsed">{{ i18n(RosettaStone.settings.btn) }}</span>
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
  width: 170px;
  height: 100%;
  background-color: var(--sidebar-bg);
  padding: 8px 10px;
  position: relative;
  z-index: 1;
  box-shadow: var(--sidebar-shadow);
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
  bottom: 0;
  margin-bottom: -2px;
  cursor: pointer !important;
  border-top-right-radius: 0 !important;
  border-bottom-right-radius: 0 !important;
  z-index: 1;
  padding: 5px 3px;
  height: 30px;
  background: var(--primary-background-color);
  border-radius: var(--primary-border-radius);
  transition: .1s;
}

.sidebar.collapsed .sidebar-collapse {
  width: 37px;
  padding-left: 10px;
}

.sidebar-collapse:hover {
  background-color: var(--primary-background-color);
  transition: .1s;
}

.sidebar-collapse img {
  width: 15px !important;
  margin-top: -8px;
  opacity: .5;
  transition: 0.2s;
}



.sidebar.collapsed .sidebar-collapse img {
  transform: rotate(180deg);
  transition: 0.2s;
}

.compose {
  margin-top: 0;
}

.composecont {
  display: inline-flex;
  position: relative;
}

.collapsed .composecont {
  display: inline-grid;
}

.collapsed .composecont .norm {
  position: relative;
  padding: 4px 5px 5px 10px !important;
}

.collapsed .composecont .voice {
  padding: 5px 4px 5px 8px !important;
}

.composecont .voice {
  width: 30px;
  width: 30px;
  padding: 5px 6px;
}

.composecont .norm {
  width: calc(100% - 36px);
  position: absolute;
  right: 0;
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
  padding-bottom: 30px;
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
  padding-top: 20px;
  bottom: 0;
  left: 0;
}

.bottom a {
  padding: 4px 5px 7px 5px;
  width: 30px;
  height: 30px;
  border-radius: var(--primary-border-radius);
  margin-left: 10px;
  margin-right: 9px;
  transition: 0.2s;
}

.bottom a:hover {
  background: var(--primary-background-color);
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
  margin-bottom: 18px;
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
  background-color: var(--p-opaque);
  height: unset;
  z-index: 10;
  position: relative;
}


.alert div:hover {
  margin-top: 0px;
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
  display: none;
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
  transition: .1s;
}

.space-actions span:hover {
  background-color: var(--primary-background-color-hover);
  transition: .1s;
}

.top:hover .space-actions span {
  opacity: 1;
  transition: .1s;
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
