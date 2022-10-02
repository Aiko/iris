<script lang="ts" setup>
import Search from "@Veil/components/Header/Search.vue";
import HeaderRight from "@Veil/components/Header/HeaderRight.vue";

</script>

<template>
  <div class="header">
    <Search />
    <HeaderRight />
  </div>
</template>

<style scoped>
.header {
  height: 50px;
  width: 100%;
  box-shadow: var(--header-shadow);
  border-left: 2px solid var(--secondary-background-color);
  padding: 10px 10px 10px 20px;
  display: inline-flex;
  background: var(--secondary-background-color);
  -webkit-touch-callout: none;
  /* iOS Safari */
  -webkit-user-select: none;
  /* Safari */
  -khtml-user-select: none;
  /* Konqueror HTML */
  -moz-user-select: none;
  /* Old versions of Firefox */
  -ms-user-select: none;
  /* Internet Explorer/Edge */
  user-select: none;
}
</style>