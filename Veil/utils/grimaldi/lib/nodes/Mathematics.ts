import {
  Node,
  nodeInputRule,
  mergeAttributes,
} from '@tiptap/core'
import { nextTick } from 'vue'

export interface MathOptions {
  HTMLAttributes: Record<string, any>,
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    math: {
      /**
       * Add latex math
       */
      setMath: (latex: string) => ReturnType,
    }
  }
}

const MATH_INPUT_REGEX = /(?:\${2}\n)([^\$]+)(?:\n\${2})/

export const Mathematics = Node.create<MathOptions>({
  name: 'math',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  inline: true,
  draggable: true,
  group: 'inline',

  addAttributes() {
    return {
      formula: {
        default: null,
        parseHTML: el => el.getAttribute('data-formula'),
        renderHTML: attrs => ({
          'data-formula': attrs.formula ?? '?',
          title: attrs.formula ?? '?',
          alt: attrs.formula ?? '?'
        })
      },
      src: {
        default: "",
        parseHTML: el => el.getAttribute('src'),
        renderHTML: attrs => ({
          src: attrs.src || ("https://chart.googleapis.com/chart?cht=tx&chl=" + (attrs.formula ?? "?"))
        })
      },
      id: {
        default: String.random(12),
        parseHTML: el => el.getAttribute('data-math-id'),
        renderHTML: attrs => ({
          id: attrs.id ?? "",
        })
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'img[data-formula]',
      },
    ]
  },

  renderHTML({ HTMLAttributes, node }) {
    const id = node.attrs.id ?? String.random(12)
    const url = "https://chart.googleapis.com/chart?cht=tx&chl=" + (node.attrs.formula ?? "?")
    window.downloadAndFillImage(url, id, undefined, nextTick)
    // TODO: initial src should be set to a loading indicator
    return [
      'img',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
    ]
  },

  addCommands() {
    return {
      setMath: formula => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: { formula, },
        })
      },
    }
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: MATH_INPUT_REGEX,
        type: this.type,
        getAttributes: match => {
          const [, formula] = match

          return { formula }
        },
      }),
    ]
  },
})