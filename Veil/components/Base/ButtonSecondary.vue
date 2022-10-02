<script lang="ts" setup>
defineProps({
  text: {
    type: String,
    required: false
  },
  enabled: {
    type: Boolean,
    required: false
  },
  href: {
    type: String,
    required: false
  }
})
</script>

<template>
  <a :class="enabled ? '' : 'disabled'" v-if="text != 'Trash all' && (href == '' || href == null)">{{text}}</a>
  <a :class="enabled ? '' : 'disabled'" v-if="href != '' || href != null" :href="href" target="_blank">{{text}}</a>
  <a :class="enabled ? '' : 'disabled'" v-if="text == 'Trash all'"><img src="@Veil/assets/icons/Home/trash.svg" />
    {{text}}</a>
</template>

<style scoped>
a {
  background-color: var(--secondary-background-color);
  border: 1px solid var(--secondary-background-color);
  color: var(--primary-color) !important;
  padding: 2px 5px;
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

img {
  width: 13px;
  padding: 0;
  margin-top: -3px;
}
</style>