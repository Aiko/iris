<script lang="ts" setup>

</script>

<template>
  <img src="@Veil/assets/icons/Header/search.svg" alt="Search" class="icon" />
  <input type="text" placeholder="Search" />
  <p>Press ENTER to search</p>
</template>

<style scoped>
input {
  padding: 9px 11px 9px 5px;
  background: var(--secondary-background-color);
  border: none;
  width: 100%;
  cursor: text !important;
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