<script lang="ts" setup>
import ButtonSecondary from '@Veil/components/Base/ButtonSecondary.vue';
import ButtonPrimary from '@Veil/components/Base/ButtonPrimary.vue';
import { isDevControlsCollapsed } from '@Veil/state/common'
import Icon from '@Veil/components/Base/Icon.vue'
import { RosettaStone, i18n } from "@Veil/utils/rosetta/rosetta";

const toggleDevControlsCollapsed = () => isDevControlsCollapsed.value = !(isDevControlsCollapsed.value)

</script>

<template>
  <div :class="{
    'modal-feedback': true,
    'collapsed': isDevControlsCollapsed,
  }">
    <div class="left">
      <img src="@Veil/assets/img/bugsn.png" />
      <h1><span>{{ i18n(RosettaStone.modals.feedback.step1) }}</span> {{
        i18n(RosettaStone.modals.feedback.download_files)
      }}
      </h1>
      <p>{{ i18n(RosettaStone.modals.feedback.logs_info) }}<br><i>{{ i18n(RosettaStone.modals.feedback.skip) }}</i>
      </p>
      <br />
      <ButtonPrimary>
        <Icon name="download" color="white" /> {{ i18n(RosettaStone.modals.feedback.download_logs) }}
      </ButtonPrimary>

      <h1><span>{{ i18n(RosettaStone.modals.feedback.step2) }}</span> {{ i18n(RosettaStone.modals.feedback.file_bug) }}
      </h1>
      <p>{{ i18n(RosettaStone.modals.feedback.open_browser) }}</p>
      <br />
      <ButtonPrimary>
        <Icon name="link" color="white" /> {{ i18n(RosettaStone.modals.feedback.open_form) }}
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
          <Icon name="check" color="accent" />
        </ButtonSecondary>
        <ButtonSecondary>Test SMTP Connection
          <Icon name="check" color="accent" />
        </ButtonSecondary>
        <ButtonSecondary>Test Mail Connection
          <Icon name="check" color="accent" />
        </ButtonSecondary>
      </div>
    </div>
  </div>
</template>
  
<style lang="scss" scoped>
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
  padding: 35px 60px 35px 30px;
  background: var(--primary-background-color);
  height: 100%;
  transition: .1s;
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
  background-color: var(--s-opaque);
  padding: 35px 30px;
  transition: .1s;
}

.collapsed .right {
  width: 30px;
  padding: 35px 0px;
  transition: .1s;
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
  cursor: default;
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
</style>@Veil/state/common