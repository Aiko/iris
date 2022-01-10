const shortcuts = {
  data: {
    focused: {
      index: -1,
      folder: 'INBOX',
      view: false,
      quickReply: false
    }
  },
  async created () {
    const leftArrow = 37
    const upArrow = 38
    const rightArrow = 39
    const downArrow = 40
    const enter = 13
    const backslash = 220
    const shift = 16

    const that = this
    document.addEventListener('keyup', function (evt) {
      if (that.viewThread) return
      switch (evt.keyCode) {
        case shift: return (that.focused.quickReply = true)
        default:
      }
    })

    document.addEventListener('keydown', function (evt) {
      // return if in viewing mode as that has diff shortcuts
      if (that.viewThread) return
      switch (evt.keyCode) {
        case leftArrow: return that.focusPrevBoard(evt)
        case rightArrow: return that.focusNextBoard(evt)
        case downArrow: return that.focusNextEmail(evt)
        case upArrow: return that.focusPreviousEmail(evt)
        case enter: return (that.focused.view = true)
        default:
      }
    })

    hotkeys(
      [
        'ctrl+tab', 'ctrl+shift+tab',
        'esc',
        'alt+z',
        'ctrl+alt+shift+b',
      ].join(','),
      function (evt, data) {
        switch (data.key) {
          case 'ctrl+tab':
          case 'ctrl+shift+tab':
            app.priority = !app.priority;
            break;
          case 'esc':
            app.focused.index = -1;
            break;
          case 'alt+z':
            app.zenMode = !app.zenMode;
            break;
          case 'ctrl+alt+shift+b':
            app.useCustomBackground();
            break;
          default: log(data);
        }
    })
  },
  methods: {
    async focusNextEmail (e) {
      /*
      this.focused.quickReply = false
      e?.preventDefault()
      e?.stopPropagation()
      //* for the inbox, adjust for priority
      if (this.focused.folder == 'INBOX') {
        if (this.inbox.emails.length > (this.focused.index + 1)) {
          if (this.priority) {
            const nextIndex = this.inbox.emails.map((email, i) => {
              return {email, i}
            }).filter(({email, i}) =>
                email?.ai?.priority &&
                !(email?.ai?.threaded) &&
                email.folder == 'INBOX' &&
                i > this.focused.index &&
                !(email?.ai?.deleted)
            )?.[0]?.i
            if (nextIndex != undefined) this.focused.index = nextIndex
          } else {
            const nextIndex = this.inbox.emails.map((email, i) => {
              return {email, i}
            }).filter(({email, i}) =>
                !email?.ai?.priority &&
                !(email?.ai?.threaded) &&
                email.folder == 'INBOX' &&
                i > this.focused.index &&
                !(email?.ai?.deleted)
            )?.[0]?.i
            if (nextIndex != undefined) this.focused.index = nextIndex
          }
        }
      }
      //* for the boards, just increment
      else if (this.boardNames.includes(this.focused.folder)) {
        if (this.boards[this.focused.folder]?.emails?.length > (this.focused.index + 1)) {
          this.focused.index += 1
        }
      }
      //* same goes for done
      else if (this.focused.folder == '[Aiko Mail]/Done') {
        if (this.done?.emails?.length > (this.focused.index + 1)) {
          this.focused.index += 1
        }
      }
      */
    },
    async focusPreviousEmail (e) {
      /*
      this.focused.quickReply = false
      e?.preventDefault()
      e?.stopPropagation()
      //* for the inbox, adjust for priority
      if (this.focused.folder == 'INBOX') {
        if (this.focused.index - 1 > -1) {
          if (this.priority) {
            const nextIndex = this.inbox.emails.map((email, i) => {
              return {email, i}
            }).filter(({email, i}) =>
                email?.ai?.priority &&
                !(email?.ai?.threaded) &&
                email.folder == 'INBOX' &&
                i < this.focused.index &&
                !(email?.ai?.deleted)
            )?.last()?.i
            if (nextIndex != undefined) this.focused.index = nextIndex
          } else {
            const nextIndex = this.inbox.emails.map((email, i) => {
              return {email, i}
            }).filter(({email, i}) =>
                !email?.ai?.priority &&
                !(email?.ai?.threaded) &&
                email.folder == 'INBOX' &&
                i < this.focused.index &&
                !(email?.ai?.deleted)
            )?.last()?.i
            if (nextIndex != undefined) this.focused.index = nextIndex
          }
        }
      }
      //* for the boards, just decrement
      else if (this.boardNames.includes(this.focused.folder)) {
        if ((this.focused.index - 1) > -1) {
          this.focused.index -= 1
        }
      }
      //* same goes for done
      else if (this.focused.folder == '[Aiko Mail]/Done') {
        if ((this.focused.index + 1) > -1) {
          this.focused.index -= 1
        }
      }
      */
    },
    async focusNextBoard (e) {
      /*
      this.focused.quickReply = false
      e?.preventDefault()
      e?.stopPropagation()
      if (this.focused.folder == 'INBOX') {
        //* if we're in the inbox focus the first board if it exists
        if (this.boardNames.length > 0) {
          this.focused.folder = this.boardNames[0]
          this.focused.index = 0
        }
        //* else focus the done board
        else {
          this.focused.folder = '[Aiko Mail]/Done'
          this.focused.index = 0
        }
      } else if (this.boardNames.includes(this.focused.folder)) {
        //* if we're in a board focus the next board if it exists
        const i = this.boardNames.indexOf(this.focused.folder)
        if (this.boardNames.length > (i + 1)) {
          this.focused.folder = this.boardNames[i + 1]
          this.focused.index = 0
        }
        //* else focus the done board
        else {
          this.focused.folder = '[Aiko Mail]/Done'
          this.focused.index = 0
        }
      }
      //* if we're in the done board do nothing
      */
    },
    async focusPrevBoard (e) {
      /*
      this.focused.quickReply = false
      e?.preventDefault()
      e?.stopPropagation()
      if (this.focused.folder == '[Aiko Mail]/Done') {
        //* if we're in the done folder focus the last board if it exists
        if (this.boardNames.length > 0) {
          this.focused.folder = this.boardNames.last()
          this.focused.index = 0
        }
        //* else focus the inbox
        else {
          this.focused.folder = 'INBOX'
          if (this.priority) {
            //* find the first priority email
            const nextIndex = this.inbox.emails.map((email, i) => {
              return {email, i}
            }).filter(({email}) =>
                email?.ai?.priority &&
                !(email?.ai?.threaded) &&
                email.folder == 'INBOX' &&
                !(email?.ai?.deleted)
            )?.[0]?.i
            if (nextIndex != undefined) this.focused.index = nextIndex
          } else {
            const nextIndex = this.inbox.emails.map((email, i) => {
              return {email, i}
            }).filter(({email}) =>
                !email?.ai?.priority &&
                !(email?.ai?.threaded) &&
                email.folder == 'INBOX' &&
                !(email?.ai?.deleted)
            )?.[0]?.i
            if (nextIndex != undefined) this.focused.index = nextIndex
          }
        }
      } else if (this.boardNames.includes(this.focused.folder)) {
        //* if we're in a board focus the previous board if it exists
        const i = this.boardNames.indexOf(this.focused.folder)
        if ((i - 1) > -1) {
          this.focused.folder = this.boardNames[i - 1]
          this.focused.index = 0
        }
        //* else focus the inbox
        else {
          this.focused.folder = 'INBOX'
          if (this.priority) {
            //* find the first priority email
            const nextIndex = this.inbox.emails.map((email, i) => {
              return {email, i}
            }).filter(({email}) =>
                email?.ai?.priority &&
                !(email?.ai?.threaded) &&
                email.folder == 'INBOX' &&
                !(email?.ai?.deleted)
            )?.[0]?.i
            if (nextIndex != undefined) this.focused.index = nextIndex
          } else {
            const nextIndex = this.inbox.emails.map((email, i) => {
              return {email, i}
            }).filter(({email}) =>
                !email?.ai?.priority &&
                !(email?.ai?.threaded) &&
                email.folder == 'INBOX' &&
                !(email?.ai?.deleted)
            )?.[0]?.i
            if (nextIndex != undefined) this.focused.index = nextIndex
          }
        }
      }
      //* if we're in the inbox, focus the first email
      else if (this.focused.folder == 'INBOX') {
        if (this.priority) {
          //* find the first priority email
          const nextIndex = this.inbox.emails.map((email, i) => {
            return {email, i}
          }).filter(({email}) =>
              email?.ai?.priority &&
              !(email?.ai?.threaded) &&
              email.folder == 'INBOX' &&
              !(email?.ai?.deleted)
          )?.[0]?.i
          if (nextIndex != undefined) this.focused.index = nextIndex
        } else {
          const nextIndex = this.inbox.emails.map((email, i) => {
            return {email, i}
          }).filter(({email}) =>
              !email?.ai?.priority &&
              !(email?.ai?.threaded) &&
              email.folder == 'INBOX' &&
              !(email?.ai?.deleted)
          )?.[0]?.i
          if (nextIndex != undefined) this.focused.index = nextIndex
        }
      }
      */
    }
  }
}
