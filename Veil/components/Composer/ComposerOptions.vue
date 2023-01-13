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
  width: 100%;
  padding: 10px;
  margin-left: 10px;
  height: 50px;
  width: calc(100% - 20px);
  border-radius: var(--primary-border-radius);
  background: var(--secondary-background-color);
  overflow-x: scroll;
  white-space: nowrap;
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