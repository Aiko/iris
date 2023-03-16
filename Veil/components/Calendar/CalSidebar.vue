<script lang="ts" setup>
import { Sidebar, infoContent, selectedModal, Modal } from "@Veil/state/sections";
import ButtonPrimary from "@Veil/components/Base/ButtonPrimary.vue";
import NavLink from "@Veil/components/Sidebar/NavLink.vue";
import Icon from "@Veil/components/Base/Icon.vue";
import Alert from "@Veil/components/Sidebar/Alert.vue";
import { RosettaStone, i18n } from "@Veil/utils/rosetta/rosetta";
import { scribeVoice } from "@Veil/utils/whisper/whisper";
import Logger from "@Veil/services/roots"
import ButtonSecondary from "../Base/ButtonSecondary.vue";
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
        <ButtonPrimary target="_blank" class="norm">
          <Icon name="calendar" color="white" class="special" />New Event
        </ButtonPrimary>
      </div>

      <div class="cont">
        <p>
          My calendars
        </p>

        <div class="aikocheckbox">
          <input type="checkbox" id="check1" />
          <label for="check1">Trident3</label>
        </div>

        <div class="aikocheckbox">
          <input type="checkbox" id="check2" />
          <label for="check2">Birthdays</label>
        </div>
      </div>
      <div class="cont">
        <p>
          Shared calendars
        </p>

        <div class="aikocheckbox">
          <input type="checkbox" id="check3" />
          <label for="check3">Ruben Touitou</label>
        </div>

        <div class="aikocheckbox">
          <input type="checkbox" id="check4" />
          <label for="check4">Jack Ma</label>
        </div>
      </div>

      <ButtonSecondary class="new-cal">
        <Icon name="plus" color="blue" />Add a calendar
      </ButtonSecondary>


      <div class="cont cont-task">
        <p>
          Tasks
        </p>

        <div class="aikocheckbox">
          <input type="checkbox" id="check5" />
          <label for="check5">Make website</label>
        </div>

        <div class="aikocheckbox">
          <input type="checkbox" id="check6" />
          <label for="check6">Work on deck</label>
        </div>
      </div>
      <ButtonSecondary class="new-task">
        <Icon name="plus" color="blue" />New task
      </ButtonSecondary>
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


.compose {
  margin-top: 0;
}

.composecont {
  display: inline-flex;
  position: relative;
}


.sidebar .top {
  display: grid;
}

.special {
  margin-top: -2px;
  width: 16px !important;
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

.cont {
  background-color: var(--secondary-background-color);
  padding: 5px 0 5px 8px;
  margin-top: 2vh;
  border-radius: var(--primary-border-radius);
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

.aikocheckbox input[type="checkbox"]+label {
  color: var(--primary-font-color) !important;
  font-size: 13px;
}

.aikocheckbox input[type="checkbox"]+label:after {
  color: #ffffff !important;
  transform: scale(0.8) !important;
  filter: invert(1) !important;
}

.new-cal {
  margin-top: 5px;
}

.new-cal img {
  width: 13px !important;
  margin-top: -2px;
}

.new-task {
  margin-top: 5px;
}

.new-task img {
  width: 13px !important;
  margin-top: -2px;
}

.label-icon {
  width: 16px !important;
  margin-top: -2px;
}

.cont p {
  color: var(--primary-font-color);
  font-weight: 700;
  font-size: 13px !important;
}

.cont-task {
  margin-top: 10vh;
}
</style>
