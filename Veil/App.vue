<script lang="ts" setup>
import Sidebar from "@Veil/components/Sidebar/Sidebar.vue";
import Main from "@Veil/components/Base/Main.vue";
import LoaderScreen from "@Veil/components/Base/LoaderScreen.vue";
</script>

<template>
  <LoaderScreen v-if="false" />
  <Sidebar />
  <Main />
</template>