const {
  updateMark,
  markInputRule,
  nodeInputRule,
  replaceText
} = tiptapBuild.tiptapCommands
const {
  Suggestions
} = tiptapBuild.tiptapExtensions
const {
  Mark,
  Node,
  Plugin
} = tiptapBuild.tiptap

class ParagraphDiv extends Node {
  get name() {
    return 'paragraph_div';
  }

  get schema() {
    return {
      content: '(paragraph|paragraph_div)+',
      draggable: false,
      group: 'block',
      parseDOM: [{
        tag: 'div',
      }],
      toDOM() {
        return ['div', {
            style: 'display: block;'
          }, 0
        ];
      },
    };
  }
}

class Align extends Mark {
  get name () {
    return 'align'
  }

  get defaultOptions () {
    return {
      textAlign: ['left', 'center', 'right']
    }
  }

  get schema () {
    return {
      attrs: {
        textAlign: {
          default: 'left'
        }
      },
      parseDOM: [{
        style: 'text-align',
        getAttrs: value => ({
          textAlign: value
        })
      }],
      toDOM: mark => ['span', {
        style: `text-align: ${mark.attrs.textAlign};display: block`
      }, 0]
    }
  }

  commands ({
    type
  }) {
    return attrs => updateMark(type, attrs)
  }

  inputRules ({
    type
  }) {
    return [
      markInputRule(/(?:\*\*|__)([^*_]+)(?:\*\*|__)$/, type)
    ]
  }
}

const IMAGE_INPUT_REGEX = /!\[(.+|:?)]\((\S+)(?:(?:\s+)["'](\S+)["'])?\)/

//* NOTE: this should REPLACE the Image extension
//* **DO NOT** i repeat **DO NOT** use them both at the same time !!
class PastableImage extends Node {
  get name () {
    return 'image'
  }

  get schema () {
    return {
      inline: true,
      attrs: {
        src: {},
        alt: {
          default: null
        },
        title: {
          default: null
        }
      },
      group: 'inline',
      draggable: true,
      parseDOM: [{
        tag: 'img[src]',
        getAttrs: dom => ({
          src: dom.getAttribute('src'),
          title: dom.getAttribute('title'),
          alt: dom.getAttribute('alt')
        })
      }],
      toDOM: node => ['img', node.attrs]
    }
  }

  commands ({
    type
  }) {
    return attrs => (state, dispatch) => {
      const {
        selection
      } = state
      const position = selection.$cursor ? selection.$cursor.pos : selection.$to.pos
      const node = type.create(attrs)
      const transaction = state.tr.insert(position, node)
      dispatch(transaction)
    }
  }

  inputRules ({
    type
  }) {
    return [
      nodeInputRule(IMAGE_INPUT_REGEX, type, match => {
        const [, alt, src, title] = match
        return {
          src,
          alt,
          title
        }
      })
    ]
  }

  get plugins () {
    return [
      new Plugin({
        props: {
          handleDOMEvents: {
            drop (view, event) {
              const hasFiles = event.dataTransfer &&
								event.dataTransfer.files &&
								event.dataTransfer.files.length

              if (!hasFiles) {
                return
              }

              const images = Array
                .from(event.dataTransfer.files)
                .filter(file => (/image/i).test(file.type))

              if (images.length === 0) {
                return
              }

              event.preventDefault()

              const {
                schema
              } = view.state
              const coordinates = view.posAtCoords({
                left: event.clientX,
                top: event.clientY
              })

              images.forEach(image => {
                const reader = new FileReader()

                reader.onload = readerEvent => {
                  const node = schema.nodes.image.create({
                    src: readerEvent.target.result
                  })
                  const transaction = view.state.tr.insert(coordinates.pos, node)
                  view.dispatch(transaction)
                }
                reader.readAsDataURL(image)
              })
            },
            paste (view, event) {
              let hasFiles = false
              const reader = new FileReader()
              reader.onload = function (event) {
                const imageUrl = event.target.result
                const node = view.state.schema.nodes.image.create({
                  src: imageUrl
                })
                const transaction = view.state.tr.replaceSelectionWith(node)
                view.dispatch(transaction)
              }
              Array.from(event.clipboardData.files)
                .filter(item => item.type.startsWith('image'))
                .forEach(item => {
                  reader.readAsDataURL(item)
                  hasFiles = true
                })
              if (hasFiles) {
                event.preventDefault()
                return true
              }
            }
          }
        }
      })
    ]
  }
}

const EMOJI_INPUT_REGEX = /(?:\:)([A-z0-9\-]+)(?:\:)/
//* NOTE: requires Emoji JS (from cdn)
const Moji = new EmojiConvertor()
Moji.replace_mode = 'unified'
Moji.allow_native = true

class Emoji extends Node {
  get name () {
    return 'emoji'
  }

  get schema () {
    return {
      inline: true,
      attrs: {
        emoji: {
          default: null
        }
      },
      group: 'inline',
      parseDOM: [{
        tag: 'span[data-emoji]',
        getAttrs: dom => ({
          emoji: dom.innerText
        })
      }],
      toDOM: node => ['span', {
        'data-emoji': node.attrs.emoji || '?'
      }, Moji.replace_colons(':' + node.attrs.emoji + ':')]
    }
  }

  commands ({
    type
  }) {
    return attrs => (state, dispatch) => {
      const {
        selection
      } = state
      const position = selection.$cursor ? selection.$cursor.pos : selection.$to.pos
      const node = type.create(attrs)
      const transaction = state.tr.insert(position, node)
      dispatch(transaction)
    }
  }

  inputRules ({
    type
  }) {
    return [
      nodeInputRule(EMOJI_INPUT_REGEX, type, match => {
        console.log(match)
        const [, emoji] = match
        return { emoji }
      })
    ]
  }
}

const MATH_INPUT_REGEX = /(?:\${1,2})([^\$]+)(?:\${1,2})/
class Mathematics extends Node {
  get name () {
    return 'math'
  }

  get schema () {
    return {
      inline: true,
      attrs: {
        formula: {
          default: null
        },
        src: {
          default: '',
        },
      },
      group: 'inline',
      parseDOM: [{
        tag: 'img[data-formula]',
        getAttrs: dom => ({
          formula: dom.getAttribute('data-formula'),
          src: dom.getAttribute('src'),
        })
      }],
      toDOM: node => {
        const id = String.random(12)
        downloadAndFillImage(('https://math.now.sh/?color=red&from=' + node.attrs.formula), id)
        // TODO: initial src should be set to a loading indicator
        return ['img', {
          'data-formula': node.attrs.formula || '?',
          src: node?.attrs?.src || ('https://math.now.sh/?color=red&from=' + node.attrs.formula),
          id,
          title: node.attrs.formula,
          alt: node.attrs.formula
        }]
      }
    }
  }

  commands ({
    type
  }) {
    return attrs => (state, dispatch) => {
      const {
        selection
      } = state
      const position = selection.$cursor ? selection.$cursor.pos : selection.$to.pos
      const node = type.create(attrs)
      const transaction = state.tr.insert(position, node)
      dispatch(transaction)
    }
  }

  inputRules ({
    type
  }) {
    return [
      nodeInputRule(MATH_INPUT_REGEX, type, match => {
        console.log(match)
        const [, formula] = match
        return { formula }
      })
    ]
  }
}
