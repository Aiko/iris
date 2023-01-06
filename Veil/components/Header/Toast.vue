<script lang="ts" setup>
import ButtonSecondary from "@Veil/components/Base/ButtonSecondary.vue";
import Icon from "@Veil/components/Base/Icon.vue";
import ButtonPrimary from "@Veil/components/Base/ButtonPrimary.vue";
import Animation from "@Veil/components/Base/Animation.vue";
import Loader from "@Veil/components/Base/Loader.vue";
import { scribeVoiceState, ScribeVoiceState } from "@Veil/utils/whisper/whisper"

const hideScribeVoice = () => (scribeVoiceState.value = ScribeVoiceState.Hidden)

</script>

<template>

  <!-- TOAST Sending Email -->
  <a class="primarycolor" v-if="false">
    <Animation name="sending" loop class="lot" />
    Sending email...
    <ButtonPrimary>Undo</ButtonPrimary>
  </a>

  <!-- VOICE STATE WHEN CLICKED -->
  <a class="voice-comp primarycolor" v-if="scribeVoiceState == ScribeVoiceState.Idle">
    <Icon name="start-record" class="start-recording" />
    Start speaking
    <ButtonSecondary @click="hideScribeVoice" class="opacity-08">Cancel</ButtonSecondary>
  </a>

  <!-- VOICE STATE WHEN SPEAKING -->
  <a class="voice-comp primarycolor" v-if="scribeVoiceState == ScribeVoiceState.Recording">
    <Animation name="record" loop class="record" />
    Start speaking
    <ButtonSecondary @click="hideScribeVoice" class="opacity-08">Cancel</ButtonSecondary>
  </a>

  <!-- VOICE STATE WHEN TRANSCRIBING -->
  <a class="voice-comp primarycolor" v-if="scribeVoiceState == ScribeVoiceState.Transcribing">
    <Loader class="writing" />
    Transcribing
    <ButtonSecondary @click="hideScribeVoice" class="opacity-08">Cancel</ButtonSecondary>
  </a>

  <!-- VOICE STATE WHEN TRANSCRIBING -->
  <a class="voice-comp primarycolor" v-if="scribeVoiceState == ScribeVoiceState.Generating">
    <Animation name="writing" loop class="record" />
    Writing email
    <ButtonSecondary @click="hideScribeVoice" class="opacity-08">Cancel</ButtonSecondary>
  </a>

  <!-- TOAST Email Sent -->
  <a class="primarycolor primarycolor" v-if="false">
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

.writing {
  margin-bottom: -5px;
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

.start-recording {
  height: 13px;
  width: auto;
}

.record {
  width: 60px;
  height: auto;
  display: inline-block;
  margin-top: -20px;
  margin-right: -5px;
}

.opacity-08 {
  opacity: .8;
}

.sent {
  width: 50px;
  margin-left: -45px;
  margin-top: -12px;
}

.voice-comp a {
  opacity: 0;
  transition: .2s;
}

.voice-comp:hover a {
  opacity: 1;
  transition: .2s;
}
</style>