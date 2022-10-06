<script lang="ts" setup>
import ButtonSecondary from "@Veil/components/Base/ButtonSecondary.vue";
import Icon from "@Veil/components/Base/Icon.vue";
import ButtonPrimary from "@Veil/components/Base/ButtonPrimary.vue";

</script>

<template>

  <!-- TOAST Sending Email -->
  <a class="primarycolor" v-if="false">
    <Icon name="sent" color="blue" />
    Sending email...
    <ButtonPrimary>Undo</ButtonPrimary>
  </a>

  <!-- TOAST Invite Sent -->
  <a class="primarycolor" v-if="false">
    <Icon name="invite" color="blue" />
    Sending invite...
    <ButtonPrimary>Undo</ButtonPrimary>
  </a>

  <!-- TOAST Connection Lost -->
  <a class="red" v-if="false">
    <Icon name="no-internet" color="red" />
    We're having trouble connecting to the internet.
  </a>

  <!-- TOAST IMAP Error -->
  <a class="red" v-if="false">
    <Icon name="no-internet" color="red" />
    We're having issues connecting to your mail provider.
  </a>

  <!-- TOAST Send Email Error -->
  <a class="red" v-if="false">
    <Icon name="no-internet" color="red" />
    We were unable to send your message due to network issues
  </a>

</template>

<style scoped>
img {
  width: 20px;
  margin-right: 5px;
}

a {
  margin-left: 5px;
  font-weight: 500;
}
</style>