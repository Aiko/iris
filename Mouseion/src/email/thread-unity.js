module.exports = () => (configs, cache, Folders, Operator) => {
  let threads_managed = {}
  let queue = []
  const unite_thread = async tid => {
    if (threads_managed[tid]) return;

    //? loop through the entire thread, making sure everything is only in one board
    //? by default, uses the latest board as the main board
    //? by default, only copies messages that are in the inbox to the board
    // TODO: we might need to check trash as well here for unity...
    await cache.update.refreshThread(tid)
    const thread = await cache.lookup.tid(tid)
    if (!thread) return; // doesn't work on messages not threaded
    let main_board = null
    const thread_messages = await Promise.all(thread.mids.map(cache.lookup.mid))
    //? sort ascending date
    thread_messages.sort((m1, m2) => (new Date(m1.timestamp)) - (new Date(m2.timestamp)))
    console.log("uniting thread, newest message has mid", thread_messages?.[0]?.mid)
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

      const in_boards = in_folders.filter(folder => folder.startsWith('[Aiko]'))

      //? if it doesn't contain main board or contains other boards
      if (!(in_boards.includes(main_board)) || in_boards.length > 1) {
        //? delete message from all other boards
        //? move the message from inbox
        console.log("cleaning mid", thread_message.mid)
        for (const {folder, uid} of thread_message.locations) {
          if (folder.startsWith('[Aiko]')) {
            console.log("deleting mid", thread_message.mid, "from", folder)
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

  const unity = async () => {
    for (const tid of queue) {
      await unite_thread(tid)
    }
    queue = []
    threads_managed = {}
  }

  return {
    apply: unity,
    queue: (...args) => {
      queue.push(...args)
    },
  }
}