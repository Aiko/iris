<script lang="ts" setup>
import CheckAnimation from '@Veil/assets/animations/check.json'
import FailureAnimation from '@Veil/assets/animations/failure.json'
import LoadingAnimation from '@Veil/assets/animations/loading.json'
import SendingAnimation from '@Veil/assets/animations/sending.json'
import InternetAnimation from '@Veil/assets/animations/internet.json'
import SentAnimation from '@Veil/assets/animations/sent.json'
import InviteAnimation from '@Veil/assets/animations/invite.json'
import NotificationAnimation from '@Veil/assets/animations/notification.json'
import PowerAnimation from '@Veil/assets/animations/power.json'
import SettingsAnimation from '@Veil/assets/animations/settings.json'
import WalletAnimation from '@Veil/assets/animations/wallet.json'
import WaveAnimation from '@Veil/assets/animations/Wave.json'
import RecordAnimation from '@Veil/assets/animations/Record.json'
import WritingAnimation from '@Veil/assets/animations/Writing.json'
import { computed } from "@vue/reactivity"

const animations = {
  "check": CheckAnimation,
  "failure": FailureAnimation,
  "internet": InternetAnimation,
  "sent": SentAnimation,
  "invite": InviteAnimation,
  "loading": LoadingAnimation,
  "sending": SendingAnimation,
  "notification": NotificationAnimation,
  "power": PowerAnimation,
  "settings": SettingsAnimation,
  "wallet": WalletAnimation,
  "wave": WaveAnimation,
  "record": RecordAnimation,
  "writing": WritingAnimation
}

const props = defineProps<{
  name?: string;
  loop?: boolean
}>()

const animation = computed(() => {
  // @ts-ignore
  return (props.name) ? animations[props.name] : {}
})
</script>

<template>
  <lottie-animation :animationData="animation" :loop="loop ?? true" :autoPlay="true" :speed="1" />
</template>

<style scoped>
img {
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -o-user-select: none;
  user-select: none;
}
</style>
