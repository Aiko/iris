import autoBind from 'auto-bind'
import { shell, powerMonitor, BrowserWindow, app, nativeTheme } from 'electron'
import path from 'path'
import type { Chiton } from '@Chiton/app'
import SockPuppet from '@Marionette/ws/sockpuppet'

export enum WindowEvents {
	FULLSCREEN="fullscreen",
	MAXIMIZE="maximize",
	BEFORE_QUIT="before-quit",
	WOKE_FROM_SLEEP="woke-from-sleep",
	RESIZE="resize",
	OS_THEME_CHANGED="os-theme-changed",
}

export abstract class Window extends SockPuppet {

	windowPuppetry = {
		maximize: this.maximize,
		unmaximize: this.unmaximize,
		minimize: this.minimize,
		setFullScreen: this.setFullScreen,
		getFullScreen: this.getFullScreen,
		close: this.close,
		hide: this.hide,
		focus: this.focus,
		findInWindow: this.findInWindow,
	}

	puppetry = {
		window: this.windowPuppetry
	}

	protected readonly win: BrowserWindow
	maximize() { this.win.maximize(); return true }
  unmaximize() { this.win.unmaximize(); return true }
  minimize() { this.win.minimize(); return true }
  setFullScreen(s: boolean) { this.win.setFullScreen(s); return true }
	getFullScreen(): boolean { return this.win.isFullScreen(); return true }
  close() { this.win.close(); return true }
  hide() { this.win.hide(); return true }
  focus() { this.win.show(); this.win.focus(); return true }
  findInWindow() { this.win.webContents.findInPage(""); return true }

	protected constructor(
		protected readonly chiton: Chiton,
		name: string,
		{
			closable=true,
			spellcheck=false,
			winArgs={},
		}: {
			closable?: boolean,
			spellcheck?: boolean,
			winArgs?: Partial<Electron.BrowserWindowConstructorOptions>
		} ={},
		onDeploy?: () => void
	) {
		super(name, {
			forest: chiton.forest,
			renderer: false
		})
		const _this = this

		this.win = new BrowserWindow({
			show: false,
			frame: process.platform == 'darwin',
			titleBarStyle: 'hidden',
			webPreferences: {
				nodeIntegration: false,
				spellcheck,
				backgroundThrottling: false,
				preload: path.join(__dirname, 'preload.js'), //! FIXME: migrate away from preload
			},
      icon: process.platform == 'darwin' ? './icon-darwin.png' : './icon-win32.png',
      roundedCorners: true,
			vibrancy: "under-window",
			visualEffectState: "active",
			...winArgs
		})

		this.win.on('enter-full-screen', () => _this.trigger(WindowEvents.FULLSCREEN, true))
		this.win.on('leave-full-screen', () => _this.trigger(WindowEvents.FULLSCREEN, false))
		this.win.on('enter-html-full-screen', () => _this.trigger(WindowEvents.FULLSCREEN, true))
		this.win.on('leave-html-full-screen', () => _this.trigger(WindowEvents.FULLSCREEN, false))
		this.win.on('maximize', () => _this.trigger(WindowEvents.MAXIMIZE, true))
		this.win.on('unmaximize', () => _this.trigger(WindowEvents.MAXIMIZE, false))
		let quitting = false
		app.on("before-quit", _ => {
			quitting = true
			_this.trigger(WindowEvents.BEFORE_QUIT, {})
		})
		this.win.on("close", e => {
			if (!closable && !quitting && process.platform === "darwin") {
				_this.Log.log("Preventing window from closing (hiding instead).")
				e.preventDefault()
				_this.win.hide()
				return false
			}
		})
		powerMonitor.on('resume', () => _this.trigger(WindowEvents.WOKE_FROM_SLEEP, {}))
		this.win.on('resize', () => _this.trigger(WindowEvents.RESIZE, {}))
		nativeTheme.on('updated', () => _this.trigger(WindowEvents.OS_THEME_CHANGED, {}))

		//! force OS to handle links in default browser
		this.win.webContents.setWindowOpenHandler(details => {
			shell.openExternal(details.url)
			return { action: "deny" }
		})

		//? If it's already fullscreen save that state
		if (this.win.isFullScreen()) this.setFullScreen(true)

		this.deploy().then(onDeploy)
		autoBind(this)
	}

	loadURL(url: string, args?: Electron.LoadURLOptions) {
		if (!this.win) throw "Window has not been set. Cannot load URL."
		this.win.loadURL(url, {
			userAgent: this.chiton.config.user_agent,
			...args
		})
	}

}