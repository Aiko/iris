import {
  Node,
  nodeInputRule,
  mergeAttributes,
} from '@tiptap/core'
export interface EmojiOptions {
  HTMLAttributes: Record<string, any>,
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    emoji: {
      /**
       * Add an emoji
       */
      setEmoji: (emoji: string) => ReturnType,
    }
  }
}

const EMOJI_INPUT_REGEX = /(?:\:)([A-z0-9\-]+)(?:\:)/

import EmojiConvertor from 'emoji-js'
const Moji = new EmojiConvertor()
Moji.replace_mode = 'unified'
Moji.allow_native = true
Moji.allow_caps = true

export const Emoji = Node.create<EmojiOptions>({
  name: 'emoji',

  defaultOptions: {
    HTMLAttributes: {},
  },

  inline: true,
  draggable: true,
  group: 'inline',

  addAttributes() {
    return {
      emoji: {
        default: null,
        parseHTML: el => el.innerText || el.getAttribute('data-emoji'),
        renderHTML: attrs => ({
          'data-emoji': attrs.emoji || '?'
        })
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-emoji]',
      },
    ]
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      Moji.replace_colons(':' + node.attrs.emoji + ':')
    ]
  },

  addCommands() {
    return {
      setEmoji: emoji => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: { emoji, },
        })
      },
    }
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: EMOJI_INPUT_REGEX,
        type: this.type,
        getAttributes: match => {
          const [, emoji] = match

          return { emoji }
        },
      }),
    ]
  },
})