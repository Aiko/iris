<script lang="ts" setup>
import { ref } from '@vue/reactivity';
import Icon from "@Veil/components/Base/Icon.vue";
import ButtonSecondary from "@Veil/components/Base/ButtonSecondary.vue";
import ButtonPrimary from "@Veil/components/Base/ButtonPrimary.vue";
import { RosettaStone, i18n } from "@Veil/utils/rosetta/rosetta";


// Show IMAP Manual entry pane
let isIMAPInputShowing = ref(false)
const toggleIMAPInputShowing = () => isIMAPInputShowing.value = !(isIMAPInputShowing.value)

</script>

<template>
  <div :class="{
    'modal-add-mailbox': true,
    'imap-open': isIMAPInputShowing
  }">
    <div v-if="!isIMAPInputShowing">
      <Icon name="mail" color="blue" />
      <h1>{{ i18n(RosettaStone.modals.add_mailbox.title) }}</h1>
      <p>{{ i18n(RosettaStone.modals.add_mailbox.subtitle1) }}</p>
      <a><img src="@Veil/assets/img/google.png"></a>
      <a><img src="@Veil/assets/img/outlook.png"></a>
      <a><img src="@Veil/assets/img/exchange.png"></a>
      <ButtonSecondary class="mt-4" @click="toggleIMAPInputShowing()">Enter details manually (IMAP)</ButtonSecondary>
    </div>
    <div class="imap" v-if="isIMAPInputShowing">
      <Icon name="mail" color="blue" />
      <h1>{{ i18n(RosettaStone.modals.add_mailbox.title) }}</h1>
      <p>{{ i18n(RosettaStone.modals.add_mailbox.subtitle2) }}</p>
      <input :placeholder="i18n(RosettaStone.modals.add_mailbox.form.email)" />
      <input :placeholder="i18n(RosettaStone.modals.add_mailbox.form.password)" />
      <input :placeholder="i18n(RosettaStone.modals.add_mailbox.form.imap_host)" />
      <input :placeholder="i18n(RosettaStone.modals.add_mailbox.form.imap_port)" value="993" />
      <input :placeholder="i18n(RosettaStone.modals.add_mailbox.form.smtp_host)" />
      <input :placeholder="i18n(RosettaStone.modals.add_mailbox.form.smtp_port)" value="587" />
      <div class="buttons">
        <ButtonSecondary @click="toggleIMAPInputShowing()">{{ i18n(RosettaStone.modals.add_mailbox.form.back) }}
        </ButtonSecondary>
        <ButtonPrimary>{{ i18n(RosettaStone.modals.add_mailbox.form.add_mailbox) }}</ButtonPrimary>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-add-mailbox {
  width: 100%;
  height: 100%;
  text-align: center;
  padding: 20px;
}

.imap-open {
  height: 570px;
}

.imap {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  background: var(--im-background-color);
  text-align: center;
  padding: 20px;
  border-radius: var(--primary-border-radius);
}

.imap .buttons {
  display: inline-flex;
  width: 100%;
  height: 30px;
  margin-top: 15px;
}

.imap .buttons a {
  width: 40%;
  margin: 0;
}

.imap .buttons a:first-of-type {
  margin-right: 20%;
  padding-top: 4px;
}

input {
  width: 100%;
  border-radius: var(--primary-border-radius);
  font-size: 16px;
  margin-top: 10px;
  margin-bottom: 10px;
  color: var(--strong-font-color);
  background: var(--secondary-background-color);
  cursor: text !important;
  padding: 8px 10px;
}

.modal-add-mailbox a img {
  width: 100%;
  border-radius: var(--primary-border-radius);
  overflow: hidden;
  max-width: 210px;
  display: block;
  margin: auto;
}

.modal-add-mailbox a {
  margin-top: 10px;
  display: block;
}

.modal-add-mailbox img {
  width: 40px;
  margin-bottom: 10px;
  margin-top: 10px;
}

h1 {
  font-size: 16px;
  margin-top: 0px;
}
</style>