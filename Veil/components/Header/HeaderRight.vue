<script lang="ts" setup>
import ButtonSecondary from "@Veil/components/Base/ButtonSecondary.vue";
import Toast from "./Toast.vue";

</script>

<template>
  <div class="header-buttons">
    <Toast />
    <a><img src="@Veil/assets/icons/Header/calendar.svg" class="icon" /></a>
    <a><img src="@Veil/assets/icons/Header/settings.svg" class="icon" /></a>
  </div>
</template>

<style scoped>
.header-buttons {
  position: absolute;
  right: 0;
  padding-right: 15px;
}

.header-buttons a {
  background: var(--primary-background-color);
  padding: 2px 5px 7px 5px;
  border-radius: var(--primary-border-radius);
  margin-left: 10px;
}

.header-buttons img {
  width: 20px;
}
</style>