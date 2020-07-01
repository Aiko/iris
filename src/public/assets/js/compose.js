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
    goauth, // Google OAuth
    VueClickaway.mixin, // Clickaway
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
    linkMenuIsActive: false,
    showBCC: false,
    contacts: {},
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

    info(...(this.TAG), 'Fetching contacts...')
    await this.fetchContacts()

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
            emptyNodeText: 'Message',
            showOnlyWhenEditable: true,
            showOnlyCurrent: true
          }),
          new PastableImage(),
          new Align(),
          new Emoji(),
          new Mathematics(),
          new ParagraphDiv()
        ],
        onUpdate: ({ getHTML }) => {
          this.html = getHTML()
        },
        content: this.quoted ? `<p></p><br><blockquote>${this.quoted}</blockquote>` : ''
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
    },
    async fetchContacts() {
      const contactCache = (
        await BigStorage.load(this.smtpConfig.email + '/contacts')
        || this.contacts
      )
      Object.assign(this.contacts, contactCache)
    },
    async suggestContact(term, limit=5) {
      const results = []
      for (const contact of app.contacts.allContacts) {
        const [address, name, frequency] = contact
        if (term.length < 3) {
          if (
            (address && address.startsWith(term)) || (name && name.startsWith(term))
          ) results.push([address, name, frequency])
        } else {
          if (
            (address && address.indexOf(term) > -1) || (name && name.indexOf(term) > -1)
          ) results.push([address, name, frequency])
        }
      }
      return results.sort((r1, r2) => r2[2] - r1[2]).slice(0, limit)
    },
  }
})
