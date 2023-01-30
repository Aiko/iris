import { Mark, mergeAttributes, markInputRule } from '@tiptap/core'

console.warn("DEPRECATED: The Align mark is deprecated. Please use TextAlign from the official TipTap extension repo.")

export interface AlignOptions {
  HTMLAttributes: Record<string, any>,
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    align: {
      /**
       * Positional alignments
       */
      alignLeft: () => ReturnType,
      alignRight: () => ReturnType,
      alignCenter: () => ReturnType,
      /**
       * Unset alignment
       */
      unsetAlignment: () => ReturnType,
    }
  }
}

export const Align = Mark.create<AlignOptions>({

  name: 'align',

  defaultOptions: {
    HTMLAttributes: {}
  },

  addAttributes() {
    return {
      textAlign: {
        default: 'unset',
        parseHTML: el => el.style.textAlign,
        renderHTML: attrs => ({
          style: `text-align: ${attrs.textAlign}; display: block;`
        })
      },
    }
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)]
  },

  addCommands() {
    return {
      unsetAlignment: () => ({ commands }) => {
        return commands.setMark('align', {textAlign: 'unset'})
      },
      alignLeft: () => ({ commands }) => {
        return commands.setMark('align', {textAlign: 'left'})
      },
      alignRight: () => ({ commands }) => {
        return commands.setMark('align', {textAlign: 'right'})
      },
      alignCenter: () => ({ commands }) => {
        return commands.setMark('align', {textAlign: 'center'})
      },
    }
  },

  addInputRules() {
    return [
      markInputRule({
        find: /(?:\*\*|__)([^*_]+)(?:\*\*|__)$/,
        type: this.type
      })
    ]
  }

})
