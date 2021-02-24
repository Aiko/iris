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

module.exports = () => Registry => {

  Configuration = Registry.get('Configuration')
  CacheDB = Registry.get('Cache')
  FolderManager = Registry.get('FolderManager')
  Operator = Registry.get('Operator')
  Lumberjack = Registry.get('Lumberjack')

  const board_rule_queue = []

  const BoardRuleActions = {
    Star: "star",
    Forward: "forward",
    Move: "move",
    Delete: "delete",
    Archive: "archive"
  }

  const apply_rules = rules => async email => {

    //? Check whether board rules can be applied
    if (!email.parsed.text) return; // only applies rules to L3 messages
    if (!email.M.envelope.mid) return; // doesn't work on no mid msg

    //? Find the relevant message
    const msg = await CacheDB.lookup.mid(email.M.envelope.mid)
    if (!msg) return; // doesn't work on messages not cached

    //? Find the location of the message in the inbox and what other folders it is located in
    const inbox_loc = msg.locations.filter(({ folder }) => folder == FolderManager.get().inbox)?.[0]
    const in_folders = msg.locations.map(({ folder }) => folder)

    //! Actions can only take place once, and should be in order:
    //* star, forward, copy, archive OR delete (not both)
    const actions = {}

    //? Build Phase - Decides which rules to apply.
    for (const { folder, conditions, action } of rules) {

      //? Does the rule apply to the email's folder?
      let conditions_met = folder == email.folder
      if (!conditions_met) continue;

      //? Does the sender address match the rule?
      if (conditions.from) {
        const match = (email.M.envelope.from.address == conditions.from)
        conditions_met = conditions_met && match
        if (!conditions_met) continue;
      }

      //? Do the recipients match the rule?
      if (conditions.to) {
        const match = email.M.envelope.to
          .filter(({
            address
          }) => address == conditions.to)
          .length > 0;
        conditions_met = conditions_met && match
        if (!conditions_met) continue;
      }

      //? Does the subject match the rule?
      if (conditions.subject) {
        const match = email.M.envelope.subject.includes(conditions.subject)
        conditions_met = conditions_met && match
        if (!conditions_met) continue;
      }

      //? Does the quick action match the rule?
      if (conditions.quick_action) {
        const match = email.M.quick_actions.classification == conditions.quick_action
        conditions_met = conditions_met && match
        if (!conditions_met) continue;
      }

      //? Does the priority status match the rule?
      if (conditions.subscription != null) {
        const match = email.M.subscription.subscribed == conditions.subscription
        conditions_met = conditions_met && match
        if (!conditions_met) continue;
      }

      //? Does the condition match the rule?
      if (conditions.text) {
        const match = email.parsed.text.includes(conditions.text)
        conditions_met = conditions_met && match
        if (!conditions_met) continue;
      }

      //? Do the attachments match the rule?
      if (conditions.attachment_type) {
        // TODO: type should be bucketed maybe
        const match = email.parsed.attachments.filter(
          attachment => attachment.contentType.startsWith(conditions.attachment_type)
        ).length > 0
        conditions_met = conditions_met && match
        if (!conditions_met) continue;
      }

      //? If everything checks out, add an action to be applied
      action.map(({type, value}) => {
        if (actions[type]) return;
        actions[type] = value
      })
    }

    //? Apply Phase - Apply actions.
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
        const strategy = (email.folder == FolderManager.get().inbox) ? Operator.copy : Operator.move;
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
    const rules = Configuration.load("board-rules")
    if (!rules) {
      //! TODO: this should sync to a server or something.
      Configuration.store('board-rules', [])
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
    },
  }
}