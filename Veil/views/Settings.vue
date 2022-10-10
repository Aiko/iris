<script lang="ts" setup>
import { ref } from '@vue/reactivity'
import { isRegularView, selectedModal, Modal } from '@Veil/state/sections'
import NavLink from '@Veil/components/Sidebar/NavLink.vue'
import Alert from '@Veil/components/Sidebar/Alert.vue'
import ButtonPrimary from '@Veil/components/Base/ButtonPrimary.vue'
import Icon from '@Veil/components/Base/Icon.vue'

enum Pane {
  AddBoard,
  AddMailbox,
  AddSpace,
  BoardRules,
  Email,
  Feedback,
  Upgrade,
  Settings,
  None,
}

let selectedPane = ref(Pane.None)
</script>

<template>
  <div class="settings" v-if="true">
    <div class="sidebar">
      <h1>Settings</h1>
      <NavLink>
        <Icon name="user" color="normal" class="special" />Account
      </NavLink>
      <NavLink>
        <Icon name="image" color="normal" />Appearance
      </NavLink>
      <NavLink>
        <Icon name="team" color="normal" />Team
      </NavLink>
      <NavLink>
        <Icon name="home" color="normal" />Spaces
      </NavLink>
      <NavLink>
        <Icon name="unsubscribe" color="normal" />Unsubscribe
      </NavLink>
      <NavLink>
        <Icon name="templates" color="normal" />Templates
      </NavLink>
      <NavLink>
        <Icon name="billing" color="normal" />Billing
      </NavLink>
      <NavLink>
        <Icon name="integrations" color="normal" />Integrations
      </NavLink>
      <NavLink>
        <Icon name="settings2" color="normal" />Others
      </NavLink>


      <Alert>
        <h1>
          <i>Version: </i><b>BETA</b>
        </h1>
        <div>#darwin-3.8.1:INTERNAL</div>
        <p><span>Request features and </span>report issues</p>
        <ButtonPrimary @click="selectedModal = Modal.Feedback">
          <span>Give feedback</span>
        </ButtonPrimary>
      </Alert>
    </div>

    <div class="content">
      <div class="pane">
        <h1>Account</h1>
      </div>
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
  padding: 8px 8px 8px 3px;
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

.content {
  width: 100%;
  height: 100%;
  overflow-y: scroll;
  padding: 20px 30px;
}

.special {
  width: 12px !important;
  margin-right: 7px !important;
  margin-top: -1px;
}

.sidebar a {
  display: block;
  margin-bottom: 5px;
}

.sidebar a img {
  width: 16px;
  height: auto;
  margin-right: 5px;
}

.sidebar .alert a {
  display: unset;
}

.sidebar h1 {
  font-size: 18px;
  margin-bottom: 30px;
  margin-left: 5px;
  color: var(--strong-font-color);
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
  margin-left: -4px;
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
</style>