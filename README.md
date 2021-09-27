# VIDEO TRACKLIST

Storyboard:
- [x] Go to aikomail.com
- [x] Click download
- [ ] Sign into app (fake that its easy)
- [ ] Board explanation
    - [x] to do
    - [x] custom boards
    - [ ] board rules
    - [x] drag and drop
- [x] Priority/Other and Unsubscribe demo
- [ ] Summarizer
    - [x] Summary in email card demo
    - [ ] Highlight in-email
- [ ] Quick Actions
    - [ ] schedule example
    - [ ] sign document
    - [ ] quick reply
- [ ] Compose
    - [x] Smart Contacts
    - [x] Supercharged Composer
    - [ ] Smart Compose
    - [ ] Templates
    - [ ] Recent Attachments
- [ ] In-app notifications
    - [ ] Priansh opened email
- [ ] Native Notifications( fake it)
    - [ ] Copy 2fa code

Maybe:
- [ ] Undo send
- [ ] GPT-3 equivalent but mentioning this is for v2

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
