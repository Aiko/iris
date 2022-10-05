<script lang="ts" setup>
import Board from "@Veil/components/Home/Board.vue";
import AddBoard from "@Veil/components/Home/AddBoard.vue";
import SideEmail from "@Veil/components/Home/SideEmail.vue";
import Icon from '@Veil/components/Base/Icon.vue';
import ComposerField from '@Veil/components/Composer/ComposerField.vue';
import ComposerBody from '@Veil/components/Composer/ComposerBody.vue';
import ComposerOptions from '@Veil/components/Composer/ComposerOptions.vue';
import ButtonSecondary from '@Veil/components/Base/ButtonSecondary.vue';
import ButtonPrimary from '@Veil/components/Base/ButtonPrimary.vue';
</script>

<template>
  <div class="composer">
    <div class="left">
      <ComposerField placeholder="To" />
      <ComposerField placeholder="CC" />
      <ComposerField placeholder="BCC" />
      <ComposerField placeholder="From" />
      <ComposerField placeholder="Subject" />
      <ComposerBody />
      <ComposerOptions />
    </div>
    <div class="right">

    </div>
    <div class="bottom">
      <ButtonSecondary>Save as draft</ButtonSecondary>
      <ButtonPrimary>Send</ButtonPrimary>
    </div>
  </div>
</template>

<style scoped>
.composer {
  width: 100%;
  overflow: hidden;
  height: 100%;
  display: inline-flex;
}

.left {
  width: 100%;
}
</style>