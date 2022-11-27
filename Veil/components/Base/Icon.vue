<script lang="ts" setup>
defineProps<{
  name?: string;
  color?: string;
}>();
</script>

<template>
  <img :src="'Veil/assets/icons/' + name + '.svg'" :class="color" draggable="false" />
</template>

<style scoped>
img {
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -o-user-select: none;
  user-select: none;
}

.blue {
  filter: invert(36%) sepia(70%) saturate(2590%) hue-rotate(217deg) brightness(101%)
    contrast(101%);
}

.red {
  filter: invert(16%) sepia(82%) saturate(7141%) hue-rotate(347deg) brightness(80%)
    contrast(106%);
}

.error {
  filter: invert(16%) sepia(82%) saturate(7141%) hue-rotate(347deg) brightness(80%)
    contrast(106%);
}

.grey {
  filter: var(--icon-filter);
}

.gray {
  filter: var(--icon-filter);
}

.normal {
  filter: var(--icon-filter);
}

.white {
  filter: invert(0%);
}
</style>
