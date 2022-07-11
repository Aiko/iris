const FLOW_TAG = ['%c[FLOW API]', 'background-color: #ff7895; color: #000;']

const flow_mgr = {
  data: {
    flow: {
      addMailbox: false,
      forceAddMailbox: false,
      addingMailbox: false,
      addBoard: false,
      viewThread: null,
      showDev: false,
      regularView: false,
      specialView: false,
      showInboxBoardActions: false,
      showInboxBoardControls: false,
      showBoardRules: false,
      showNotifications: false,
      showInbox: true,
      showSent: false,
      showSpam: false,
      showTrash: false,
      showDrafts: false,
      showArchive: false,
      showSearch: false,
      useUnsplashBackground: false,
      scheduleSeed: null,
      showConnectionError: false,
      searchTerm: '',
    },
    colorPalette: ["#F6F6F6", "#FFFFFF", "#2B4192", "#486FFF", "#486FFF"]
  },
  watch: {
    'flow.forceAddMailbox': function (f, _) {
      this.flow.addMailbox = f || this.flow.addMailbox
    },
    'flow.regularView': function (_) {
      this.recalculateHeight()
    },
    'flow.showInbox': function (s) {
      if (!s) return;
      this.flow.specialView = false
      this.flow.viewThread = null
      this.flow.showSent = false
      this.flow.showSpam = false
      this.flow.showTrash = false
      this.flow.showDrafts = false
      this.flow.showArchive = false
      this.flow.showSearch = false
    },
    'flow.showSent': function (s) {
      if (!s) return;
      this.flow.specialView = true
      this.flow.viewThread = null
      this.flow.showInbox = false
      this.flow.showSpam = false
      this.flow.showTrash = false
      this.flow.showDrafts = false
      this.flow.showArchive = false
      this.flow.showSearch = false
    },
    'flow.showSpam': function (s) {
      if (!s) return;
      this.flow.specialView = true
      this.flow.viewThread = null
      this.flow.showInbox = false
      this.flow.showSent = false
      this.flow.showTrash = false
      this.flow.showDrafts = false
      this.flow.showArchive = false
      this.flow.showSearch = false
    },
    'flow.showTrash': function (s) {
      if (!s) return;
      this.flow.specialView = true
      this.flow.viewThread = null
      this.flow.showInbox = false
      this.flow.showSent = false
      this.flow.showSpam = false
      this.flow.showDrafts = false
      this.flow.showArchive = false
      this.flow.showSearch = false
    },
    'flow.showDrafts': function (s) {
      if (!s) return;
      this.flow.specialView = true
      this.flow.viewThread = null
      this.flow.showInbox = false
      this.flow.showSent = false
      this.flow.showSpam = false
      this.flow.showTrash = false
      this.flow.showArchive = false
      this.flow.showSearch = false
    },
    'flow.showArchive': function (s) {
      if (!s) return;
      this.flow.specialView = true
      this.flow.viewThread = null
      this.flow.showInbox = false
      this.flow.showSent = false
      this.flow.showSpam = false
      this.flow.showTrash = false
      this.flow.showDrafts = false
      this.flow.showSearch = false
    },
    'flow.showSearch': function (s) {
      if (!s) return;
      this.flow.specialView = true
      this.flow.viewThread = null
      this.flow.showInbox = false
      this.flow.showSent = false
      this.flow.showSpam = false
      this.flow.showTrash = false
      this.flow.showDrafts = false
      this.flow.showArchive = false
    },
  },
  computed: {
    folderForView: function () {
      if (this.flow.showInbox) return this.folders.special.inbox
      if (this.flow.showSent) return this.folders.special.sent
      if (this.flow.showSpam) return this.folders.special.spam
      if (this.flow.showTrash) return this.folders.special.trash
      if (this.flow.showDrafts) return this.folders.special.drafts
      if (this.flow.showArchive) return this.folders.special.archive
      if (this.flow.showSearch) return this.searchFolder
    },
    titleForView: function () {
      if (this.flow.showInbox) return 'Inbox'
      if (this.flow.showSent) return 'Sent'
      if (this.flow.showSpam) return 'Spam'
      if (this.flow.showTrash) return 'Trash'
      if (this.flow.showDrafts) return 'Drafts'
      if (this.flow.showArchive) return 'Archive'
      if (this.flow.showSearch) {
        const prefix = this.searching ? "Searching" : "Results from"
        return prefix + " " + this.viewFromFolder(this.searchFolder)
      }
    }
  },
  methods: {
    viewFromFolder(folder) {
      if (folder == this.folders.special.inbox) return "Inbox"
      if (folder == this.folders.special.sent) return "Sent"
      if (folder == this.folders.special.spam) return "Spam"
      if (folder == this.folders.special.trash) return "Trash"
      if (folder == this.folders.special.drafts) return "Drafts"
      if (folder == this.folders.special.archive) return "Archive"
    },
    async useCustomBackground(url="") {
      const style = document.createElement('style')
      //? follow the URL and get the redirect URL
      if (!url) url = (await fetch('https://source.unsplash.com/random/1920x1080')).url
      let color = await image2Color(url, app.isDarkMode).catch(console.error)
      if (!color) color = await image2Color(url, !app.isDarkmode).catch(console.error)
      if (!color) color = "4b74ff"
      const filter = hex2Filter(color)
      const hexColor = "#" + color;
      this.colorPalette = ["#F6F6F6", "#FFFFFF", hexColor, hexColor]
      this.avatar = await this.currentMailbox.getAvatar({ colorPalette: this.colorPalette })
      style.innerHTML = `
      :root {
        --main-color: ${hexColor};
        --main-color-hover: ${hexColor};
      }
      .bg {
        background-image: url(${url}) !important;
      }
      .compose-button {
        filter: brightness(0.7) contrast(2.0);
      }
      img[src$='.svg'] {
        ${filter}
      }
      `
      document.body.appendChild(style)
    },
  }
}
