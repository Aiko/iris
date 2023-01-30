import { Image } from '@tiptap/extension-image'

import { Plugin } from 'prosemirror-state'

//! NOTE: this should >>REPLACE<< the default Image extension, do not use both
export const PastableImage = Image.extend({
  name: 'image',

  inline: true,
  draggable: true,
  group: 'inline',

  defaultOptions: {
    inline: true
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleDOMEvents: {
            drop (view, event) {
              if (!event.dataTransfer) return false;

              const hasFiles: boolean = !!(event.dataTransfer.files?.length)
              if (!hasFiles) return false;

              const images = Array.from(event.dataTransfer.files)
                .filter(file => (/image/i.test(file.type)))
              if (images.length === 0) return false;

              const { schema } = view.state
              const coords = view.posAtCoords({
                left: event.clientX,
                top: event.clientY
              })
              if (!coords) return false;

              event.preventDefault()

              images.map(image => {
                const reader = new FileReader()

                reader.onload = function (event) {
                  const node = schema.nodes.image.create({
                    src: event.target?.result
                  })
                  const txn = view.state.tr.insert(coords.pos, node)
                  view.dispatch(txn)
                }

                reader.readAsDataURL(image)
              })

              return true;
            },
            paste (view, event) {
              const reader = new FileReader()
              reader.onload = function (event) {
                const src = event.target?.result
                const node = view.state.schema.nodes.image.create({ src, })
                const txn = view.state.tr.replaceSelectionWith(node)
                view.dispatch(txn)
              }
              const hasFiles = Array.from(event.clipboardData?.files || [])
                .filter(item => item.type.startsWith('image'))
                .map(item => reader.readAsDataURL(item))
                .length > 0

              if (hasFiles) event.preventDefault()
              return hasFiles
            }
          }
        }
      })
    ]
  }
})
