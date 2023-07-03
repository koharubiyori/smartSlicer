import { BrowserWindow, ipcMain, ipcRenderer } from 'electron'

export default function createIpcChannel<T extends { [actionName: string]: (this: BrowserWindow, ...args: any[]) => any }>(channelName: string, actions: T) {
  function initIpcChannel(mainWindow: BrowserWindow) {
    ipcMain.handle(channelName, (e, actionName, ...args) => {
      const targetAction = actions[actionName]
      return targetAction.call(mainWindow, ...args)
    })
  }

  function getChannelClient() {
    type ChannelClient = {
      [ActionName in keyof T]: (...args: Parameters<T[ActionName]>) => Promise<ReturnType<T[ActionName]>>
    }

    return new Proxy({} as ChannelClient, {
      get(target, getter) {
        return (...args: any[]) => ipcRenderer.invoke(channelName, getter, ...args)
      }
    })
  }

  return { initIpcChannel, getChannelClient }
}
