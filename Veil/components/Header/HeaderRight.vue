<script lang="ts" setup>
import Toast from "@Veil/components/Header/Toast.vue";

</script>

<template>
  <div class="header-right">
    <Toast />
  </div>
</template>

<style scoped>
.header-right {
  position: absolute;
  right: 0;
  padding-right: 15px;
  margin-top: 3px;
  z-index: 101;
}

.header-right a {
  background: var(--primary-background-color);
  padding: 2px 5px 7px 5px;
  border-radius: var(--primary-border-radius);
  margin-left: 10px;
}

.header-right img {
  width: 20px;
}
</style>