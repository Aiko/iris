<script lang="ts" setup>
defineProps({
  text: {
    type: String,
    required: false
  },
  enabled: {
    type: Boolean,
    required: false
  }
})
</script>

<template>
  <a :class="enabled ? '' : 'disabled'">{{text}}</a>
</template>

<style scoped>
a {
  background-color: var(--secondary-background-color);
  border: 1px solid var(--secondary-background-color);
  color: var(--primary-color) !important;
  padding: 10px 11px;
  border-radius: var(--primary-border-radius);
  font-size: var(--btn-font-size);
  font-weight: var(--btn-font-weight);
  white-space: nowrap;
  transition: .2s;
  display: inline-block;
  text-align: center;
}

a:hover {
  background-color: var(--main-background-color);
  border: 1px solid var(--primary-color);
  transition: .2s;
}

.disabled {
  pointer-events: none;
  cursor: default;
}

.icon {
  width: 22px;
}
</style>