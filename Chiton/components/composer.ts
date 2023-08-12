import type { Chiton } from "@Chiton/app";
import { Window } from "@Chiton/components/window";
import { RESERVED_PORTS } from "@Iris/common/port";
import { Multiton } from "@Iris/common/types";
import autoBind from "auto-bind";
import crypto from "crypto";
import { dialog } from "electron";
import fs from 'fs-extra';
import mime from 'mime';
import writeGood from "write-good";

interface ComposerAttachment {
	size: number
	contentType: string
	filepath: string
}

export default class Composer extends Window {

	ID: string = crypto.randomBytes(6).toString('hex')

	checkInitialize(): boolean {
		return true
	}
	async initialize(args: any[], success: (payload: object) => void) {
		success({})
	}

	//? persist fullscreen status
	setFullScreen(s: boolean): boolean {
		super.setFullScreen(s)
		return true
	}

	//? allow attaching files
	async attachFiles(): Promise<ComposerAttachment[]> {
		const downloadFolder = (() => {
			switch (process.platform) {
				case "win32": return `${process.env.USERPROFILE}\\Downloads`
				case "darwin": return `${process.env.HOME}/Downloads`
				default: return `${process.env.HOME}/Downloads`
			}
		})();

		const { canceled, filePaths } = await dialog.showOpenDialog({
			title: "Attach a file",
			defaultPath: `${downloadFolder}/`,
			//? copilot wrote this so... I hope it works?
      filters: [
        { name: "All Files", extensions: ["*"] },
        { name: "PDF", extensions: ["pdf"] },
        { name: "Word", extensions: ["doc", "docx"] },
        { name: "Excel", extensions: ["xls", "xlsx"] },
        { name: "PowerPoint", extensions: ["ppt", "pptx"] },
        { name: "Text", extensions: ["txt"] },
        { name: "Image", extensions: ["jpg", "jpeg", "png", "gif"] },
        { name: "Audio", extensions: ["mp3", "wav", "aac"] },
        { name: "Video", extensions: ["mp4", "avi", "mkv"] }
      ]
		})
		if (canceled || filePaths.length === 0) {
			this.Log.warn("Did not select any files.")
			return []
		}
		this.Log.log("Selected files:", filePaths)

		//? Get the filesize and content type of each file
		const files: ComposerAttachment[] = await Promise.all(filePaths.map(async filepath => {
			const { size } = await fs.promises.stat(filepath)
			const contentType = mime.getType(filepath) ?? "application/octet-stream"
			return { size, contentType, filepath }
		}))

    return files
	}

	//? get writing suggestions
	async getWritingSuggestions(text: string, opts?: writeGood.Options): Promise<writeGood.Problem[]> {
		const suggestions = writeGood(text, opts)
		return suggestions
	}

	constructor(chiton: Chiton) {
		super(chiton, "Composer", {
			closable: true,
			spellcheck: true,
			winArgs: {
				fullscreen: chiton.settingsStore.settings.inbox.appearance.fullscreen
			}
		}, () => chiton.guidepost.add(Multiton.COMPOSER, this.ID, this.port))

		this.focus()
		this.loadURL(`http://localhost:${RESERVED_PORTS.VEIL}/composer/${this.ID}`)

		autoBind(this)
	}

}
