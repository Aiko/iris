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
  <div class="menu" :class="direction + ' w' + width">
    <div :class="{
      'menu-container': true,
      'is-open': isOpen,
    }" @click="toggleMenu" tabindex="0" @focusout="isOpen = false" autofocus>
      <MenuItem v-if="label != null && label != ''" class="label">
      {{ label }}
      </MenuItem>

      <slot v-if="isOpen"></slot>
      <Icon name="roundedx" color="normal" class="icon" v-if="isOpen" />
      <Icon name="down" color="normal" class="icon" v-if="!isOpen" />

    </div>
  </div>
</template>

<style scoped>
.menu {
  background-color: var(--primary-background-color);
  border-radius: var(--primary-border-radius);
  border: 1px solid var(--secondary-background-color);
  padding: 0px 32px 0px 5px;
  color: var(--primary-font-color);
  margin-right: 8px;
  outline: none !important;
  width: 150px;
  cursor: pointer;
  height: 35px;
  position: relative;
  user-select: none;
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
  height: 35px;

  width: 150px;
  margin-left: -5px;
  border-radius: var(--primary-border-radius);
}


.is-open {
  height: fit-content !important;
  background: var(--primary-background-color);
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

.right {}

.left {}

.top {}
</style>