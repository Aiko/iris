<script lang="ts" setup>
</script>

<template>
  <div class="empty">
    <div class="middle">
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
.empty {
  width: 100%;
  height: 112px;
  text-align: center;
  background: var(--secondary-background-color);
  border-radius: var(--primary-border-radius);
  position: relative;
  user-select: none;
  margin-bottom: 15px;
}

.small .empty {
  display: none;
}

.middle {
  margin-top: 5px;
  width: 100%;
}
</style>