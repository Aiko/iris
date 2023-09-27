<script lang="ts" setup>
</script>


<template>
  <div class="alert">
    <slot></slot>
  </div>
</template>

<style lang="scss" scoped>
.alert {
  margin-bottom: 80px;
  width: calc(100% - 20px);
  margin-left: 10px;
  margin-right: 10px;
  position: absolute;
  padding: 7px;
  bottom: 0;
  left: 0;
  background: var(--primary-background-color);
}

.sidebar.collapsed .alert {
  margin: 0;
  width: 100%;
  border-radius: 0;
  margin-bottom: 200px;
  padding-left: 5px;
  padding-right: 0;
}

@media only screen and (max-height: 610px) {
  .alert {
    display: none;
  }
}

.alert a {
  position: absolute;
  bottom: 0;
  width: calc(100% - 14px);
  left: 0;
  margin: 7px 7px;
}
</style>