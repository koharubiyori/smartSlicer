import { BrowserWindow } from 'electron'
import { windowIpc } from './modules/window'
import { dialogIpc } from './modules/dialog'
import { appIpc } from './modules/app'
import { pythonIpc } from './modules/python'
import { ffmpegIpc } from './modules/ffmpeg'

export default function initIpcHub(mainWindow: BrowserWindow) {
  [
    windowIpc,
    dialogIpc,
    appIpc,
    pythonIpc,
    ffmpegIpc,
  ].forEach(item => item.initIpcChannel(mainWindow))
}
