<script lang="ts" setup>
import ButtonSecondary from "@Veil/components/Base/ButtonSecondary.vue";
import Icon from "@Veil/components/Base/Icon.vue";
import ButtonPrimary from "@Veil/components/Base/ButtonPrimary.vue";

</script>

<template>

  <!-- TOAST Sending Email -->
  <a class="primarycolor" v-if="false">
    <Icon name="sent" color="blue" class="toast-icon" />
    Sending email...
    <ButtonPrimary>Undo</ButtonPrimary>
  </a>

  <!-- TOAST Email Sent -->
  <a class="primarycolor" v-if="true">
    <Icon name="check" color="blue" class="toast-icon" />
    Email sent
  </a>

  <!-- TOAST Invite Sent -->
  <a class="primarycolor" v-if="false">
    <Icon name="invite" color="blue" class="toast-icon" />
    Sending invite...
    <ButtonPrimary>Undo</ButtonPrimary>
  </a>

  <!-- TOAST Connection Lost -->
  <a class="red" v-if="false">
    <Icon name="no-internet" color="red" class="toast-icon" />
    We're having trouble connecting to the internet.
  </a>

  <!-- TOAST IMAP Error -->
  <a class="red" v-if="false">
    <Icon name="no-internet" color="red" class="toast-icon" />
    We're having issues connecting to your mail provider.
  </a>

  <!-- TOAST Send Email Error -->
  <a class="red" v-if="false">
    <Icon name="no-internet" color="red" class="toast-icon" />
    We were unable to send your message due to network issues
  </a>

  <!-- TOAST Board Creation Suggestion -->
  <a class="bodycolor" v-if="false">
    <Icon name="board" color="normal" class="toast-icon" />
    Looks like you receive a lot of Travel emails.
    <ButtonPrimary>Create Travel board</ButtonPrimary>
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
  color: var(--primary-font-color);
  white-space: nowrap;
}

.toast-icon {
  height: 17px;
  margin-top: -3px;
}
</style>