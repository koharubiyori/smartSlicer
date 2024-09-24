import { BrowserWindow, ipcMain, ipcRenderer } from 'electron'

export interface IpcChannelActionContext {
  mainWindow: BrowserWindow
  event: Electron.IpcMainInvokeEvent
}

export interface IpcChannelOrderContext {
  mainWindow: BrowserWindow
  event: Electron.IpcMainEvent
}

export default function createIpcChannel<
  Actions extends { [actionName: string]: (this: IpcChannelActionContext, ...args: any[]) => any },
  Orders extends { [actionName: string]: (this: IpcChannelOrderContext, ...args: any[]) => void }
>(channelName: string, actions: Actions, orders?: Orders) {
  function initIpcChannel(mainWindow: BrowserWindow) {
    ipcMain.handle(channelName, (event, actionName, ...args) => {
      const targetAction = actions[actionName]
      return targetAction.call({ mainWindow, event }, ...args)
    })

    ipcMain.on(channelName, (event, [orderName, ...args]) => {
      orders && orders[orderName].call({ mainWindow, event }, ...args)
    })
  }

  function getChannelClient<Port1MessageData, Port2MessageData>() {
    type ChannelClient = {
      [ActionName in keyof Actions]: (...args: Parameters<Actions[ActionName]>) => Promise<ReturnType<Actions[ActionName]>>
    } & {
      [OrderName in keyof Orders]: (...args: Parameters<Orders[OrderName]>) => MessagePort
    }

    return new Proxy({} as ChannelClient, {
      get(target, getter: string) {
        return (...args: any[]) => {
          if (Object.keys(actions).includes(getter)) return ipcRenderer.invoke(channelName, getter, ...args)
          if (orders && Object.keys(orders).includes(getter)) {
            const { port1, port2 } = new MessageChannel()
            ipcRenderer.postMessage(channelName, [getter, ...args], [port1])
            return port2
          }
          throw Error(`The method '${getter}' is not found in '${channelName}' channel!'`)
        }
      }
    })
  }

  return { initIpcChannel, getChannelClient }
}
