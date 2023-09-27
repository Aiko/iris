<script lang="ts" setup>
import Icon from "@Veil/components/Base/Icon.vue";
import ButtonSecondary from "@Veil/components/Base/ButtonSecondary.vue";
import ButtonPrimary from "@Veil/components/Base/ButtonPrimary.vue";
import { RosettaStone, i18n } from "@Veil/utils/rosetta/rosetta";
</script>

<template>
  <div class="modal-share-board">
    <Icon name="users" color="normal" />
    <h1>{{ i18n(RosettaStone.modals.share_board.title) }}</h1>
    <p>{{ i18n(RosettaStone.modals.share_board.subtitle) }}</p>
    <div class="input">
      <input :placeholder="i18n(RosettaStone.modals.share_board.email_address)" autofocus />
      <ButtonPrimary>{{ i18n(RosettaStone.modals.share_board.add) }}</ButtonPrimary>
    </div>
    <p>{{ i18n(RosettaStone.modals.share_board.current) }}</p>
    <div class="current">
      <p>
        <Icon name="user" color="normal" />
        rubencharlestouitou@gmail.com
        <ButtonSecondary class="red">{{ i18n(RosettaStone.modals.share_board.remove) }}</ButtonSecondary>
      </p>
      <p>
        <Icon name="user" color="normal" />rubencharlestouitou@gmail.com
      </p>
    </div>
    <div class="modal-bottom">
      <ButtonPrimary class="submit">{{ i18n(RosettaStone.modals.share_board.done) }}</ButtonPrimary>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.modal-share-board {
  width: 100%;
  height: 100%;
  text-align: center;
  padding: 20px 20px 80px 20px;
  position: relative;
}

img {
  width: 40px;
  margin-bottom: 10px;
  margin-top: 10px;
}

h1 {
  font-size: 16px;

}

.input input {
  width: calc(100% - 80px);
  border-radius: var(--primary-border-radius);
  font-size: 16px;
  margin-top: 10px;
  margin-bottom: 10px;
  color: var(--strong-font-color);
  background: var(--secondary-background-color);
  cursor: text !important;
  padding: 8px 10px;
}

.input a {
  padding: 12px;
  margin-left: 10px;
}

p {
  margin-bottom: 50px;
}

p img {
  width: 25px;
  padding: 4px;
  background: var(--primary-background-color);
  border-radius: 50%;
  height: 25px;
  margin-right: 5px;
}

.submit {
  position: absolute !important;
  bottom: 0 !important;
  width: calc(100% - 40px) !important;
  left: 0 !important;
  margin: 19px 20px !important;
}

.current {
  text-align: left;
  width: 100%;
  max-height: 200px;
  overflow-y: scroll;
  padding: 11px;
  border-radius: var(--primary-border-radius);
  background: var(--primary-background-color);
  margin-top: 10px;
  margin-bottom: 5px;
}

.current a {
  margin-left: 5px;
}
</style>