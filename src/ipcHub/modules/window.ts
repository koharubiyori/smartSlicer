import createIpcChannel from '../createIpcChannel'

export const windowIpc = createIpcChannel('window', {
  minimize() {
    this.mainWindow.minimize()
  },

  toggleMaximize() {
    const isMaximized = this.mainWindow.isMaximized()
    isMaximized ? this.mainWindow.unmaximize() : this.mainWindow.maximize()
    return !isMaximized
  },

  isMaximized() {
    return this.mainWindow.isMaximized()
  },

  close() {
    this.mainWindow.close()
  }
})


export const windowIpcClient = windowIpc.getChannelClient()
