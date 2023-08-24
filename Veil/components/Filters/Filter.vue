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
  box-shadow: inset 0px 0px 11px 0px #00000059;
  padding: 5px 10px 10px 10px;
  border-radius: var(--primary-border-radius);
}
</style>
