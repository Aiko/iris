<script lang="ts" setup>
import Icon from "@Veil/components/Base/Icon.vue";
import ButtonSecondary from "@Veil/components/Base/ButtonSecondary.vue";
import ButtonPrimary from "@Veil/components/Base/ButtonPrimary.vue";
import { RosettaStone, i18n } from "@Veil/utils/rosetta/rosetta";
defineProps<{
  feature?: string
}>()
</script>

<template>
  <div class="modal-upgrade">
    <img src="@Veil/assets/img/upgrade.svg">
    <h1>{{ i18n(RosettaStone.modals.upgrade.title) }}</h1>
    <p>{{ feature }} {{ i18n(RosettaStone.modals.upgrade.text) }}
    </p>

    <div class="modal-bottom">
      <ButtonPrimary class="ml-2">{{ i18n(RosettaStone.modals.upgrade.btn) }} {{ feature }}</ButtonPrimary>
    </div>
  </div>
</template>

<style scoped>
.modal-upgrade {
  width: 100%;
  height: 100%;
  text-align: center;
  padding: 40px 20px;
}

.modal-bottom a {
  position: absolute !important;
  bottom: 0 !important;
  width: calc(100% - 14px) !important;
  left: 0 !important;
  margin: 12px 7px 7px 7px !important;
  padding: 4px;
}

span {
  color: var(--strong-font-color);
}

img {
  width: 100%;
  max-width: 200px;
}

a {
  padding: 10px 15px;
}

p {
  margin-bottom: 30px;
}

p a {
  margin: 0;
  padding: 0;
  color: var(--primary-color) !important;
}

h1 {
  font-size: 16px;
  margin-top: 20px;
}
</style>