<script lang="ts" setup>
import defs from '@Veil/utils/icon-definitions'
defineProps<{
  name?: string & keyof typeof defs;
  color?: string;
}>();
</script>

<template>
  <img :src="defs[name!]" :class="color" draggable="false" />
</template>

<style lang="scss" scoped>
img {
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -o-user-select: none;
  user-select: none;
}

.accent {
  filter: var(--primary-color-filter);
}

.red {
  filter: invert(16%) sepia(82%) saturate(7141%) hue-rotate(347deg) brightness(80%) contrast(106%);
}

.error {
  filter: invert(16%) sepia(82%) saturate(7141%) hue-rotate(347deg) brightness(80%) contrast(106%);
}

.grey {
  filter: var(--icon-filter);
  opacity: .5;
}

.gray {
  opacity: .5;
  filter: var(--icon-filter);
}

.normal, .default {
  filter: var(--icon-filter);
  opacity: .5;
}

.white {
  filter: invert(1);
}
</style>
