import { dialog, MessageBoxOptions, OpenDialogOptions } from 'electron'
import createIpcChannel from '../createIpcChannel'

export const dialogIpc = createIpcChannel('dialog', {
  showOpenDialog(options: OpenDialogOptions) {
    return dialog.showOpenDialog(this.mainWindow, options)
  },

  showMessageBox(options: MessageBoxOptions) {
    return dialog.showMessageBox(options)
  }
})

export const dialogIpcClient = dialogIpc.getChannelClient()
