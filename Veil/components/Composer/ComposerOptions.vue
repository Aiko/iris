<script lang="ts" setup>
import ButtonSecondary from "@Veil/components/Base/ButtonSecondary.vue";
import Icon from "../Base/Icon.vue";
</script>

<template>
  <div class="composer-options">
    <ButtonSecondary active>
      <Icon name="sidebar-collapse" color="normal" />
    </ButtonSecondary>
    <ButtonSecondary>
      <Icon name="sidebar-collapse" color="normal" />
    </ButtonSecondary>
    <ButtonSecondary>
      <Icon name="sidebar-collapse" color="normal" />
    </ButtonSecondary>
    <ButtonSecondary>
      <Icon name="sidebar-collapse" color="normal" />
    </ButtonSecondary>
    <ButtonSecondary>
      <Icon name="sidebar-collapse" color="normal" />
    </ButtonSecondary>
    <ButtonSecondary>
      <Icon name="sidebar-collapse" color="normal" />
    </ButtonSecondary>
    <ButtonSecondary>
      <Icon name="sidebar-collapse" color="normal" />
    </ButtonSecondary>
  </div>
</template>

<style scoped>
.composer-options {
  height: 60px;
  width: 100%;
  padding: 16px 10px 10px 10px;
  margin-left: 10px;
  height: 60px;
  width: calc(100% - 20px);
  border-radius: var(--primary-border-radius);
  background: var(--secondary-background-color);
  overflow-x: scroll;
  white-space: nowrap;
}

a {
  margin-right: 10px;
}
</style>