<script lang="ts" setup>
</script>

<template>
  <div class="composer-body">
    <div contenteditable="true" class="textarea" placeholder="Message" />
  </div>
</template>

<style scoped>
.composer-body {
  height: calc(100% - 330px);
  width: 100%;
}

.textarea {
  padding: 10px;
  background: var(--primary-background-color);
  width: 100%;
  height: 100%;
  overflow-y: scroll;
  cursor: text !important;
  outline: none;
  color: var(--strong-font-color);
  border-radius: 0;
}

[contentEditable=true]:empty:before {
  content: attr(placeholder);
  color: var(--primary-font-color);

}

textarea:focus,
textarea:active {
  filter: brightness(0.9);
  transition: .2s;
}
</style>