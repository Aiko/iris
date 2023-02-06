<script lang="ts" setup>
import Icon from "@Veil/components/Base/Icon.vue";
import ButtonSecondary from "@Veil/components/Base/ButtonSecondary.vue";
import ButtonPrimary from "@Veil/components/Base/ButtonPrimary.vue";
import { RosettaStone, i18n } from "@Veil/utils/rosetta/rosetta";
</script>

<template>
  <div class="modal-add-board">
    <Icon name="board" color="blue" />
    <h1>
      {{ i18n(RosettaStone.modals.add_board.title) }}
    </h1>
    <input placeholder="Board name" autofocus />
    <p>
      {{ i18n(RosettaStone.modals.add_board.subtitle) }}
    </p>
    <div class="modal-bottom">
      <ButtonPrimary class="ml-2">{{ i18n(RosettaStone.modals.add_board.btn) }}</ButtonPrimary>
    </div>
  </div>
</template>

<style scoped>
.modal-add-board {
  width: 100%;
  height: 100%;
  text-align: center;
  padding: 20px 20px 50px 20px;
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

input {
  width: 100%;
  max-width: 250px;
  border-radius: var(--primary-border-radius);
  font-size: 16px;
  margin-top: 10px;
  margin-bottom: 10px;
  color: var(--strong-font-color);
  background: var(--secondary-background-color);
  cursor: text !important;
  padding: 8px 10px;
}

p {
  margin-bottom: 50px;
}

a {
  position: absolute !important;
  bottom: 0 !important;
  width: calc(100% - 14px) !important;
  left: 0 !important;
  margin: 7px 7px !important;
}
</style>