<script lang="ts" setup>

</script>

<template>
  <div class="filter-date-range">
    <div class="line">
      <div class="labl">From</div>
      <input type="date" />
    </div>
    <div class="spacer5"></div>
    <div class="line">
      <div class="labl">To</div>
      <input type="date" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.labl {
  color: var(--primary-font-color);
  font-size: 14px;
  margin-top: 2px;
  opacity: .6;
  width: 38px;
}

.line {
  display: inline-flex;
  width: 100%;
}

input {
  color: var(--primary-font-color);
  font-size: 14px;
  opacity: .8;
  height: 30px;
  width: calc(100% - 38px);
  transition: .2s;
  border: 1px solid var(--secondary-background-color-hover) !important;
  padding: 3px 7px;
  cursor: pointer;
}

::-webkit-calendar-picker-indicator {
  filter: invert(1);
  opacity: .6;
}

.spacer5 {
  height: 5px;
}

input:hover {
  opacity: 1;
  transition: .2s;
}
</style>
