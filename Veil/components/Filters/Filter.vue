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
  background-color: #c8c8c80a;
  padding: 2px 10px 10px 10px;
  border-radius: var(--primary-border-radius);
}
</style>
