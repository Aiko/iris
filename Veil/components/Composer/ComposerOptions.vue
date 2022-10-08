<script lang="ts" setup>
import ButtonSecondary from "@Veil/components/Base/ButtonSecondary.vue";
import Icon from "../Base/Icon.vue";
</script>

<template>
  <div class="composer-options">
    <ButtonSecondary>
      <Icon name="close" color="normal" />
    </ButtonSecondary>
    <ButtonSecondary>
      <Icon name="close" color="normal" />
    </ButtonSecondary>
    <ButtonSecondary>
      <Icon name="close" color="normal" />
    </ButtonSecondary>
    <ButtonSecondary>
      <Icon name="close" color="normal" />
    </ButtonSecondary>
    <ButtonSecondary>
      <Icon name="close" color="normal" />
    </ButtonSecondary>
    <ButtonSecondary>
      <Icon name="close" color="normal" />
    </ButtonSecondary>
    <ButtonSecondary>
      <Icon name="close" color="normal" />
    </ButtonSecondary>
  </div>
</template>

<style scoped>
.composer-options {
  height: 60px;
  width: 100%;
  padding: 10px;
  background: var(--primary-background-color);
}

a {
  margin-right: 10px;
}
</style>