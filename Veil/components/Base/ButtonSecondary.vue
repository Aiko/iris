<script lang="ts" setup>
defineProps<{
  active?: boolean
}>()
</script>

<template>
  <a :class="{
    'button': true,
    'active': active,
  }">
    <slot></slot>
  </a>
</template>

<style scoped>
a {
  background-color: var(--secondary-background-color);
  border: 1px solid var(--secondary-background-color);
  color: var(--primary-color) !important;
  padding: 2px 5px;
  border-radius: var(--primary-border-radius);
  font-size: var(--btn-font-size);
  font-weight: var(--btn-font-weight);
  white-space: nowrap;
  transition: .2s;
  display: inline-block;
  text-align: center;
}

a:hover {
  background-color: var(--main-background-color);
  border: 1px solid var(--primary-color);
  transition: .2s;
}

.active {
  background-color: var(--main-background-color) !important;
  border: 1px solid var(--primary-color) !important;
  transition: .2s;
}
</style>