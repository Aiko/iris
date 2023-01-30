// Default Extensions
import StarterKit from '@tiptap/starter-kit'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import Code from '@tiptap/extension-code'
import Typography from '@tiptap/extension-typography'
import BubbleMenu2 from '@tiptap/extension-bubble-menu'
import Blockquote from '@tiptap/extension-blockquote'
import BulletList from '@tiptap/extension-bullet-list'
import { lowlight } from "lowlight"
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import HardBreak from '@tiptap/extension-hard-break'
import Heading from '@tiptap/extension-heading'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import OrderedList from '@tiptap/extension-ordered-list'
import TaskList from '@tiptap/extension-task-list'
import ListItem from '@tiptap/extension-list-item'
import TaskItem from '@tiptap/extension-task-item'
import Bold from '@tiptap/extension-bold'
import Italic from '@tiptap/extension-italic'
import Link from '@tiptap/extension-link'
import Strike from '@tiptap/extension-strike'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import Underline from '@tiptap/extension-underline'
import Dropcursor from '@tiptap/extension-dropcursor'
import Color from '@tiptap/extension-color'
import FontFamily from '@tiptap/extension-font-family'
import Gapcursor from '@tiptap/extension-gapcursor'
import History from '@tiptap/extension-history'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'

// Custom Marx
import { Align } from '@Veil/utils/grimaldi/lib/marks/Align'

// Custom Nodes
import { Emoji } from '@Veil/utils/grimaldi/lib/nodes/Emoji'
import { InlineMath } from '@Veil/utils/grimaldi/lib/nodes/InlineMath'
import { Mathematics } from '@Veil/utils/grimaldi/lib/nodes/Mathematics'
import { ParagraphDiv } from '@Veil/utils/grimaldi/lib/nodes/ParagraphDiv'
import { PastableImage } from '@Veil/utils/grimaldi/lib/nodes/PastableImage'
import { TrailingNode } from '@Veil/utils/grimaldi/lib/nodes/TrailingNode'

// Custom Typography
import { ColorHighlighter } from './lib/typography/ColorHighlighter'
import { SmilieReplacer } from './lib/typography/SmilieReplacer'

import { Editor } from '@tiptap/vue-3'

export default class Grimaldi {

	readonly editor: Editor

	constructor(
		template: string="",
		quoted: string=""
	) {
		this.editor = new Editor({
			extensions: [
        StarterKit,
        Document,
        Paragraph,
        Text,
        Code,
        Typography,
        Blockquote,
        BulletList,
        CodeBlockLowlight.configure({
					lowlight,
				}),
        HardBreak,
        Heading.configure({
          levels: [1,2,3]
        }),
        HorizontalRule,
        OrderedList,
        TaskList,
        ListItem,
        TaskItem,
        Bold,
        Italic,
        Link,
        Strike,
        Subscript,
        Superscript,
        Underline,
        Dropcursor,
        Color,
        FontFamily,
        Gapcursor,
        Placeholder.configure({
          emptyEditorClass: 'is-editor-empty',
          emptyNodeClass: 'is-empty',
          showOnlyCurrent: true,
          showOnlyWhenEditable: true
        }),
        TextAlign,
        Align,
        Emoji,
				InlineMath,
        Mathematics,
        ParagraphDiv,
        PastableImage,
        ColorHighlighter,
        SmilieReplacer,
        TrailingNode.configure({
          node: 'paragraph',
          notAfter: ['paragraph']
        })
      ],
			content: [
				"Hi,",
				"\n",
				template,
				"\n",
				"All the best,",
				"Le Porc-Epic",
				"<br>",
				"<a href='https://helloaiko.com'>Written with Aiko Mail</a>",
				"<br>",
				quoted ? "<blockquote>" + quoted + "</blockquote>" : ""
			].filter(Boolean).join('<br>'),
		})
	}

	get html() {
		return this.editor.getHTML()
	}

	set html(content) {
		this.editor.commands.setContent(content)
	}



}