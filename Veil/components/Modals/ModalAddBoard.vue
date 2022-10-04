<script lang="ts" setup>
import Icon from "@Veil/components/Base/Icon.vue";
import ButtonSecondary from "@Veil/components/Base/ButtonSecondary.vue";
import ButtonPrimary from "@Veil/components/Base/ButtonPrimary.vue";
</script>

<template>
  <Icon name="board" color="blue" />
  <h1>Add new board</h1>
  <input placeholder="Board name" autofocus />
  <p>Organize your emails manually, or automatically using board
    rules.
  </p>
  <div class="modal-bottom">
    <ButtonSecondary>Cancel</ButtonSecondary>
    <ButtonPrimary class="ml-2">Add board</ButtonPrimary>
  </div>
</template>

<style scoped>
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
</style>