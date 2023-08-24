<script lang="ts" setup>
</script>

<template>
  <div class="filter">
    <slot></slot>
  </div>
</template>

<style lang="scss" scoped>
.filter {
  margin-bottom: 25px;
  background-color: var(--primary-background-color);
  padding: 5px 10px 10px 10px;
  border-radius: var(--primary-border-radius);
}
</style>
