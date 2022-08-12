import { ipcRenderer, contextBridge } from 'electron'
contextBridge.exposeInMainWorld('platform', process.platform)
contextBridge.exposeInMainWorld('ipcRenderer', ipcRenderer)
contextBridge.exposeInMainWorld("api", {
  ipcHandler: (event: string, cb: any) => ipcRenderer.on(event, cb),
})