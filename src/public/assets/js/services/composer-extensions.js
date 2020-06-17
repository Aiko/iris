const { updateMark, markInputRule } = tiptapBuild.tiptapCommands
const Mark = tiptapBuild.tiptap.Mark

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
			parseDOM: [
				{
					style: 'text-align',
					getAttrs: value => ({ textAlign: value }),
				},
			],
			toDOM: mark => ['span', { style: `text-align: ${mark.attrs.textAlign};display: block` }, 0],
		};
	}

	commands({ type }) {
		return attrs => updateMark(type, attrs);
	}

	inputRules({ type }) {
		return [
			markInputRule(/(?:\*\*|__)([^*_]+)(?:\*\*|__)$/, type),
		];
	}
}
