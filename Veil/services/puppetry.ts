import RemoteLogger from "@Veil/services/roots";
import GuidepostPuppeteer from "@Marionette/puppeteers/guidepost";
import InboxPuppeteer from "@Marionette/puppeteers/inbox";
import { ref } from "@vue/reactivity"
import { type Maybe, Singleton } from "@Iris/common/types";

const Logger = (name: string) => new RemoteLogger(name, {
  bgColor: "#ff99ff",
  fgColor: "#000000"
})

const Guidepost = new GuidepostPuppeteer({logger: Logger("Guidepost")})

//* Puppeteers
export const Inbox = ref<Maybe<InboxPuppeteer>>(null)




//? Initialize necessary puppeteers
export const init = async () => {
  Inbox.value = new InboxPuppeteer(
    await Guidepost.get.singleton(Singleton.INBOX),
    { logger: Logger("Inbox") }
  )
  await Inbox.value.init()
}


// @ts-ignore
window.puppetry = {
  inbox: Inbox
}