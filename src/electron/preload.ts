import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI',{
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  getWoWDirectory: () => ipcRenderer.invoke('wow:directory'),
  setWoWDirectory: () => ipcRenderer.invoke('wow:setDirectory'),
  installAddon: (args: {name: string, url: string, version: string}) => ipcRenderer.invoke('addon:install', args),
  getInstalledAddons: () => ipcRenderer.invoke('addon:installed'),
})

export {};