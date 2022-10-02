<script lang="ts" setup>
import ButtonSecondary from "@Veil/components/Base/ButtonSecondary.vue";

</script>

<template>

  <!--TOAST No internet-->
  <a class="error" v-if="true"><img src="@Veil/assets/icons/Header/no-internet.svg" alt="Search" class="icon" /> We were
    unable to send your message due to network
    issues</a>

  <!--TOAST Email Sent-->
  <a v-if="false"><img src="@Veil/assets/icons/Header/sent.svg" alt="Search" class="icon" /> Email sent.
    <ButtonSecondary text="Undo" enabled />
  </a>

</template>

<style scoped>

</style>