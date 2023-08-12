import RemoteLogger from "@Veil/services/roots";
import { ref } from "@vue/reactivity"
import { type Maybe, Singleton } from "@Iris/common/types";
import { devMode, platform, setAccentColor } from "@Veil/state/common";
import GuidepostPuppeteer from "@Marionette/puppeteers/guidepost";
import InboxPuppeteer from "@Marionette/puppeteers/inbox";
import ChitonPuppeteer from "@Marionette/puppeteers/chiton";
import SettingsPuppeteer from "@Marionette/puppeteers/settings";

const Logger = (name: string) => new RemoteLogger(name, {
  bgColor: "#ff99ff",
  fgColor: "#000000"
})

const Guidepost = new GuidepostPuppeteer({logger: Logger("Guidepost")})

//* Puppeteers
export const Chiton = ref<Maybe<ChitonPuppeteer>>(null)
export const Inbox = ref<Maybe<InboxPuppeteer>>(null)
export const Settings = ref<Maybe<SettingsPuppeteer>>(null)


//? Initialize necessary puppeteers
export const init = async () => {

  Chiton.value = new ChitonPuppeteer({ logger: Logger("Chiton") })
  const config = await Chiton.value.config()
  devMode.value = config.devMode
  // @ts-ignore
  platform.value = config.platform ?? window.platform

  Inbox.value = new InboxPuppeteer(
    await Guidepost.get.singleton(Singleton.INBOX),
    { logger: Logger("Inbox") }
  )
  await Inbox.value.init()

  Settings.value = new SettingsPuppeteer(
    await Guidepost.get.singleton(Singleton.SETTINGS),
    { logger: Logger("Settings") }
  )
  await Settings.value.get()
  setAccentColor('#' + Settings.value.state!.appearance.accentColor)
}


// @ts-ignore
window.puppetry = {
  chiton: Chiton,
  inbox: Inbox,
  settings: Settings,
}