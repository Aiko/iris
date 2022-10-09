<script lang="ts" setup>
import ComposerField from '@Veil/components/Composer/ComposerField.vue';
import ComposerBody from '@Veil/components/Composer/ComposerBody.vue';
import ComposerOptions from '@Veil/components/Composer/ComposerOptions.vue';
import ButtonSecondary from '@Veil/components/Base/ButtonSecondary.vue';
import ButtonPrimary from '@Veil/components/Base/ButtonPrimary.vue';
import { isComposerSidebarCollapsed } from '@Veil/state/sections'
import Icon from '@Veil/components/Base/Icon.vue'


const toggleComposerSidebar = () => isComposerSidebarCollapsed.value = !(isComposerSidebarCollapsed.value)

</script>

<template>
  <div :class="{
    'composer': true,
    'collapsed': isComposerSidebarCollapsed,
  }">
    <div class="left">
      <ComposerField placeholder="To" />
      <ComposerField placeholder="CC" />
      <ComposerField placeholder="BCC" />
      <ComposerField placeholder="From" />
      <ComposerField placeholder="Subject" />
      <ComposerBody />
      <ComposerOptions />
      <div class="bottom">
        <ButtonPrimary>Send</ButtonPrimary>
      </div>
    </div>
    <div class="right">
      <p class="collapse-info open" @click="toggleComposerSidebar()">
        <Icon name="sidebar-collapse" color="grey" /> Show Templates and Attachments
      </p>
      <p class="collapse-info closed" @click="toggleComposerSidebar()">
        <Icon name="close" color="grey" />
      </p>
    </div>
  </div>
</template>

<style scoped>
.composer {
  width: 100%;
  overflow: hidden;
  height: 100%;
  display: inline-flex;
}

.bottom {
  height: 60px;
  padding: 17px 10px 10px 10px;
  background: var(--primary-background-color);
}


.left {
  width: calc(100% - 300px);
  position: relative;
  background: var(--primary-background-color);
  height: 100%;
  transition: .2s;
}

.right {
  width: 300px;
  height: 100%;
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
  margin-left: 4px;
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

.bottom a {
  margin-right: 10px;
  padding: 10px 15px;
}
</style>