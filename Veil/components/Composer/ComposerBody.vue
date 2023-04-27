<script lang="ts" setup>
import type Grimaldi from '@Veil/utils/grimaldi/editor';
import { EditorContent } from '@tiptap/vue-3'
//import composer.css css file
import '@Veil/assets/css/composer.css'
import '@Veil/assets/css/composer-exclude.css'

defineProps<{
  grimaldi: Grimaldi
}>()
</script>

<template>
  <div class="composer-body">
    <editor-content class="editor" placeholder="Message..." :editor="grimaldi.editor" />
  </div>
</template>

<style scoped>
.composer-body {
  height: calc(100% - 340px);
  width: 100%;
}

.editor,
.ProseMirror {
  width: 100%;
  height: 100%;
  overflow-y: scroll;
  cursor: text !important;
  outline: none;
  color: var(--strong-font-color);
  border-radius: 0;
  outline: none !important;
}

[contenteditable=true]:empty:before {
  content: attr(placeholder);
  color: var(--primary-font-color);
}

.ProseMirror:focus-visible {
  outline: none !important;
}

.editor:focus,
.editor:active {
  filter: brightness(0.9);
  transition: .1s;
}
</style>