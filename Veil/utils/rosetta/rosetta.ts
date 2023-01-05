import RosettaStoneAll from "@Veil/utils/rosetta/rosetta.json"
import { reactive } from "@vue/reactivity"

//? Fallback logic, first-come-first-serve
const FALLBACK: {
  language: string[]
  platform: string[]
} = {
  language: ["default", "en-US", "en"],
  platform: ["default", "win32", "darwin", "linux"],
}

//? Manage defaults
export const SETTINGS = reactive({
  language: "en-US",
  platform: "darwin",
})

interface StoneDefinition {
  definitions: {
    [language: string]: {
      [platform: string]: string
    }
  }
}

export const i18n = (Defn: StoneDefinition) => {
  const { definitions } = Defn
  const { language, platform } = SETTINGS

  return definitions[language]?.[platform] ??
    FALLBACK.platform.map(
      plat => definitions[language]?.[plat]
    ).find(Boolean) ??
    FALLBACK.language.map(lang =>
      definitions[lang]?.[platform] ??
      FALLBACK.platform.map(
        plat => definitions[lang]?.[plat]
      ).find(Boolean)
    ).find(Boolean) ??
    "???"
}
export const RosettaStone = reactive(RosettaStoneAll)