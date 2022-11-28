<script lang="ts" setup>
import CheckAnimation from '@Veil/assets/animations/check.json'
import FailureAnimation from '@Veil/assets/animations/failure.json'
import LoadingAnimation from '@Veil/assets/animations/loading.json'
import NotificationAnimation from '@Veil/assets/animations/notification.json'
import PowerAnimation from '@Veil/assets/animations/power.json'
import SettingsAnimation from '@Veil/assets/animations/settings.json'
import WalletAnimation from '@Veil/assets/animations/wallet.json'
import { computed } from "@vue/reactivity"

const animations = {
  "check": CheckAnimation,
  "failure": FailureAnimation,
  "loading": LoadingAnimation,
  "notification": NotificationAnimation,
  "power": PowerAnimation,
  "settings": SettingsAnimation,
  "wallet": WalletAnimation,
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
  <lottie-animation :animationData="animation" :loop="loop ?? true" :autoPlay="true" :speed="1" class="icon" />
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
