<script lang="ts" setup>
import Icon from '@Veil/components/Base/Icon.vue'
import { ref } from 'vue'
import MenuItem from './MenuItem.vue';

defineProps<{
  label?: string;
  width?: number;
}>();

let isOpen = ref(false);

</script>

<template>
  <div class='sub-menu'>
    <div :class="{
      'sub-menu-container': true,
      'is-open': isOpen,
    }" @mouseover="isOpen = true" @mouseleave="isOpen = false">
      <MenuItem v-if="label != null && label != ''">
      {{ label }}
      </MenuItem>
      <div v-if="isOpen" class="otherOptions">
        <slot></slot>
      </div>
      <Icon name="chevron-down" color="normal" class="icon" />
    </div>
  </div>
</template>

<style scoped>
.sub-menu {
  background: var(--p-opaque);
  border-top: 1px solid var(--secondary-background-color);
  border-bottom: 1px solid var(--secondary-background-color);
  color: var(--primary-font-color);
  margin-right: 8px;
  outline: none !important;
  width: 100%;
  height: 36px;
  cursor: pointer;
  position: relative;
  position: relative;
}

.sub-menu-container {
  border-radius: var(--primary-border-radius);
  position: relative;
  width: 100%;
}

.otherOptions {
  position: absolute;
  background: var(--p-opaque);
  right: 0;
  margin-right: -100%;
  width: 100%;
  margin-top: -4px;
  border-radius: var(--primary-border-radius);
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  border: 1px solid var(--secondary-background-color);
  top: 0;
}


.icon {
  position: absolute;
  top: 0;
  right: 0;
  margin: 4px 6px;
  user-select: none;
  pointer-events: none;
  width: 20px;
  transform: rotate(270deg);
}
</style>