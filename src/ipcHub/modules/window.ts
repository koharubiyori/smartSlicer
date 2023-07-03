import createIpcChannel from '../createIpcChannel'

export const windowIpc = createIpcChannel('window', {
  minimize() {
    this.minimize()
  },

  toggleMaximize() {
    const isMaximized = this.isMaximized()
    isMaximized ? this.unmaximize() : this.maximize()
    return !isMaximized
  },

  isMaximized() {
    return this.isMaximized()
  },

  close() {
    this.close()
  }
})


export const windowIpcClient = windowIpc.getChannelClient()
