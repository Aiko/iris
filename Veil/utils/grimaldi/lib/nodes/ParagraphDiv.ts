import { Node, mergeAttributes } from '@tiptap/core'

export interface ParagraphOptions {
  HTMLAttributes: Record<string, any>,
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    paragraphDiv: {
      /**
       * Toggle a div-style paragraph
       */
      setParagraphDiv: () => ReturnType,
    }
  }
}

/** Like the default Paragraph Node, but with div */
export const ParagraphDiv = Node.create<ParagraphOptions>({
  name: 'paragraphdiv',

  priority: 1000,

  defaultOptions: {
    HTMLAttributes: {
      style: 'display: block;'
    },
  },

  group: 'block',
  draggable: false,
  content: '(paragraph|paragraphdiv)+',

  parseHTML() {
    return [
      { tag: 'div' }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
  },

  addCommands() {
    return {
      setParagraphDiv: () => ({ commands }) => {
        return commands.setNode('paragraphdiv')
      },
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Alt-0': () => this.editor.commands.setParagraphDiv(),
    }
  },
})
