import YAML from "yaml"
import { readFileSync, writeFileSync } from "fs"

//? Add your YAML file under configs and put its name here to load it
const configs = [
  'example', //* -> configs/example.yml
  'default/sidebar',
  'default/sidebar-win',
  'default/sidebar-mac',
	'default/scribe',
	'fr/scribe'
]

interface RosettaDefinition {
  definitions: {
    [language: string]: {
      [platform: string]: string
    }
  }
}
interface RosettaConfig {
  [key: string]: RosettaDefinition | RosettaConfig
}
interface RosettaConfigYAML {
  [key: string]: string | RosettaConfigYAML
}
interface RosettaYAML {
  lang: string
  platform: string
  messages: RosettaConfigYAML
}
const RosettaStone: RosettaConfig = {}

const isDefinition = (obj: RosettaDefinition | RosettaConfig): obj is RosettaDefinition => obj.definitions !== undefined
const isConfig = (obj: RosettaDefinition | RosettaConfig): obj is RosettaConfig => obj.definitions === undefined

//? Load all the configs
configs.forEach((config: string) => {
  const configYAML = YAML.parse(
    readFileSync(`${__dirname}/configs/${config}.yml`, "utf8")
  ) as RosettaYAML;

  const visit = (config: RosettaConfigYAML, stone: RosettaConfig): RosettaConfig => {
    const keys = Object.keys(config)
    keys.forEach((key) => {
      //? if we hit a leaf node, add it to the RosettaStone
      if (typeof config[key] === "string") {
        const value = config[key] as string
        if (!stone[key]) stone[key] = {definitions: {}}
        if (!isDefinition(stone[key])) throw new Error(`Key ${key} conflict: Stone contains config, but YAML contains definition`)
        const Defn = stone[key] as RosettaDefinition
        if (!Defn.definitions[configYAML.lang]) Defn.definitions[configYAML.lang] = {}
        Defn.definitions[configYAML.lang][configYAML.platform] = value
        stone[key] = Defn
      } else {
        if (!stone[key]) stone[key] = {}
        if (!isConfig(stone[key])) throw new Error(`Key ${key} conflict: Stone contains definition, but YAML contains config`)
        stone[key] = visit(config[key] as RosettaConfigYAML, stone[key] as RosettaConfig)
      }
    })
    return stone
  }
  visit(configYAML.messages, RosettaStone)
})

//? Dump the RosettaStone to a JSON file
writeFileSync(`${__dirname}/rosetta.json`, JSON.stringify(RosettaStone, null, 2))
