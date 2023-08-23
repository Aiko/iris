<script lang="ts" setup>

</script>

<template>
  <div class="filter-date">
    <input type="date" />
  </div>
</template>

<style lang="scss" scoped>
input {
  color: var(--primary-font-color);
  font-size: 14px;
  opacity: .8;
  border: 1px solid var(--secondary-background-color-hover) !important;
  padding: 3px 7px;
  transition: .2s;
  cursor: pointer;
}

input:hover {
  opacity: 1;
  transition: .2s;
}
</style>
