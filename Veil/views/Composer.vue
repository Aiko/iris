<script lang="ts" setup>
import { ref } from '@vue/reactivity'
import ComposerField from '@Veil/components/Composer/ComposerField.vue';
import ComposerBody from '@Veil/components/Composer/ComposerBody.vue';
import ComposerOptions from '@Veil/components/Composer/ComposerOptions.vue';
import ButtonSecondary from '@Veil/components/Base/ButtonSecondary.vue';
import ButtonPrimary from '@Veil/components/Base/ButtonPrimary.vue';
import { isComposerSidebarCollapsed } from '@Veil/state/common'
import Icon from '@Veil/components/Base/Icon.vue'
import Grimaldi from '@Veil/utils/grimaldi/editor'
import { RosettaStone, i18n } from "@Veil/utils/rosetta/rosetta";

let isComposerBCCActive = ref(false);

const toggleComposerSidebar = () => isComposerSidebarCollapsed.value = !(isComposerSidebarCollapsed.value)
const toggleComposerBCC = () => isComposerBCCActive.value = !(isComposerBCCActive.value)

const grimaldi = new Grimaldi()
</script>

<template>
  <!--
  composer:
  make extension button with drawer, remove zoom calendly
  -->


  <div :class="{
    'composer': true,
    'collapsed': isComposerSidebarCollapsed,
  }">
    <div class="left">
      <ComposerField :placeholder="i18n(RosettaStone.composer.to)" />
      <ComposerField :placeholder="i18n(RosettaStone.composer.cc)" />
      <ButtonSecondary class="extra-btn" @click="toggleComposerBCC">{{ i18n(RosettaStone.composer.bcc) }}
      </ButtonSecondary>

      <!-- TODO: This only shows and hides the field an does not remove the email addresses from the BCC and from being sent -->
      <ComposerField :placeholder="i18n(RosettaStone.composer.bcc)" v-if="isComposerBCCActive" />

      <!-- TODO: Only show 'From' field if they have multiple mailboxes -->
      <ComposerField :placeholder="i18n(RosettaStone.composer.from)" v-if="false" />
      <ComposerField :placeholder="i18n(RosettaStone.composer.subject)" />
      <ComposerBody :grimaldi="grimaldi" />

      <ComposerOptions />

    </div>

    <div class="right">
      <p class="collapse-info open" @click="toggleComposerSidebar()">
        <Icon name="sidebar-collapse" color="grey" /> {{ i18n(RosettaStone.composer.show) }}
      </p>
      <p class="collapse-info closed" @click="toggleComposerSidebar()">
        <Icon name="close" color="grey" />
      </p>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.composer {
  width: 100%;
  overflow: hidden;
  height: 100%;
  display: inline-flex;
  padding-top: 25px;
}

.fullscreen .composer {
  padding-top: 0px;
}

.fullscreen .collapse-info {
  padding-top: 10px;
}

.scribe-icon {
  width: 18px;
}

.left {
  width: calc(100% - 300px);
  position: relative;
  background: var(--s-opaque);
  height: 100%;
  transition: .1s;
}

.right {
  width: 300px;
  height: 100%;
  transition: .1s;
}

.collapsed .left {
  width: calc(100% - 30px);
  transition: .1s;
}

.collapsed .right {
  width: 30px;
  transition: .1s;
}

.collapse-info {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  margin: 0;
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
  padding: 7px 15px 9px 15px;
}

.bottom a:last-of-type {
  margin-right: 0px !important;
}

.send-btn {
  padding: 10px 9px !important;
}

.calendly {
  width: 70px;
}

.zoom {
  width: 50px;
}


.extra-btn {
  position: absolute;
  right: 0;
  top: 0;
  margin-top: 52px;
  margin-right: 6px;
  user-select: none;
}
</style>@Veil/state/common