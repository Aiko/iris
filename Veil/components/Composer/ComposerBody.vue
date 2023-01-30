<script lang="ts" setup>
import type Grimaldi from '@Veil/utils/grimaldi/editor';
import { EditorContent } from '@tiptap/vue-3'

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

.editor, .ProseMirror {
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
  transition: .2s;
}
</style>