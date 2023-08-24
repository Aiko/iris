<script lang="ts" setup>

</script>

<template>
  <div class="filter-date-range">
    <input type="date" />
    <div class="to">to</div>
    <input type="date" />
  </div>
</template>

<style lang="scss" scoped>
.to {
  color: var(--primary-font-color);
  font-size: 14px;
  display: inline-block;
  margin-left: 5px;
}

input {
  color: var(--primary-font-color);
  font-size: 14px;
  opacity: .8;
  height: 30px;
  transition: .2s;
  border: 1px solid var(--secondary-background-color-hover) !important;
  padding: 3px 7px;
  cursor: pointer;
  margin-bottom: 5px;
}

input:hover {
  opacity: 1;
  transition: .2s;
}
</style>
