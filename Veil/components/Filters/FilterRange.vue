<script lang="ts" setup>
</script>

<template>
  <div class="filter-range">
    <div class="col">
      <input type="number" />
    </div>
    <div class="col">
      <input type="number" />
    </div>

  </div>
</template>

<style lang="scss" scoped>
.filter-range {
  cursor: pointer;
  opacity: .8;
  transition: .2s;
  width: 100%;
  display: inline-flex;
  margin-bottom: 3px;
}

.col {
  width: 50%;
  padding: 0;
}

input {
  color: var(--primary-font-color);
  font-size: 14px;
  opacity: .8;
  border: 1px solid var(--secondary-background-color-hover) !important;
  padding: 3px 7px;
  width: calc(100% - 5px);
  transition: .2s;
  cursor: pointer;
}
</style>


