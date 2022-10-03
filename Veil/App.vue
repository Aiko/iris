<script lang="ts" setup>
import Sidebar from "@Veil/components/Sidebar/Sidebar.vue";
import Main from "@Veil/components/Base/Main.vue";
import LoaderScreen from "@Veil/components/Base/LoaderScreen.vue";
import ControlBar from "@Veil/components/Base/ControlBar.vue";
import { isFullScreen } from '@Veil/state/UI'
</script>

<template>
  <!--Full Screen Loader-->
  <LoaderScreen v-if="false" />

  <!-- Control Bar-->
  <ControlBar v-if="!isFullScreen" />

  <!--Sidebar-->
  <Sidebar />

  <!--Main content right of sidebar-->
  <Main />
</template>