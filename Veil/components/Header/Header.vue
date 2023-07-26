<script lang="ts" setup>
import Search from "@Veil/components/Header/Search.vue";
import HeaderRight from "@Veil/components/Header/HeaderRight.vue";
import { infoContent } from '@Veil/state/sections'
import Icon from '@Veil/components/Base/Icon.vue'

</script>

<template>
  <div class="header">
    <p v-if="infoContent != ''" class="info-content">
      <Icon name="info" color="normal" />{{ infoContent }}
    </p>
    <Search />
    <HeaderRight />
  </div>
</template>

<style lang="scss" scoped>
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

.info-content {
  position: absolute;
  margin: auto;
  text-align: center;
  width: 100%;
  margin-top: 3px;
}

.info-content img {
  width: 16px;
  margin-right: 5px;
  margin-top: -1px;
}

.info-content p {
  text-align: center;
  margin: 0;
  margin: auto;
  opacity: .5;
  background: var(--secondary-background-color);
  padding: 1px 5px;
  border-radius: var(--primary-border-radius);
  white-space: nowrap;
  width: calc(100% - 140px);
  text-overflow: ellipsis;
  overflow: hidden;
}
</style>