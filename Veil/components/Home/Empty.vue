<script lang="ts" setup>
import Icon from "@Veil/components/Base/Icon.vue";
defineProps<{
  message?: string
}>()
</script>

<template>
  <div class="empty">
    <div class="middle">
      <Icon name="drag" color="grey" />
      <p>{{message}}</p>
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
}

.middle {
  margin-top: 5px;
}

.middle p {
  margin-top: 2px;
}
</style>