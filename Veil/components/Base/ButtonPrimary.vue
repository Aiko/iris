<script lang="ts" setup>
</script>

<template>
  <a>
    <slot></slot>
  </a>
</template>

<style scoped>
a {
  background: var(--primary-color);
  color: #fff !important;
  margin-top: 0;
  transition: .2s;
  width: 100%;
  position: relative;
  padding: 4px 10px 5px 9px;
  border-radius: 5px;
  font-size: 14px;
  margin-top: 3px;
  white-space: nowrap;
  overflow: hidden;
  height: 30px;
  margin-bottom: 5px;
  letter-spacing: .3px;
  transition: .2s;
}

a:hover {
  background: var(--primary-color-hover);
  transition: .2s;
}

img {
  width: 17px;
  margin-top: -2px;
}
</style>