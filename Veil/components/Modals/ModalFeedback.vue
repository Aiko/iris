<script lang="ts" setup>
import ButtonSecondary from '@Veil/components/Base/ButtonSecondary.vue';
import ButtonPrimary from '@Veil/components/Base/ButtonPrimary.vue';
import { isDevControlsCollapsed } from '@Veil/state/sections'
import Icon from '@Veil/components/Base/Icon.vue'


const toggleDevControlsCollapsed = () => isDevControlsCollapsed.value = !(isDevControlsCollapsed.value)

</script>
  
<template>
  <div :class="{
    'modal-feedback': true,
    'collapsed': isDevControlsCollapsed,
  }">
    <div class="left">
      <img src="@Veil/assets/img/bugsn.png" />
      <h1><span>Step 1</span> - Download the "logs" file</h1>
      <p>Logs are files telling us which errors happen at what time.<br><i>You can skip this step if this is a
          feature request</i></p>
      <ButtonPrimary>
        <Icon name="download" color="white" /> Download Logs
      </ButtonPrimary>

      <h1><span>Step 2</span> - File a bug report / feature request</h1>
      <p>This button will open a link in your browser, you can upload the downloaded logs file there</p>
      <ButtonPrimary>
        <Icon name="link" color="white" /> Open the form
      </ButtonPrimary>
    </div>
    <div class="right">
      <p class="collapse-info open" @click="toggleDevControlsCollapsed()">
        <Icon name="sidebar-collapse" color="grey" /> Show Developer Controls
      </p>
      <p class="collapse-info closed" @click="toggleDevControlsCollapsed()">
        <Icon name="close" color="grey" />
      </p>
      <div class="content">

        <img src="@Veil/assets/img/devcon.png">
        <br /><br />
        <p>IR: NaN% (00:00:00)</p>
        <ButtonSecondary>Clear Dwarf Star</ButtonSecondary>
        <ButtonSecondary>Clear Browser Data</ButtonSecondary>
        <ButtonSecondary>Clear Iris Cache</ButtonSecondary>
        <ButtonSecondary>Clear Mouseion</ButtonSecondary>
        <ButtonSecondary>Clear EVERYTHING
          <Icon name="danger" color="red" />
        </ButtonSecondary>
        <ButtonSecondary>Open Mouseion</ButtonSecondary>
        <ButtonSecondary>Test IMAP Connection
          <Icon name="check" color="blue" />
        </ButtonSecondary>
        <ButtonSecondary>Test SMTP Connection
          <Icon name="check" color="blue" />
        </ButtonSecondary>
        <ButtonSecondary>Test Mail Connection
          <Icon name="check" color="blue" />
        </ButtonSecondary>
      </div>
    </div>
  </div>
</template>
  
<style scoped>
.modal-feedback {
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

.right a img {
  width: 17px;
  margin-left: 5px;
  margin-top: -3px;
}

.right a {
  margin-bottom: 5px;
}

.left {
  width: 100%;
  position: relative;
  padding: 35px 30px;
  background: var(--primary-background-color);
  height: 100%;
  transition: .2s;
}

.left img {
  width: 200px;
}

.right img {
  width: 200px;
}

.left h1 span {
  color: var(--strong-font-color);
}

.left h1 {
  color: var(--primary-font-color);
  font-size: 16px;
  font-weight: 500;
  margin-top: 50px;
}

.left a img {
  width: 13px;
}

.right {
  position: absolute;
  right: 0;
  top: 0;
  width: 300px;
  height: 100%;
  background-color: var(--secondary-background-color);
  padding: 35px 30px;
  transition: .2s;
}

.collapsed .right {
  width: 30px;
  padding: 35px 0px;
  transition: .2s;
}

.collapse-info {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  margin: 0;
  position: absolute;
  left: 0;
  top: 0;
  margin-top: 15px;
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

.collapsed .content {
  display: none;
}
</style>