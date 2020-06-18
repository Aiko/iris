# OH NO

> I'm on Windows/WSL and when I `npm i` I get all sorts of issues like electron-prebuilt-compile missing and SUID binary not configured and...

Hush my dear child, just `npm i electron` in the directory but from `cmd.exe` (command prompt) so it permanently shuts up. If you don't want to do this then:

``` bash
npm uninstall electron
export npm_config_platform=win32
npm install electron
unset npm_config_platform
```