Vue.component('view-email-single', {
  props: ['emailsingle', 'expanded'],
  template: '#view-email-single',
  data () {
    return {
      email: this.emailsingle
    }
  },
  computed: {
    sender () {
      return this?.email?.envelope?.from?.[0] || this?.email?.envelope?.sender?.[0] || {
        address: 'No Sender',
        name: 'No Sender'
      }
    },
    boards () {
      return app.boardNames.map(b => {
        return {
          folder: b,
          name: b.replace('[Aiko Mail]/', '')
        }
      })
    },
    iframeId () {
      return this.email.folder + '-' + this.email.uid
    }
  },
  watch: {
    emailsingle (_) {
      this.email = this.emailsingle
      this.setContent(blank = 'No message')
    }
  },
  created () {
    this.setContent(blank = 'No message')
  },
  methods: {
    async setContent (blank = 'Loading message...') {
      if (!(this?.email?.parsed?.html || this?.email?.parsed?.text)) return
      const iframeID = this.iframeId
      const el = document.getElementById(iframeID)
      if (el) el.style.height = '0px'
      else setTimeout(this.setContent, 100) // try every 100ms
      $('.email-body').scrollTop(0)
      const doc = el.contentWindow.document
      doc.open()
      doc.clear()
      // TODO: there HAS to be some way to load http inside https safely
      //* maybe local proxy?
      const textToWrite = (this.email.parsed.html || this.email.parsed.text)
      doc.write(textToWrite)
      doc.close()
      try {
        $('#' + iframeID).load(function () {
          document.getElementById(iframeID).style.height = Math.max(document.getElementById(iframeID).contentWindow.document.body.offsetHeight, document.getElementById(iframeID).contentWindow.document.body.scrollHeight) + 'px'
          $('.email-body').scrollTop(0)
        })
      } catch (e) { }
      /*
      document.getElementById(iframeID).style.height = Math.max(document.getElementById(iframeID).contentWindow.document.body.offsetHeight, document.getElementById(iframeID).contentWindow.document.body.scrollHeight) + 'px'
      $('.email-body').scrollTop(0)
      // Don't judge me. It works.
      setTimeout(function () {
        document.getElementById(iframeID).style.height = Math.max(document.getElementById(iframeID).contentWindow.document.body.offsetHeight, document.getElementById(iframeID).contentWindow.document.body.scrollHeight) + 'px'
      }, 100)
      setTimeout(function () {
        document.getElementById(iframeID).style.height = Math.max(document.getElementById(iframeID).contentWindow.document.body.offsetHeight, document.getElementById(iframeID).contentWindow.document.body.scrollHeight) + 'px'
      }, 200)
      setTimeout(function () {
        document.getElementById(iframeID).style.height = Math.max(document.getElementById(iframeID).contentWindow.document.body.offsetHeight, document.getElementById(iframeID).contentWindow.document.body.scrollHeight) + 'px'
      }, 500)
      */
      const links = doc.links
      for (let i = 0; i < links.length; i++) {
        links[i].target = '_blank'
      }
    }
  }
})
