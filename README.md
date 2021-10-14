# VIDEO TRACKLIST

Storyboard:
- [x] ~Go to aikomail.com~
- [x] ~Click download~
- [ ] Sign into app
- [ ] Board explanation
    - [x] ~To-Do and Done~
    - [x] ~Custom boards~
    - [ ] Board Rules
    - [x] ~Drag and Drop~
- [x] ~Priority/Other and Unsubscribe demo~
- [ ] Summarizer
    - [x] ~Summary in email card demo~
    - [ ] Highlight in-email
- [ ] Quick Actions
    - [ ] Schedule
    - [ ] Sign Document
    - [ ] ~Quick Reply~
- [ ] Compose
    - [x] ~Smart Contacts~
    - [x] ~Supercharged Composer~
    - [ ] Smart Compose
    - [ ] Templates
    - [ ] Recent Attachments
- [ ] In-app notifications
    - [ ] Priansh opened email
- [ ] Native Notifications
    - [ ] Copy 2fa code

Maybe:
- [ ] Undo send
- [ ] GPT-3 equivalent but mentioning this is for v2

# JINKIES SCOOB, HOW DO I RUN THIS?

```
npm i -g typescript @vue/cli
npm i
npm restart
```

**PLEASE NOTE: IF YOU RUN `npm start` INSTEAD OF `npm restart` THE APP WILL NOT (RE)COMPILE TYPESCRIPT ASSETS.**
**YOU WILL HAVE AN OLD VERSION OF THE CODE IF THIS HAPPENS.**

# OH NO's

> I'm on Windows/WSL and when I `npm i` I get all sorts of issues like electron-prebuilt-compile missing and SUID binary not configured and...

Hush my dear child, just `npm i electron` in the directory but from `cmd.exe` (command prompt) so it permanently shuts up. If you don't want to do this then:

``` bash
npm uninstall electron
export npm_config_platform=win32
npm install electron
unset npm_config_platform
```

Also install `@electron-forge/cli` globally (i.e. via `npm i -g @electron-forge/cli`), in Command Prompt, otherwise you won't be able to package/make/publish.

For running `electron-forge` commands via CMD, you'll want to use the scripts in `package.json` that have `-windows` appended to them. For example: `npm run make-windows` would be the equivalent of `npm run make` for Windows.

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
