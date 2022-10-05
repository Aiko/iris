<script lang="ts" setup>
import Icon from '@Veil/components/Base/Icon.vue'
</script>

<template>
  <div class="search">
    <Icon name="search" color="grey" />
    <input type="text" placeholder="Search" />
    <p>Press ENTER to search</p>
  </div>
</template>

<style scoped>
.search {
  display: inline-flex;
  width: 100%;
}

@media screen and (prefers-color-scheme: light) {
  .search {
    background: var(--primary-background-color);
    border-radius: var(--primary-border-radius);
    padding-left: 10px;
  }



  .search p {
    right: 0;
    margin-top: 17px;
    margin-left: 0;
    margin-right: 30px;
    z-index: 11;
  }
}

input {
  padding: 9px 11px 9px 5px;
  border: none;
  background-color: transparent;
  width: 100%;
  cursor: text !important;
  letter-spacing: .4px;
}

img {
  width: 20px;
}

input:focus+p,
input:active+p {
  opacity: 1;
  transition: .2s;
}

p {
  position: absolute;
  font-size: 11px;
  top: 0;
  margin: 0;
  margin-top: -3px;
  margin-left: 25px;
  transition: .2s;
  opacity: 0;
}
</style>