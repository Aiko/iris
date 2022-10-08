<script lang="ts" setup>
</script>

<template>
  <div class="composer-body">
    <textarea />
  </div>
</template>

<style scoped>
.composer-body {
  height: calc(100% - 320px);
  width: 100%;
}

textarea {
  padding: 10px;
  background: var(--primary-background-color);
  width: 100%;
  height: 100%;
  overflow-y: scroll;
  cursor: text !important;
  border-radius: 0;
}

textarea:focus,
textarea:active {
  filter: brightness(0.9);
  transition: .2s;
}
</style>