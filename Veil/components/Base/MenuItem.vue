<script lang="ts" setup>
</script>

<template>
  <div class="menu-item">
    <slot></slot>
  </div>
</template>

<style lang="scss" scoped>
.menu-item {
  margin: 3px 3px 3px 3px;
  padding: 2px 7px;
  border-radius: var(--primary-border-radius);
  white-space: nowrap;
  text-overflow: ellipsis;
  width: calc(100% - 6px);
  overflow: hidden;
}

.menu-item:hover {
  background-color: var(--secondary-background-color);

}
</style>