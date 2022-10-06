<script lang="ts" setup>
import { infoContent } from '@Veil/state/sections'
import Icon from '@Veil/components/Base/Icon.vue'
</script>

<template>
  <div class="control-bar">
    <p v-if="infoContent != ''">
      <Icon name="info" color="normal" />{{infoContent}}
    </p>
  </div>
</template>

<style scoped>
img {
  width: 16px;
  margin-right: 5px;
  margin-top: -1px;
}

p {
  text-align: center;
  margin: 0;
  margin: auto;
  opacity: .5;
  background: var(--secondary-background-color);
  padding: 1px 5px;
  border-radius: var(--primary-border-radius);
}

.control-bar {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 100;
  margin-bottom: 10px;
  display: inline-flex;
  height: 28px;
  cursor: default !important;
  user-select: none;
  -webkit-app-region: drag;
}
</style>