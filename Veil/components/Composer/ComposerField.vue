<script lang="ts" setup>
const props = defineProps<{
  placeholder?: string
}>()
</script>

<template>
  <div class="composer-field">
    <input :placeholder="props.placeholder" />
    <div class="suggestions" v-if="false">
      <div>Ruben Touitou</div>
      <div>Ruben Touitou</div>
      <div>Ruben Touitou</div>
      <div>Ruben Touitou</div>
      <div>Ruben Touitou</div>
      <div>Ruben Touitou</div>
      <div>Ruben Touitou</div>
      <div>Ruben Touitou</div>
      <div>Ruben Touitou</div>
      <div>Ruben Touitou</div>
    </div>

  </div>
</template>

<style scoped>
.composer-field {
  width: 100%;
}

input {
  cursor: text !important;
  width: 100%;
  padding: 10px;
  border-radius: 0;
  border-bottom: 1px solid var(--secondary-background-color);
  transition: .2s;
}

input:focus,
input:active {
  filter: brightness(0.9);
  transition: .2s;
}

.suggestions {
  background: var(--primary-background-color);
  color: var(--primary-font-color);
  position: absolute;
  width: 100%;
  height: 170px;
  overflow: scroll;
}

.suggestions div {
  padding: 5px 10px;
  transition: .2s;
}

.suggestions div:hover {
  padding: 5px 11px;
  background: var(--primary-background-color);
  filter: brightness(0.9);
  transition: .2s;
}
</style>