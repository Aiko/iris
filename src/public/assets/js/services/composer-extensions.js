const {
	updateMark,
	markInputRule,
	nodeInputRule
} = tiptapBuild.tiptapCommands
const {
	Mark,
	Node,
	Plugin
} = tiptapBuild.tiptap

class Align extends Mark {
	get name() {
		return 'align';
	}

	get defaultOptions() {
		return {
			textAlign: ['left', 'center', 'right'],
		}
	}

	get schema() {
		return {
			attrs: {
				textAlign: {
					default: 'left',
				},
			},
			parseDOM: [{
				style: 'text-align',
				getAttrs: value => ({
					textAlign: value
				}),
			}, ],
			toDOM: mark => ['span', {
				style: `text-align: ${mark.attrs.textAlign};display: block`
			}, 0],
		};
	}

	commands({
		type
	}) {
		return attrs => updateMark(type, attrs);
	}

	inputRules({
		type
	}) {
		return [
			markInputRule(/(?:\*\*|__)([^*_]+)(?:\*\*|__)$/, type),
		];
	}
}

const IMAGE_INPUT_REGEX = /!\[(.+|:?)]\((\S+)(?:(?:\s+)["'](\S+)["'])?\)/

//* NOTE: this should REPLACE the Image extension
//* **DO NOT** i repeat **DO NOT** use them both at the same time !!
class PastableImage extends Node {

	get name() {
		return 'image'
	}

	get schema() {
		return {
			inline: true,
			attrs: {
				src: {},
				alt: {
					default: null,
				},
				title: {
					default: null,
				},
			},
			group: 'inline',
			draggable: true,
			parseDOM: [{
				tag: 'img[src]',
				getAttrs: dom => ({
					src: dom.getAttribute('src'),
					title: dom.getAttribute('title'),
					alt: dom.getAttribute('alt'),
				}),
			}, ],
			toDOM: node => ['img', node.attrs],
		}
	}

	commands({
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

	inputRules({
		type
	}) {
		return [
			nodeInputRule(IMAGE_INPUT_REGEX, type, match => {
				const [, alt, src, title] = match
				return {
					src,
					alt,
					title,
				}
			}),
		]
	}

	get plugins() {
		return [
			new Plugin({
				props: {
					handleDOMEvents: {
						drop(view, event) {
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
										src: readerEvent.target.result,
									})
									const transaction = view.state.tr.insert(coordinates.pos, node)
									view.dispatch(transaction)
								}
								reader.readAsDataURL(image)
							})
						},
						paste(view, event) {
							let hasFiles = false;
							let reader = new FileReader();
							reader.onload = function (event) {
								const imageUrl = event.target.result;
								const node = view.state.schema.nodes.image.create({
									src: imageUrl
								});
								const transaction = view.state.tr.replaceSelectionWith(node);
								view.dispatch(transaction);
							};
							Array.from(event.clipboardData.files)
								.filter(item => item.type.startsWith("image"))
								.forEach(item => {
									reader.readAsDataURL(item);
									hasFiles = true;
								});
							if (hasFiles) {
								event.preventDefault();
								return true;
							}
						},
					},
				},
			}),
		]
	}

}