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
  position: relative;
  height: 50px;
  width: 100%;
  padding: 10px 10px 10px 20px;
  display: inline-flex;
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

@media screen and (prefers-color-scheme: light) {
  .header {
    padding: 0px 10px 10px 20px;
  }
}
</style>