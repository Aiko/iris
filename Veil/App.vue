<script lang="ts" setup>
import Sidebar from "@Veil/components/Sidebar/Sidebar.vue";
import Main from "@Veil/components/Base/Main.vue";
import LoaderScreen from "@Veil/components/Base/LoaderScreen.vue";
</script>

<template>
  <!--Full Screen Loader-->
  <LoaderScreen v-if="false" />

  <!--Sidebar-->
  <Sidebar />

  <!--Main content right of sidebar-->
  <Main />
</template>