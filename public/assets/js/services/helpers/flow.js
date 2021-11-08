const FLOW_TAG = ['%c[FLOW API]', 'background-color: #ff7895; color: #000;']

const flow_mgr = {
  data: {
    flow: {
      addMailbox: false,
      forceAddMailbox: false,
      addBoard: false,
      viewThread: null,
      showDev: false,
      regularView: false,
      showInboxBoardActions: false,
      showInboxBoardControls: false,
      showBoardRules: false,
      showNotifications: false,
      showSent: false,
      useUnsplashBackground: false,
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
    'flow.showSent': function (_) {
      remote.shell.openExternal('https://mail.google.com/mail/u/0/#sent')
    },
  },
  methods: {
    async useUnsplashBackground() {
      const style = document.createElement('style')
      //? follow the URL and get the redirect URL
      const url = (await fetch('https://source.unsplash.com/random/1920x1080')).url
      const color = await image2Color(url, false)
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
    }
  }
}
