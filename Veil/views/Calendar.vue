<script lang="ts" setup>
import CalSidebar from '@Veil/components/Calendar/CalSidebar.vue'
import FullCalendar from '@Veil/components/Calendar/FullCalendar.vue'
</script>

<template>
  <CalSidebar />
  <FullCalendar class="cal-main" />
</template>


<style lang="scss" scoped>
.cal-main {
  width: calc(100% - 159px);
  height: 100%;
  overflow: hidden;
  margin-left: -1px;
}
</style>
