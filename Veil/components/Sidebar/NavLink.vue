<script lang="ts" setup>
import Icon from "@Veil/components/Base/Icon.vue";
defineProps<{
  text?: string;
  active?: boolean;
}>();
</script>

<template>
  <a :class="{
    'active': active
  }">
    <slot></slot>
  </a>
</template>

<style scoped>
a {
  width: 100%;
  position: relative;
  padding: 4px 4px 4px 6px;
  border-radius: var(--primary-border-radius);
  font-size: 14px;
  color: var(--primary-font-color) !important;
  margin-top: 3px;
  white-space: nowrap;
  display: inline-flex;
  overflow: hidden;
  height: 30px;
  margin-bottom: 5px;
  letter-spacing: 0.3px;
  transition: 0.2s;
}

a:hover {
  background: var(--primary-background-color-hover);
  transition: 0.2s;
}

.active {
  background: var(--secondary-background-color);
}
</style>
