import type { ISettings } from "@Chiton/store/settings";
import DwarfStarPuppeteer from "./generic/dwarf-star";
import type { Logger, LumberjackEmployer } from "@Iris/common/types";

export default class SettingsPuppeteer extends DwarfStarPuppeteer<ISettings> {
  constructor(port: number, opts: {
    logger?: Logger,
    employer?: LumberjackEmployer,
  }) {
    super("Settings", port, opts)
  }
}