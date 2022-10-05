<script lang="ts" setup>
defineProps<{
  name?: string
  color?: string
}>()
</script>

<template>
  <img :src="'@Veil/assets/icons/' + name + '.svg'" :class="color" />
</template>

<style scoped>
.blue {
  filter: invert(42%) sepia(35%) saturate(9051%) hue-rotate(215deg) brightness(97%) contrast(90%);
}

.red {
  filter: invert(34%) sepia(68%) saturate(931%) hue-rotate(338deg) brightness(75%) contrast(128%);
}

.error {
  filter: invert(34%) sepia(68%) saturate(931%) hue-rotate(338deg) brightness(75%) contrast(128%);
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
  filter: invert(0%) sepia(100%) saturate(0%) hue-rotate(282deg) brightness(103%) contrast(106%);
}
</style>