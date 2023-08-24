<script lang="ts" setup>
import { ref } from "vue";
import Icon from "@Veil/components/Base/Icon.vue";

const props = defineProps<{
  search?: boolean;
}>()

let isSearchOpen = ref(false);
const toggleSearch = () => (isSearchOpen.value = !isSearchOpen.value);

</script>

<template>
  <div class="filter-label">
    <div class="filter-label-text">
      <slot></slot>
    </div>
    <Icon name="search" color="normal" class="filter-search-icon" @click="toggleSearch" v-if="!isSearchOpen && search" />
    <Icon name="x" color="normal" class="filter-search-icon" @click="toggleSearch" v-if="isSearchOpen" />
    <div contenteditable="true" placeholder="Search" class="filter-search" v-if="isSearchOpen"></div>
  </div>
</template>

<style lang="scss" scoped>
.filter-label {
  margin-bottom: 5px;
  width: 100%;
}

.filter-label-text {
  text-transform: uppercase;
  width: fit-content;
  display: inline-block;
  color: var(--primary-font-color);
  font-weight: 500;
  font-size: 11px !important;
}

.filter-search-icon {
  float: right;
  display: inline-block;
  cursor: pointer;
  opacity: .6;
  padding: 4px;
  width: 23px;
  margin-top: 2px;
  margin-right: -5px;
  transition: .2s;
}

.filter-search-icon:hover {
  opacity: 1;
  transition: .2s;
}

[contenteditable=true]:empty:not(:focus):before {
  content: attr(placeholder);
  color: var(--primary-font-color);
  opacity: .6;
}

.filter-search {
  width: 100%;
  margin-top: 3px;
  margin-bottom: 10px;
  text-align: left;
  color: var(--primary-font-color);
  font-size: 13px;
  transition: .2s;
  border: 1px solid var(--primary-background-color);
  background-color: var(--primary-background-color);
  border-radius: var(--primary-border-radius);
  padding: 3px 7px;
  white-space: nowrap;
  overflow: scroll;
  cursor: text;
  outline: none;
  opacity: .8;
}

.filter-search:hover {
  opacity: 1;
  transition: .2s;
}
</style>
