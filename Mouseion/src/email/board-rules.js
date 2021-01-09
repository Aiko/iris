/*
Board Rules config should be array of board rules: [BoardRule]

Board Rule schema:

{
  folder: String,
  conditions: {
    from: String, // from email address
    to: String, // to email address
    subject: String, // subject contains
    text: String, // text contains
    quick_action: String, // has quick action (final classification)
    subscription: Boolean, // is or is not subscription, can also be thought of as priority
    attachment_type: String, // contains attachment with MIMEType that starts with
  },
  action: [{
    type: String, // based on enum for boardruleactions defined below
    value: String or Boolean, // depends on type
    ! type: archive is not rigged yet
  }]
}

? To not have a condition/action, just don't set it or specify it as null


! For forward, it might be better to just create a forward specific board
! e.g. [Aiko]/Send to <Contact Name>
! and let the client handle this

*/

module.exports = () => (configs, cache, Folders, Operator) => {
  let board_rule_queue = []
  const threads_managed = {}
  const BoardRuleActions = {
    Star: "star",
    Forward: "forward",
    Move: "move",
    Delete: "delete",
    Archive: "archive"
  }
  const unite_thread = async tid => {
    //? loop through the entire thread, making sure everything is only in one board
    //? by default, uses the latest board as the main board
    //? by default, only copies messages that are in the inbox to the board
    const thread = await cache.lookup.tid(tid)
    if (!thread) return; // doesn't work on messages not threaded
    let main_board = null
    const thread_messages = await Promise.all(thread.mids.map(cache.lookup.mid))
    //? sort ascending date
    thread_messages.sort((m1, m2) => (new Date(m1.timestamp)) - (new Date(m2.timestamp)))
    //? find main board (working backwards because only latest matters)
    for (let i = thread_messages.length - 1; i > -1; i--) {
      const in_boards = thread_messages[i].locations
        .map(({ folder }) => folder)
        .filter(folder => folder.startsWith('[Aiko]'));
      if (in_boards.length > 0) {
        main_board = in_boards.reduceRight(_ => _)
        break;
      }
    }

    if (!main_board) return (threads_managed[tid] = true); // there's no main board

    //? move/copy everything to that
    for (const thread_message of thread_messages) {
      const in_folders = thread_message.locations.map(({ folder }) => folder)

      //? we don't care if not in inbox
      if (!in_folders.includes(Folders.get().inbox)) continue;

      const in_boards = in_folders.filter(folder.startsWith('[Aiko]'))

      //? if it doesn't contain main board or contains other boards
      if (!in_boards.includes(main_board) || in_boards.length > 1) {
        //? delete message from all other boards
        //? move the message from inbox
        for (const {folder, uid} of thread_message.locations) {
          if (folder.startsWith('[Aiko]')) {
            await Operator.delete(folder, uid)
          }
          if (folder == Folders.get().inbox) {
            await Operator.copy(folder, uid, main_board)
          }
        }
      }

    }

    threads_managed[tid] = true
  }
  const apply_rules = rules => async email => {
    if (!email.parsed.text) return; // only applies rules to L3 messages
    if (!email.M.envelope.mid) return; // doesn't work on no mid msg
    const msg = await cache.lookup.mid(email.M.envelope.mid)
    if (!msg) return; // doesn't work on messages not cached

    const inbox_loc = msg.locations.filter(({ folder }) => folder == Folders.get().inbox)?.[0]
    const in_folders = msg.locations.map(({ folder }) => folder)

    // actions can only take place once, and should be in order:
    // star, forward, copy, archive OR delete (not both)
    const actions = {}

    if (!threads_managed[msg.tid]) await unite_thread(msg.tid)

    for (const {
        folder,
        conditions,
        action
      } of rules) {
      let conditions_met = folder == email.folder
      if (!conditions_met) continue;
      if (conditions.from) {
        const match = (email.M.envelope.from.address == conditions.from)
        conditions_met = conditions_met && match
        if (!conditions_met) continue;
      }
      if (conditions.to) {
        const match = email.M.envelope.to
          .filter(({
            address
          }) => address == conditions.to)
          .length > 0;
        conditions_met = conditions_met && match
        if (!conditions_met) continue;
      }
      if (conditions.subject) {
        const match = email.M.envelope.subject.includes(conditions.subject)
        conditions_met = conditions_met && match
        if (!conditions_met) continue;
      }
      if (conditions.quick_action) {
        const match = email.M.quick_actions.classification == conditions.quick_action
        conditions_met = conditions_met && match
        if (!conditions_met) continue;
      }
      if (conditions.subscription != null) {
        const match = email.M.subscription.subscribed == conditions.subscription
        conditions_met = conditions_met && match
        if (!conditions_met) continue;
      }
      if (conditions.text) {
        const match = email.parsed.text.includes(conditions.text)
        conditions_met = conditions_met && match
        if (!conditions_met) continue;
      }
      if (conditions.attachment_type) {
        // TODO: type should be bucketed maybe
        const match = email.parsed.attachments.filter(
          attachment => attachment.contentType.startsWith(conditions.attachment_type)
        ).length > 0
        conditions_met = conditions_met && match
        if (!conditions_met) continue;
      }
      action.map(({type, value}) => {
        if (actions[type]) return;
        actions[type] = value
      })
    }

    if (actions[BoardRuleActions.Star] != null) {
      const flagstaff = Operator.flags
      const strategy = actions[BoardRuleActions.Star] ? flagstaff.star : flagstaff.unstar
      await strategy(email.folder, email.M.envelope.uid)
    }
    if (actions[BoardRuleActions.Forward]) {
      // TODO: communicate that it should be marked for forwarding
    }
    if (actions[BoardRuleActions.Move]) {
      //* check to see if its already moved
      if (!(in_folders.includes(actions[BoardRuleActions.Move]))) {
        const strategy = (email.folder == Folders.inbox) ? Operator.copy : Operator.move;
        await strategy(email.folder, email.M.envelope.uid, actions[BoardRuleActions.Move])
        // FIXME: there may be lag in uniting threads until the next sync
      }
    }
    if (actions[BoardRuleActions.Delete]) {
      await Operator.delete(inbox_loc?.folder || email.folder, inbox_loc?.uid || email.M.envelope.uid)
    } else if (actions[BoardRuleActions.Archive]) {
      // TODO: archive
    }
  }

  const do_apply_rules = async () => {
    const rules = configs.load("board-rules")
    if (!rules) {
      //! TODO: this should sync to a server or something.
      configs.store('board-rules', [])
      return await do_apply_rules()
    }

    console.log("Applying", rules.length, "rules")

    const handler = apply_rules(rules)

    for (const email of board_rule_queue)
      await handler(email)
    board_rule_queue = []

    return true
  }

  return {
    apply: do_apply_rules,
    queue: (...args) => {
      board_rule_queue.push(...args)
    }
  }
}