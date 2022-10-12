<script lang="ts" setup>
defineProps<{
  active?: boolean
  color?: string
}>()
</script>

<template>
  <a :class="{
    'button': true,
    'active': active,
    'red': color == 'red',
  }">
    <slot></slot>
  </a>
</template>

<style scoped>
a {
  background-color: var(--secondary-background-color);
  border: 1px solid var(--secondary-background-color);
  color: var(--primary-color);
  padding: 2px 5px;
  border-radius: var(--primary-border-radius);
  font-size: var(--btn-font-size);
  font-weight: var(--btn-font-weight);
  white-space: nowrap;
  transition: .2s;
  display: inline-block;
  text-align: center;
}

a:not([href]):not([tabindex]) {
  color: var(--primary-color);
}

.red:hover {
  border: 1px solid #d0021c !important;
}

a:not([href]):not([tabindex]):hover {
  color: var(--primary-color);
}

a:hover {
  background-color: transparent;
  border: 1px solid var(--primary-color);
  transition: .2s;
}

.active {
  background-color: transparent !important;
  border: 1px solid var(--primary-color) !important;
  transition: .2s;
}
</style>