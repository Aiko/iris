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
  padding: 3px 7px;
  border: 1px solid var(--primary-background-color);
  height: 30px;
  transition: .2s;
  width: 100%;

  opacity: .8;
}

input:hover {
  opacity: 1;
  transition: .2s;
}

::-webkit-calendar-picker-indicator {
  filter: invert(1);
  opacity: .6;

}
</style>
