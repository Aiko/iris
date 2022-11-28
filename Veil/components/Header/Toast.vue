<script lang="ts" setup>
import ButtonSecondary from "@Veil/components/Base/ButtonSecondary.vue";
import Icon from "@Veil/components/Base/Icon.vue";
import ButtonPrimary from "@Veil/components/Base/ButtonPrimary.vue";
import Animation from "@Veil/components/Base/Animation.vue";
</script>

<template>

  <!-- TOAST Sending Email -->
  <a class="primarycolor" v-if="false">
    <Animation name="sending" loop class="lot" />
    Sending email...
    <ButtonPrimary>Undo</ButtonPrimary>
  </a>

  <!-- TOAST Email Sent -->
  <a class="primarycolor" v-if="true">
    <Animation name="sent" loop class="lot sent" />
    Email sent
  </a>

  <!-- TOAST Invite Sending -->
  <a class="primarycolor" v-if="false">
    <Animation name="invite" loop class="lot lb" />
    Sending invite...
    <ButtonPrimary>Undo</ButtonPrimary>
  </a>

  <!-- TOAST Invite Sent -->
  <a class="primarycolor" v-if="false">
    <Animation name="sent" loop class="lot sent" />
    Invite sent
  </a>

  <!-- TOAST Connection Lost -->
  <a class="red" v-if="false">
    <Animation name="internet" loop class="lot lc" />
    We're having trouble connecting to the internet.
  </a>

  <!-- TOAST IMAP Error -->
  <a class="red" v-if="false">
    <Animation name="internet" loop class="lot lc" />
    We're having issues connecting to your mail provider.
  </a>

  <!-- TOAST Send Email Error -->
  <a class="red" v-if="false">
    <Animation name="internet" loop class="lot lc" />
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

.lot {
  width: 20px;
  display: inline-flex;
  color: #ddd;
  margin-bottom: -2px;
  position: absolute;
  left: 0;
  top: 0;
  margin-left: -20px;
  margin-top: 2px;
}

.lb {
  width: 30px;
  margin-left: -28px;
  margin-top: -1px;
}

.lc {
  width: 60px;
  margin-left: -40px;
  margin-top: -17px;
}

.sent {
  width: 50px;
  margin-left: -45px;
  margin-top: -12px;
}
</style>