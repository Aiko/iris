<script lang="ts" setup>
import Sidebar from "@Veil/components/Sidebar/Sidebar.vue";
import Main from "@Veil/components/Base/Main.vue";
import LoaderScreen from "@Veil/components/Base/LoaderScreen.vue";
import ControlBar from "@Veil/components/Base/ControlBar.vue";
import { isFullScreen } from '@Veil/state/sections'
import { isLoading } from '@Veil/state/sections'

</script>

<template>
  <!--Full Screen Loader-->
  <LoaderScreen v-if="isLoading" />

  <!-- Control Bar-->
  <ControlBar v-if="!isFullScreen" />

  <!--Sidebar-->
  <Sidebar />

  <!--Main content right of sidebar-->
  <Main />
</template>