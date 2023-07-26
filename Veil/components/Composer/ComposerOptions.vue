<script lang="ts" setup>
import { ref } from '@vue/reactivity'
import ButtonSecondary from "@Veil/components/Base/ButtonSecondary.vue";
import Icon from "@Veil/components/Base/Icon.vue";
import { RosettaStone, i18n } from "@Veil/utils/rosetta/rosetta";

enum Option {
  Align,
  List,
  Color,
  None,
}

let selectedOption = ref(Option.None)


</script>

<template>
  <div class="composer-options">


    <!--All Options-->
    <ButtonSecondary active>
      <Icon name="bold" color="normal" />
    </ButtonSecondary>
    <ButtonSecondary>
      <Icon name="italic" color="normal" />
    </ButtonSecondary>
    <ButtonSecondary>
      <Icon name="underline" color="normal" />
    </ButtonSecondary>
    <ButtonSecondary @click="selectedOption = Option.Color">
      <Icon name="text-color" color="normal" />
    </ButtonSecondary>
    <ButtonSecondary @click="selectedOption = Option.Align">
      <Icon name="align-left" color="normal" />
    </ButtonSecondary>
    <ButtonSecondary @click="selectedOption = Option.List">
      <Icon name="list-numbers" color="normal" />
    </ButtonSecondary>
    <ButtonSecondary>
      <Icon name="quote" color="normal" />
    </ButtonSecondary>
    <ButtonSecondary>
      <Icon name="code" color="normal" />
    </ButtonSecondary>






    <!--Color Options-->
    <div class="expanded" v-if="selectedOption == Option.Color" @click="selectedOption = Option.None">
      <span>{{ i18n(RosettaStone.composer.font) }}</span>
      <ButtonSecondary class="square normal">
        <Icon name="text-color" color="white" />
      </ButtonSecondary>
      <ButtonSecondary class="square blue">
        <Icon name="text-color" color="white" />
      </ButtonSecondary>
      <ButtonSecondary class="square red">
        <Icon name="text-color" color="white" />
      </ButtonSecondary>
      <ButtonSecondary class="square green">
        <Icon name="text-color" color="white" />
      </ButtonSecondary>
    </div>

    <!--Align Options-->
    <div class="expanded" v-if="selectedOption == Option.Align" @click="selectedOption = Option.None">
      <span>{{ i18n(RosettaStone.composer.align) }}</span>
      <ButtonSecondary>
        <Icon name="align-left" color="normal" />
      </ButtonSecondary>
      <ButtonSecondary>
        <Icon name="align-center" color="normal" />
      </ButtonSecondary>
      <ButtonSecondary>
        <Icon name="align-right" color="normal" />
      </ButtonSecondary>
    </div>

    <!--List Options-->
    <div class="expanded" v-if="selectedOption == Option.List" @click="selectedOption = Option.None">
      <span>{{ i18n(RosettaStone.composer.list) }}</span>
      <ButtonSecondary>
        <Icon name="list-check" color="normal" />
      </ButtonSecondary>
      <ButtonSecondary>
        <Icon name="list-numbers" color="normal" />
      </ButtonSecondary>
      <ButtonSecondary>
        <Icon name="list" color="normal" />
      </ButtonSecondary>
    </div>

  </div>
</template>

<style lang="scss" scoped>
.composer-options {
  padding: 10px 0 10px 10px;
  margin-left: 10px;
  max-width: 100%;
  height: 50px;
  box-shadow: rgb(0 0 0 / 15%) 0px 0px 11px;
  width: fit-content;
  border-radius: var(--primary-border-radius);
  background: var(--secondary-background-color);
  position: relative;
  white-space: nowrap;
  overflow-x: scroll;
  overflow: visible;
}

a {
  margin-right: 10px;
  opacity: .8;
  border: 1px solid transparent;
  transition: .1s;
}

a:hover {
  border: 1px solid var(--primary-background-color);
  background-color: var(--primary-background-color) !important;
  opacity: 1;
  transition: .1s;
}

.active {
  background-color: var(--primary-background-color) !important;
  border: 1px solid var(--primary-background-color) !important;
  opacity: 1;
  transition: .1s;
}

.expanded {
  position: absolute;
  top: 0;
  z-index: 1;
  width: 100%;
  display: inline-flex;
  padding: 10px;
  background: var(--s-opaque);
  max-width: 100%;
  height: 50px;
  box-shadow: rgb(0 0 0 / 15%) 0px 0px 11px;
  border-radius: var(--primary-border-radius);
  overflow: hidden;
  text-align: center;
  left: 0;
  transition: .1s;
}

.expanded span {
  padding-top: 3px;
  color: var(--primary-font-color) !important;
  margin-right: 15px;
}

.square {
  width: 36px;
  height: 30px;
  border: 1px solid var(--primary-background-color);
}


.square.normal {
  background: var(--primary-font-color) !important;
}

.square.black {
  background: #000 !important;
}

.square.blue {
  background: #0079d3 !important;
}

.square.red {
  background: #ff0000 !important;
}

.square.green {
  background: #00ff00 !important;
}
</style>