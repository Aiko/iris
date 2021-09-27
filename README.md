# VIDEO TRACKLIST

- [ ] Go to aikomail.com
- [ ] Click download
- [ ] Sign into app (fake that its easy)
- [ ] Board explanation
- [ ]    -to do
- [ ]    -custom boards
- [ ]    -board rules
- [ ]    -drag and drop
- [ ] Priority/Other and Unsubscribe demo
- [ ] Summary in email card demo
- [ ] Quick actions explanation
- [ ]    -schedule example
- [ ]    -sign document
- [ ]    -quick reply
- [ ] Compose/Templates
- [ ] In app notifications
- [ ]    -priansh opened email
- [ ] Native Notifications( fake it)
- [ ]    -copy 2fa code

Maybe:
- [ ] Undo send
- [ ] Gpt3 equivalent but mentioning this is for v2

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