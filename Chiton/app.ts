import * as Sentry from '@sentry/electron'
//! Sentry should be the first thing to load in the entire app.
Sentry.init({ dsn: "https://611b04549c774cf18a3cf72636dba7cb@o342681.ingest.sentry.io/5560104" });

import os from 'os'
import { app, session, dialog, powerSaveBlocker } from 'electron'
import Forest from '@Iris/common/logger'
import SecureCommunications from '@Marionette/ipc'
import Roots from '@Chiton/services/roots'
import GOAuth from '@Chiton/services/oauth/google'
import MSOAuth from '@Chiton/services/oauth/microsoft'
import * as child_process from 'child_process';
import autoBind from 'auto-bind';
import SockPuppet from '@Marionette/ws/sockpuppet';
import { RESERVED_PORTS } from '@Iris/common/port';
import SettingsStore from '@Chiton/store/settings';
import Inbox from '@Chiton/components/inbox';
import { autoUpdater } from 'electron';

//! Singleton
export class Chiton extends SockPuppet {

	checkInitialize(): boolean { return true }
	async initialize(args: any[], success: (payload: object) => void) { return success({}) }

	readonly config = {
		version: app.getVersion(),
		platform: os.platform(),
		devMode: process.env.NODE_ENV === 'dev',
		channel: "Stable",
		enableAuditing: false,
		user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.82 Safari/537.36 Edg/93.0.961.52",
		secrets: {
			googleClientId: '446179098641-5cafrt7dl4rsqtvi5tjccqrbknurtr7k.apps.googleusercontent.com',
			microsoftClientId: '65b77461-4950-4abb-b571-ad129d9923a3',
		}

	}

	readonly version_hash: string
	private readonly updateInterval: NodeJS.Timer | null

	readonly comms: SecureCommunications
	readonly forest: Forest
	readonly settingsStore: SettingsStore
	inbox?: Inbox

	private constructor() {
		//*** Electron

		//? Lumberjack
		Roots.init() //! must proceed super
		const forest = new Forest("logs-chiton")
		super("Chiton", {
			forest,
			renderer: false,
		}, RESERVED_PORTS.CHITON)
		this.forest = forest
		const _this = this

		if (require('electron-squirrel-startup')) {
      this.Log.error("App is being installed. Quitting to prevent unintended side effects.")
      app.quit()
      process.exit(0)
    }

		//? Marionette
		this.comms = SecureCommunications.init()

		//? CLI switches
		app.commandLine.appendSwitch('disable-renderer-backgrounding')
		app.commandLine.appendSwitch('disable-background-timer-throttling');
		app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
		//? Kill error popups
		dialog.showErrorBox = (title, content) => _this.Log.warn(
			`Chiton error.\n${title}\n${content}\n--------------------`
		)
		//? Prevent getting throttled
		powerSaveBlocker.start('prevent-app-suspension')
		//? Handle quitting on Mac
		app.on("window-all-closed", () => {
			// TODO: live on in the tray
			if (process.platform !== 'darwin') app.quit()
		})


		//? Fingerprinting
		this.version_hash = (() => {
			if (_this.config.devMode) {
				const commit_hash = child_process.execSync('git rev-parse HEAD').toString().trim()
				app.setAppUserModelId(`Aiko Mail (Dev) #${commit_hash.slice(0, 8)}`)
				_this.Log.warn(`Enabled developer mode (#${commit_hash})`)
				return commit_hash
			}
			app.setAppUserModelId("Aiko Mail (Beta)")
			switch(this.config.platform) {
				case 'win32':
					return '(Windows) ' + _this.config.version;
				case 'darwin':
					return '(MacOS) ' + _this.config.version;
				case 'linux':
					return '(Linux) ' + _this.config.version;
				default:
					return '(Emulated) ' + _this.config.version;
			}
		})()

		//? Automatic Updates
		if (this.config.devMode) {
			this.Log.warn("Automatic updates are disabled in developer mode.")
			this.updateInterval = null
		} else {
			autoUpdater.on("error", _this.Log.error)
			autoUpdater.on("checking-for-update", () => _this.Log.log("Checking for updates..."))
			autoUpdater.on("update-available", () => {
				_this.Log.log("Update available! Downloading...")
				_this.updateInterval?.unref()
			})
			autoUpdater.on("update-not-available", () => _this.Log.success("App is up to date."))
			autoUpdater.on("before-quit-for-update", () => _this.Log.shout("Installing update..."))
			// @ts-ignore: This may exist and just not be typed
			autoUpdater.on("download-progress", (progress) => _this.Log.log(`Downloading update... ${progress.percent}%`))
			autoUpdater.on("update-downloaded", async (event, releaseNotes, releaseName) => {
				_this.Log.success("Update is ready to install:", releaseName)
				_this.inbox?.onUpdateAvailable(releaseName, releaseNotes)
			})
			const feed = `https://knidos.helloaiko.com/update/${_this.config.channel}/${_this.config.platform}/${_this.config.version}`
			autoUpdater.setFeedURL({ url: feed })
			autoUpdater.checkForUpdates()
      this.updateInterval = setInterval(autoUpdater.checkForUpdates, 5 * 60 * 1000)
		}

		//? Stores
		this.settingsStore = new SettingsStore(this)
		this.settingsStore.deploy()

		app.once('ready', this.setup)

		autoBind(this)
	}

	private async setup() {
		//? Impersonate Chrome in regular fetch requests
		session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
			details.requestHeaders["User-Agent"] = this.config.user_agent
			callback({ cancel: false, requestHeaders: details.requestHeaders })
		})

		this.inbox = new Inbox(this, {
			demoMode: true
		})

		app.on('activate', this.inbox.focus)

		const goauth = new GOAuth(this, ["https://mail.google.com"])
		await goauth.deploy()

		const msoauth = new MSOAuth(this)
		await msoauth.deploy()
	}

	private static me?: Chiton
	static init() {
		if (Chiton.me) return Chiton.me
		Chiton.me = new Chiton()
		return Chiton.me
	}

	private updateAndRestart() {
		autoUpdater.quitAndInstall()
		return true
	}

	puppetry = {
		app: {
			updateAndRestart: this.updateAndRestart
		}
	}

}

export default Chiton.init()