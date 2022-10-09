<script lang="ts" setup>
import Email from "@Veil/components/Email/Email.vue";
import { isEmailSidebarCollapsed } from '@Veil/state/sections'
import Icon from '@Veil/components/Base/Icon.vue'


const toggleEmailSidebar = () => isEmailSidebarCollapsed.value = !(isEmailSidebarCollapsed.value)

</script>

<template>
  <div :class="{
  'email-view': true,
    'collapsed': isEmailSidebarCollapsed
  }">

    <div class="left">
      <Email />
    </div>
    <div class="right">
      <p class="collapse-info open" @click="toggleEmailSidebar()">
        <Icon name="sidebar-collapse" color="grey" /> Show Participants and Details
      </p>
      <p class="collapse-info closed" @click="toggleEmailSidebar()">
        <Icon name="close" color="grey" />
      </p>
    </div>

  </div>


</template>

<style scoped>
.email-view {
  width: 100%;
  overflow: hidden;
  height: 100%;
  display: inline-flex;
  text-align: unset;
}

.left {
  width: calc(100% - 300px);
  position: relative;
  background: var(--primary-background-color);
  height: 100%;
  padding: 15px;
  transition: .2s;
}

.right {
  width: 300px;
  padding: 15px;
  height: 100%;
  background: var(--secondary-background-color);
  transition: .2s;
}

.collapsed .left {
  width: calc(100% - 30px);
  transition: .2s;
}

.collapsed .right {
  width: 30px;
  transition: .2s;
}

.collapse-info {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  margin: 0;
  margin-left: -10px;
  cursor: pointer;
  height: 100%;
}

.open img {
  width: 18px;
  margin-left: -11px;
  margin-bottom: 5px;
}

.closed img {
  width: 13px;
  margin-left: -7px;
  margin-bottom: 5px;
}

.collapse-info.open {
  display: none;
}

.collapse-info.closed {
  display: unset;
}

.collapsed .collapse-info.open {
  display: unset;
}

.collapsed .collapse-info.closed {
  display: none;
}
</style>