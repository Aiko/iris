<script lang="ts" setup>
</script>


<template>
  <div class="alert">
    <slot></slot>
  </div>
</template>

<style scoped>
.alert {
  margin-bottom: 100px;
  width: calc(100% - 16px);
  margin-left: 8px;
  margin-right: 8px;
  position: absolute;
  padding: 7px;
  bottom: 0;
  left: 0;
  background: var(--secondary-background-color);
}

.sidebar.collapsed .alert {
  margin: 0;
  width: 100%;
  border-radius: 0;
  margin-bottom: 200px;
  padding-left: 5px;
  padding-right: 0;
}

@media only screen and (max-height: 510px) {
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