<script lang="ts" setup>
import { selectedModal, Modal } from '@Veil/state/sections'
import Icon from "@Veil/components/Base/Icon.vue";
import ButtonSecondary from "@Veil/components/Base/ButtonSecondary.vue";
import ButtonPrimary from "@Veil/components/Base/ButtonPrimary.vue";
</script>
  
<template>
  <div class="modal-settings">
    <Icon name="settings" color="blue" />
    <h1>Settings</h1>

  </div>
</template>
  
<style scoped>
.modal-settings {
  width: 100%;
  height: 100%;
  text-align: center;
  padding: 20px;
  position: relative;
}

img {
  width: 40px;
  margin-bottom: 10px;
  margin-top: 10px;
}

h1 {
  font-size: 16px;

}

input {
  width: 100%;
  max-width: 250px;
  border-radius: var(--primary-border-radius);
  font-size: 16px;
  margin-top: 10px;
  margin-bottom: 10px;
  color: var(--strong-font-color);
  background: var(--secondary-background-color);
  cursor: text !important;
  padding: 8px 10px;
}

p {
  margin-bottom: 50px;
}
</style>