<script lang="ts" setup>
import Email from "@Veil/components/Email/Email.vue";
</script>

<template>
  <div class="side-email">
    <Email />
  </div>
</template>

<style scoped>
.side-email {
  width: calc(100% - 315px);
  height: 100%;
  background: var(--primary-background-color);
  border-radius: var(--primary-border-radius) var(--primary-border-radius) 0 0;
  height: 100%;
  position: relative;
  contain: size layout;
  box-shadow: var(--board-shadow);
  border: none !important;
  border-top-right-radius: 0;
  transition: .2s;
}
</style>