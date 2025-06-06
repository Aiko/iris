import type Folders from "@Mouseion/managers/folders";
import type Register from "@Mouseion/managers/register";
import { getLocation } from "@Mouseion/pantheon/pantheon";
import type { PantheonProxy } from "@Mouseion/pantheon/puppeteer";
import type { MessageID } from "@Mouseion/post-office/types";
import Janitor from "@Mouseion/utils/cleaner";
import type { Logger, LumberjackEmployer } from "@Mouseion/utils/logger";
import type Operator from "@Mouseion/actors/operator";
import type Storage from "@Mouseion/utils/storage";
import type { EmailFull } from "@Mouseion/utils/types";
import type MessageQueue from "@Mouseion/queues/MessageQueue";
import autoBind from 'auto-bind'

/*
! For forward, it might be better to just create a forward specific board
! e.g. [Aiko]/Send to <Contact Name>
! and let the client handle this
*/

export enum BoardRuleActions {
  Star="star",
  Forward="forward",
  Move="move",
  Delete="delete",
  Archive="archive"
}
export type BoardRuleAction = `${BoardRuleActions}`

export interface BoardRule {
  folder: string
  conditions: {
    from?: string
    to?: string
    subject?: string
    text?: string
    quick_action?: string
    subscription?: boolean
    attachment_name?: string
    attachment_type?: string
  }
  action: [{
    type: BoardRuleAction
    value: string | boolean
  }]
}
export type BoardRules = BoardRule[]

export default class BoardRulesQueue implements MessageQueue {
  readonly pending: MessageID[] = []
  private readonly meta: Storage
  private readonly pantheon: PantheonProxy
  private readonly folders: Folders
  private readonly operator: Operator
  private readonly Log: Logger
  private rules: BoardRules

  // TODO: eventually load & store to server
  private async sync() {
    const rules = await this.meta.load('board-rules')
    if (!rules) {
      await this.meta.store('board-rules', [])
      this.rules = []
    } else {
      this.rules = rules
    }
  }
  async addRule(rule: BoardRule) {
    this.rules.push(rule)
    await this.meta.store('board-rules', this.rules)
    return true
  }

  async listRules() {
    return JSON.parse(JSON.stringify(this.rules))
  }

  constructor(Registry: Register) {
    this.meta = Registry.get("Metadata Storage") as Storage
    this.pantheon = Registry.get("Pantheon") as PantheonProxy
    this.folders = Registry.get("Folders") as Folders
    this.operator = Registry.get("Cypher") as Operator
    const Lumberjack = Registry.get("Lumberjack") as LumberjackEmployer
    this.Log = Lumberjack("Board Rules")
    this.rules = []
    this.sync() //! you better hope this finishes firing before the sync happens nancy
    autoBind(this)
  }

  async consume(): Promise<boolean> {
    await this.sync()

    const n_pending = this.pending.length
    this.Log.time("Applied", this.rules.length, "rules to", n_pending, "MIDs.")

    while (this.pending.length > 0) {
      const mid = this.pending.pop()
      if (mid) await this.apply(mid)
    }

    this.Log.timeEnd("Applied", this.rules.length, "rules to", n_pending, "MIDs.")
    return true
  }
  queue(...mids: string[]): void {
    this.pending.push(...mids)
  }

  private async apply(mid: MessageID) {
    //? Find the relevant email
    const _email: EmailFull | null =
      await this.pantheon.cache.full.check(mid) ||
      await this.pantheon.cache.content.check(mid) ||
      null
    if (!_email) return this.Log.warn("MID", mid, "is not in a content-level or higher cache and will be skipped.")
    const email = Janitor.storage<EmailFull>(_email)

    //? Check whether board rules can be applied
    if (!email.parsed.text) return this.Log.warn("MID", mid, "does not contain text in cache and will be skipped.")
    if (!(email.M.envelope.mid == mid)) return this.Log.warn("MID", mid, "could not be verified and will be skipped.")

    //? Find the relevant message
    const message = await this.pantheon.db.messages.find.mid(mid)
    if (!message) return this.Log.warn("MID", mid, "does not exist in our databaase. Are you missing a call to threading?")

    //? Find the location of the message in the inbox
    const inbox = this.folders.inbox()
    const inboxLOC = inbox ? getLocation(message.locations, inbox) : null

    //? Identify which folders the message is in
    const folders = message.locations.map(({ folder }) => folder)

    //! Action precedence:
    //* 1. Star
    //* 2. Forward
    //* 3. Move
    //* 4. Archive XOR Delete
    const actions:Partial<Record<BoardRuleAction, string | boolean>> = {}
    let valid: boolean = false //? whether to apply

    const strmatch = (str: string, substr: string) =>
      str.toLowerCase().trim().includes(substr.toLowerCase().trim())
    ;;

    //? Build phase
    for (const { folder, conditions, action } of this.rules) {
      let conditions_met = true

      //? Does the rule apply to the email's folder?
      conditions_met = conditions_met && (folders.includes(folder))
      if (!conditions_met) continue;

      //? Does the rule apply to the email's sender?
      if (conditions.from) {
        const match = strmatch(email.M.envelope.from.address, conditions.from) || strmatch(email.M.envelope.from.name, conditions.from)
        conditions_met = conditions_met && match
        if (!conditions_met) continue;
      }

      //? Does the rule apply to any of the email's recipients?
      if (conditions.to) {
        const match = email.M.envelope.to.filter(({ address, name }) =>
          strmatch(address, conditions.to!) || strmatch(name, conditions.to!)
        ).length > 0
        conditions_met = conditions_met && match
        if (!conditions_met) continue;
      }

      //? Does the rule apply in part to the email's subject?
      if (conditions.subject) {
        const match = strmatch(email.M.envelope.subject, conditions.subject)
        conditions_met = conditions_met && match
        if (!conditions_met) continue;
      }

      //? Does the rule apply to the detected quick action?
      if (conditions.quick_action) {
        const match = email.M.quick_actions.classification == conditions.quick_action
        conditions_met = conditions_met && match
        if (!conditions_met) continue;
      }

      //? Does the rule apply to the priority status?
      if (conditions.subscription != null) {
        const match = (email.M.subscription.subscribed == conditions.subscription)
        conditions_met = conditions_met && match
        if (!conditions_met) continue;
      }

      //? Does the rule apply in part to the email's text?
      if (conditions.text) {
        const match = strmatch(email.parsed.text, conditions.text)
        conditions_met = conditions_met && match
        if (!conditions_met) continue;
      }

      //? Does the rule apply in part to the attachment filename?
      if (conditions.attachment_name) {
        const match = email.parsed.attachments.filter(
          ({ filename }) => strmatch(filename, conditions.attachment_name!)
        ).length > 0
        conditions_met = conditions_met && match
        if (!conditions_met) continue;
      }

      //? Does the rule apply in part to the attachment types?
      if (conditions.attachment_type) {
        const match = email.parsed.attachments.filter(
          ({ contentType }) => strmatch(contentType, conditions.attachment_type!)
        ).length > 0
        conditions_met = conditions_met && match
        if (!conditions_met) continue;
      }

      //? Everything checked out if we got here!
      valid = true
      //! Actions are set first-come-first-served
      action.map(({ type, value }) => {
        if (actions[type]) return;
        actions[type] = value
      })
    }

    //? Apply phase
    if (valid) {
      this.Log.log("MID", mid, "matched a rule and will be acted upon.")
      if (actions[BoardRuleActions.Star] != null) {
        const strategy = actions[BoardRuleActions.Star] ? this.operator.star : this.operator.unstar
        await strategy(email.folder, email.M.envelope.uid)
        this.Log.log("MID", mid, "was", actions[BoardRuleActions.Star] ? "starred" : "unstarred")
      }
      if (actions[BoardRuleActions.Forward]) {
        // TODO: communicate to frontend that it should be marked for forwarding
        this.Log.warn("MID", mid, "could not be marked for forwarding. NOT IMPLEMENTED")
      }
      if (actions[BoardRuleActions.Move]) {
        const destFolder = actions[BoardRuleActions.Move] as string
        //? Check to see if we actually need to move it
        if (!(folders.includes(destFolder))) {
          if (inboxLOC) {
            //? determine existing boards
            const _this = this
            const boards = folders.filter(folder => _this.folders.isBoard(folder))
            //? copy to new folder
            await this.operator.copy(inboxLOC.folder, inboxLOC.uid, destFolder)
            //? if in new board remove from existing boards
            if (this.folders.isBoard(destFolder)) {
              for (const board of boards) {
                const loc = getLocation(message.locations, board)
                if (!loc) continue;
                this.operator.delete(board, loc?.uid)
              }
            }
          } else {
            await this.operator.move(message.locations[0].folder, message.locations[0].uid, destFolder)
          }
        }
      }
      if (actions[BoardRuleActions.Delete]) {
        //! FIXME: do I need to do a recursive delete on threads?
        if (inboxLOC) {
          await this.operator.delete(inboxLOC.folder, inboxLOC.uid)
        } else {
          await this.operator.delete(email.folder, email.M.envelope.uid)
        }
      }
      if (actions[BoardRuleActions.Archive]) {
        if (inboxLOC) {
          await this.operator.archive(inboxLOC.folder, inboxLOC.uid)
        } else {
          await this.operator.archive(email.folder, email.M.envelope.uid)
        }
      }
    }
  }

}