<script lang="ts" setup>
const props = defineProps<{
  placeholder?: string;
}>()

const placeholder = props.placeholder || 'Search'

</script>


<template>
  <div contenteditable="true" :placeholder="placeholder" class="filter-input" />
</template>

<style lang="scss" scoped>
.filter-input {
  width: 100%;
  margin-top: 1px;
  text-align: left;
  color: var(--primary-font-color);
  font-size: 13px;
  transition: .2s;
  height: 30px;
  background-color: var(--primary-background-color);
  border-radius: var(--primary-border-radius);
  border: 1px solid var(--secondary-background-color-hover);
  padding: 4px 7px;
  white-space: nowrap;
  overflow: scroll;
  cursor: text;
  outline: none;
  opacity: .8;
}

.filter-input:hover {
  opacity: 1;
  transition: .2s;
}

[contenteditable=true]:empty:not(:focus):before {
  content: attr(placeholder);
  color: var(--primary-font-color);
  opacity: .6;
}
</style>
