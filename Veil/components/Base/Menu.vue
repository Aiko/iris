<script lang="ts" setup>
import Icon from '@Veil/components/Base/Icon.vue'
import { ref } from 'vue'
import MenuItem from './MenuItem.vue';

defineProps<{
  label?: string;
  direction?: string;
  width?: number;
}>();

let isOpen = ref(false);
const toggleMenu = () => (isOpen.value = !isOpen.value);
</script>

<template>
  <div class="menu" :class="{
    ['' + direction]: true, 'isOpen': isOpen, ['w' + width]: true,
  }">
    <div :class="{
      'menu-container': true,
      'is-open': isOpen,
    }" @click="toggleMenu" tabindex="0" @focusout="isOpen = false" autofocus>
      <MenuItem v-if="label != null && label != ''" class="label">
      {{ label }}
      </MenuItem>

      <slot v-if="isOpen" class="overflow-scroll"></slot>

      <Icon name="roundedx" color="normal" class="icon" v-if="isOpen" />
      <Icon name="down" color="normal" class="icon" v-if="!isOpen" />

    </div>
  </div>
</template>

<style scoped>
.menu {
  background-color: var(--primary-background-color);
  border-radius: var(--primary-border-radius);
  border: 1px solid var(--secondary-background-color) !important;
  padding: 2px 32px 0px 5px;
  color: var(--primary-font-color);
  outline: none !important;
  width: 150px;
  cursor: pointer;
  height: 35px;
  position: relative;
  user-select: none;
  overflow: hidden;
}

.isOpen {
  overflow: unset;
}



.w50,
.w50 .menu-container {
  width: 50px !important;
}

.w100,
.w100 .menu-container {
  width: 100px !important;
}

.w150,
.w150 .menu-container {
  width: 150px !important;
}

.w200,
.w200 .menu-container {
  width: 200px !important;
}

.w250,
.w250 .menu-container {
  width: 250px !important;
}

.w300,
.w300 .menu-container {
  width: 300px !important;
}



.label {
  padding-right: 25px;
  pointer-events: none;
}

.menu-container {
  width: calc(100% - 15px);
  margin-left: -6px;
  margin-top: -3px;
  left: 0;
  position: absolute;
  border-radius: var(--primary-border-radius);
}

.overflow-scroll {
  overflow-y: scroll;
}

.is-open {
  background: var(--primary-background-color);
  
  border: 1px solid var(--secondary-background-color) !important;
  z-index: 1000;
}

.icon {
  position: absolute;
  top: 0;
  right: 0;
  pointer-events: none;
  margin: 5px;
  width: 24px;
}

.right .icon {
  transform: rotate(-90deg);
}

.left .icon {
  transform: rotate(90deg);
}

.top .icon {
  transform: rotate(180deg);
}

.normal {}

.down {}

.top .menu-container {
  position: absolute;
  bottom: 0;
  margin: 0;
  padding-bottom: 35px;
}

.top .label {
  position: absolute;
  bottom: 0;
}

.top .icon {
  top: unset;
  bottom: 0;
}

.left {}
</style>