<script lang="ts" setup>
import ButtonSecondary from "@Veil/components/Base/ButtonSecondary.vue";
import Icon from "../Base/Icon.vue";
</script>

<template>
  <div class="composer-options">
    <ButtonSecondary active>
      <Icon name="bold" color="normal" />
    </ButtonSecondary>
    <ButtonSecondary>
      <Icon name="italic" color="normal" />
    </ButtonSecondary>
    <ButtonSecondary>
      <Icon name="underline" color="normal" />
    </ButtonSecondary>
    <ButtonSecondary>
      <Icon name="text-color" color="normal" />
    </ButtonSecondary>
    <ButtonSecondary>
      <Icon name="align-left" color="normal" />
    </ButtonSecondary>
    <ButtonSecondary>
      <Icon name="list-numbers" color="normal" />
    </ButtonSecondary>
    <ButtonSecondary>
      <Icon name="quote" color="normal" />
    </ButtonSecondary>
    <ButtonSecondary>
      <Icon name="code" color="normal" />
    </ButtonSecondary>
  </div>
</template>

<style scoped>
.composer-options {
  padding: 10px;
  margin-left: 10px;
  max-width: 100%;
  height: 50px;
  box-shadow: rgb(0 0 0 / 15%) 0px 0px 11px;
  width: fit-content;
  border-radius: var(--primary-border-radius);
  background: var(--secondary-background-color);
  position: relative;
  white-space: nowrap;
  overflow: scroll;
}

a {
  margin-right: 10px;
  opacity: .8;
  transition: .2s;
}

a:hover {
  border: 1px solid var(--primary-background-color);
  opacity: 1;
  transition: .2s;
}

.active {
  background-color: var(--primary-background-color) !important;
  border: 1px solid var(--primary-background-color) !important;
  opacity: 1;
  transition: .2s;
}
</style>