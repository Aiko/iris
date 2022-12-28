import { ipcRenderer, contextBridge } from 'electron'

contextBridge.exposeInMainWorld('platform', process.platform)

contextBridge.exposeInMainWorld('ChitonVeryInsecureIPC', ipcRenderer)
contextBridge.exposeInMainWorld("ChitonInsecureIPC", {
  ipcHandler: (event: string, cb: any) => ipcRenderer.on(event, cb),
})