const {
  Editor,
  EditorContent,
  EditorMenuBar,
  EditorMenuBubble
} = tiptapBuild.tiptap
const {
  Blockquote,
  CodeBlock,
  HardBreak,
  Heading,
  HorizontalRule,
  OrderedList,
  BulletList,
  ListItem,
  TodoItem,
  TodoList,
  Bold,
  Code,
  Italic,
  Link,
  Strike,
  Underline,
  History,
  TrailingNode,
  Image,
  Placeholder
} = tiptapBuild.tiptapExtensions

const app = new Vue({
  el: '#app',
  mixins: [
    ipc, // IPC communication
    aikoapi, // Aiko API
    windowManager, // window controls
    composer, // SMTP API
    goauth // Google OAuth
  ],
  components: {
    EditorContent,
    EditorMenuBar,
    EditorMenuBubble
  },
  data: {
    TAG: ['%c[COMPOSER MAIN]', 'background-color: #dd00aa; color: #000;'],
    loading: true,
    bang: '',
    editor: null,
    html: '',
    linkUrl: null,
    linkMenuIsActive: false
  },
  watch: {
    loading (isLoading, wasLoading) {
      if (wasLoading && isLoading) return
      if (wasLoading && !isLoading) {
        setTimeout(() => {
          document.getElementById('fixed').style.display = 'none'
        }, 300)
        return
      }
      if (!wasLoading && isLoading) {
        document.getElementById('fixed').style.display = ''
      }
    }
  },
  async created () {
    document.getElementById('app').style.opacity = 1
    console.time('APP STARTUP')
    info(...(this.TAG), 'Initializing application')
    this.loading = true

    this.bang = window.location.hash.substr(1)

    info(...(this.TAG), 'Initializing cache')
    await SmallStorage.load('random')

    // setup IPC
    info(...(this.TAG), 'Initializing IPC')
    await this.initIPCNoStream()

    // setup window controls
    info(...(this.TAG), 'Initializing window controls')
    this.windowPrefix = this.bang + ':please'
    this.isMaximized = false
    await this.initWindowControls()

    // fetch preferences
    info(...(this.TAG), 'Fetching preferences')
    const {
      token
    } = await ipcRenderer.invoke('get preferences', [
      'token'
    ])

    // try logging in
    info(...(this.TAG), 'Logging in')
    const {
      error
    } = await this.initAPI(token)
    if (error) {
      window.error(...(this.TAG), 'Authentication failed. User needs to login again?')
      // FIXME: we can try relog with stored email/pass
      // if those fail then we can ask for relog
      await ipcRenderer.invoke('save preferences', {
        authenticated: false
      })
      await ipcRenderer.invoke('reentry')
      return
    }

    // setup SMTP listeners
    info(...(this.TAG), 'Initializing SMTP')
    await this.initSMTP()
    await this.loadComposer()

    info(...(this.TAG), 'Initializing editor (tiptap)')
    this.makeEditor()

    success(...(this.TAG), 'Finished initialization.')
    this.loading = false
    console.timeEnd('APP STARTUP')
  },
  methods: {
    log (...msg) {
      console.log(...msg)
    },
    makeEditor () {
      this.editor = new Editor({
        extensions: [
          new Blockquote(),
          new BulletList(),
          new CodeBlock(),
          new HardBreak(),
          new Heading({
            levels: [1, 2, 3]
          }),
          new HorizontalRule(),
          new ListItem(),
          new OrderedList(),
          new TodoItem(),
          new TodoList(),
          new Link(),
          new Bold(),
          new Code(),
          new Italic(),
          new Strike(),
          new Underline(),
          new History(),
          new TrailingNode({
            node: 'paragraph',
            notAfter: ['paragraph']
          }),
          new Placeholder({
            emptyEditorClass: 'is-editor-empty',
            emptyNodeClass: 'is-empty',
            emptyNodeText: 'Write something …',
            showOnlyWhenEditable: true,
            showOnlyCurrent: true
          }),
          new PastableImage(),
          new Align(),
          new Emoji(),
          new Mathematics()
        ],
        onUpdate: ({ getHTML }) => {
          this.html = getHTML()
        }
      })
    },
    showLinkMenu (attrs) {
      this.log('Showed link menu')
      this.linkMenuIsActive = true
      this.linkUrl = attrs.href
      this.$nextTick(() => {
        this.$refs.linkInput.focus()
      })
    },
    hideLinkMenu () {
      this.log('Hid link menu')
      this.linkUrl = null
      this.linkMenuIsActive = false
    },
    setLinkUrl (command, url) {
      this.log('Set link to', url)
      command({ href: url })
      this.hideLinkMenu()
    }
  }
})
