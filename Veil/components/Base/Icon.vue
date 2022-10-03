<script lang="ts" setup>
defineProps<{
  name?: string
  color?: string
}>()
</script>

<template>
  <img :src="'Veil/assets/icons/' + name + '.svg'" :class="color" />
</template>

<style scoped>
.blue {
  filter: invert(42%) sepia(25%) saturate(6051%) hue-rotate(215deg) brightness(97%) contrast(108%);
}

.red {
  filter: invert(34%) sepia(98%) saturate(2031%) hue-rotate(338deg) brightness(75%) contrast(128%);
}

.grey {
  filter: none;
}

.white {
  filter: invert(0%) sepia(100%) saturate(0%) hue-rotate(282deg) brightness(103%) contrast(106%);
}
</style>