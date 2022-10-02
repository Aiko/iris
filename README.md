# Project Iris

This repository houses the core desktop application, nicknamed Iris.

## Getting Started

### Prerequisites

You need Typescript:

```
npm add -g typescript @vue/cli
```

You'll also need VSCode--other editors may work, but we haven't tested them. The recommended extensions are listed in `.vscode/extensions.json` and you'll be prompted to install them; you need both the Volar and Vue TypeScript Extensions.

Next, enable Take Over mode in Volar. This is a setting that allows Volar to take over the TypeScript language server for Vue files. To enable Take Over mode, you simply need to disable the default Typescript extension:

1. Open the Command Palette (Ctrl+Shift+P)
2. Select "Extensions: Show Built-in Extensions"
3. Search for Typescript
4. Disable Typescript language features (first one)

Then, install the dependencies (for Windows, see Oh noes! section below):

```
npm add
```

Finally, reload your window in VSCode by pressing Ctrl+Shift+P and selecting "Developer: Reload Window".

### Development

You can run the app in development mode with:

```
npm restart
```

This will spin up both Vite and Electron. You can optionally access the app in your web browser (without any Electron features, so it will be broken) at `http://localhost:4160`.

**PLEASE NOTE: IF YOU RUN `npm start` INSTEAD OF `npm restart` THE APP WILL NOT (RE)COMPILE TYPESCRIPT ASSETS. THIS MAY CAUSE FAILURES--ALWAYS NPM RESTART!**

When you're performing QA testing, run the app in production mode with:

```
npm run restart:prod
```

Finally, you can build & bundle the app for distribution with:

```
npm run make
```

## Folder Structure

Iris is Electron-based and currently houses three distinct components:

- **Veil** (`public/*`): the frontend for the application, architected in Vue 3. Needs to be built separately from the Electron application, and is served by the Electron application.

- **Chiton** (`app.ts` and `src/*`): the source for the desktop application, which runs on the "main" thread. This is also what governs the application's lifecycle, including the creation of the window, the menu, and the tray icon, as well as power cycle tracking, window management, hotkeys, etc. Some parts of this may pull from Mouseion or interop heavily with the user interface, so it is hardly an isolated component.

- **Mouseion** (`Mouseion/*`): the email engine backing Aiko Mail, which is used by Iris. This was a separate project, but is included in this repository as a submodule. It is capable of acting as a standalone component and handles everything from IMAP communication to threading, message parsing, database management, and more.

## Oh noes, Windows!

> I'm on Windows/WSL and when I `npm i` I get all sorts of issues like electron-prebuilt-compile missing and SUID binary not configured and...

Hush my dear child, just `npm i electron` in the directory but from `cmd.exe` (command prompt) so it permanently shuts up. If you don't want to do this then:

``` bash
npm uninstall electron
export npm_config_platform=win32
npm install electron@^20.0.0
unset npm_config_platform
```

Also install `@electron-forge/cli` globally (i.e. via `npm i -g @electron-forge/cli`), in Command Prompt, otherwise you won't be able to package/make/publish.

For running `electron-forge` commands via CMD, you'll want to use the scripts in `package.json` that have `:windows` appended to them. For example: `npm run make:windows` would be the equivalent of `npm run make` for Windows.

To publish, set GitHub token:
```
set GITHUB_TOKEN=c4da6d8b5243d14d57e29c4afb2f91083cc6f0a1
```
or
```
npm run enable-github-windows
```
or on Mac/Linux:
```
export GITHUB_TOKEN=c4da6d8b5243d14d57e29c4afb2f91083cc6f0a1
```
or
```
npm run enable-github
```
