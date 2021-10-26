Vue.component('board-rules', {
  data() {
    return {
      showAddRule: false,
      existingRules: [],
      draft: {
        folder: "INBOX",
        conditions: {
          from: null, // exact
          to: null, // exact
          subject: null, // contains
          text: null, // contains
          quick_action: null, // exact
          subscription: null, // exact
          attachment_type: null // starts with
        },
        action: []
      },
      // TODO: swap this out to support multi-condition and multi-action
      validConditions: [
        {
          display: "if from:",
          value: "from",
        },
        {
          display: "if to:",
          value: "to",
        },
        {
          display: "subject has:",
          value: "subject"
        },
        {
          display: "if contains:",
          value: "text"
        },
        {
          display: "quick action:",
          value: "quick_action",
          valid: [
            {
              display: "Scheduling",
              value: "scheduling"
            },
            {
              display: "Attach Files",
              value: "send_document"
            },
            {
              display: "Copy Code",
              value: "confirm_code"
            },
            {
              display: "Subscribe",
              value: "subscribe"
            },
            {
              display: "Unsubscribe",
              value: "unsubscribe"
            },
            {
              display: "Verify",
              value: "verify"
            },
            {
              display: "(Integration)",
              value: "override"
            }
          ]
        },
        {
          display: "priority:",
          value: "subscription",
          valid: [
            {
              display: "Priority",
              value: false
            },
            {
              display: "Other",
              value: true
            }
          ]
        },
        {
          display: "attachment:",
          value: "attachment_type",
          valid: [
            {
              display: "Image",
              value: "image"
            },
            {
              display: "Video",
              value: "video"
            },
            {
              display: "Music/Sound",
              value: "audio"
            },
            {
              display: "PDF",
              value: "application/pdf"
            },
            {
              display: "Document",
              value: "application/vnd"
            },
            {
              display: "Text/Code",
              value: "text/"
            },
            {
              display: "ZIP Archive",
              value: "application/zip"
            },
            {
              display: "Font",
              value: "font"
            },
            {
              display: "Other",
              value: "application/octet-stream"
            },
          ]
        }
      ],
      validActions: [
        {
          display: "star:",
          value: "star",
          valid: [
            {
              display: "Star",
              value: true
            },
            {
              display: "Unstar",
              value: false
            }
          ]
        },
        {
          display: "forward to:",
          value: "forward",
        },
        {
          display: "move to:",
          value: "move",
          valid: this.$root.boards.map(board => ({
            display: board.name,
            value: board.path
          }))
        },
        {
          display: "delete?",
          value: "delete",
          valid: [
            {
              display: "Confirm",
              value: true
            },
          ]
        },
        {
          display: "archive?",
          value: "archive",
          valid: [
            {
              display: "Confirm",
              value: true
            },
          ]
        },
      ],
      condition: "from",
      conditionValue: "",
      action: "move",
      actionValue: ""
    }
  },
  async created() {
    await this.reset()
  },
  computed: {
    validDraft() {
      return (
        !!(this.conditionValue) && !!(this.actionValue)
      )
    },
    rules() {
      return this.existingRules.map(rule => {
        const conditions = rule.conditions
        const condition =
          (conditions?.from && "from") ??
          (conditions?.to && "to") ??
          (conditions?.subject && "subject") ??
          (conditions?.text && "text") ??
          (conditions?.quick_action && "quick_action") ??
          (conditions?.subscription && "subscription") ??
          (conditions?.attachment_type && "attachment_type")
        ;
        if (!condition) return null
        const action = rule.action?.[0]
        if (!action) return null
        const conditionUI = this.validConditions.filter(({ value }) => value == condition)?.[0]
        const actionUI = this.validActions.filter(({ value }) => value == action.type)?.[0]
        return {
          condition: {
            ...conditionUI,
            type: condition,
            value: rule.conditions[condition]
          },
          action: {
            ...actionUI,
            ...action
          }
        }
      }).filter(_ => _)
    },
    draftCondition() {
      return this.validConditions.filter(({ value }) => value == this.condition)?.[0]
    },
    draftAction() {
      return this.validActions.filter(({ value }) => value == this.action)?.[0]
    },
  },
  methods: {
    close() {
      this.$root.flow.showBoardRules = false
    },
    async reset() {
      this.draft = {
        folder: "INBOX",
        conditions: {
          from: null,
          to: null,
          subject: null,
          text: null,
          quick_action: null,
          subscription: null,
          attachment_type: null
        },
        action: []
      }
      this.conditionValue = ""
      this.actionValue = ""
      this.showAddRule = false
      this.existingRules = await this.$root.engine.boardRules.list()
    },
    async addRule() {

      this.draft.conditions[this.condition] = this.conditionValue
      this.draft.action.push({
        type: this.action,
        value: this.actionValue
      })

      await this.$root.engine.boardRules.add(this.draft)
      if (this.draft.folder == this.$root.folders.special.inbox) {
        await this.$root.engine.boardRules.queue(
          ...(
            this.$root.resolveThreads(this.$root.inbox)
              .map(t => t?.emails[0])
              .map(e => e?.mid)
              .filter(_ => _)
          )
        )
      } else {
        const board = this.$root.boards.filter(board =>
          board.path == this.draft.folder)?.[0]
        if (!board) return error("Could not find board matching path spec for board rule auto-queue")
        await this.$root.engine.boardRules.queue(
          ...(
            this.$root.resolveThreads(board.tids)
              .map(t => t?.emails[0])
              .map(e => e?.mid)
              .filter(_ => _)
          )
        )
      }
      this.$root.engine.boardRules.consume()
      this.reset()
    }
  }
})