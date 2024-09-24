import { BrowserWindow } from 'electron'
import { windowIpc } from './modules/window'
import { dialogIpc } from './modules/dialog'
import { appIpc } from './modules/app'
import { pythonIpc } from './modules/python'
import { ffmpegIpc } from './modules/ffmpeg'
import { PythonShell } from 'python-shell'
import { FFMPEG_BIN_PATH, PYTHON_PATH } from '../constants'

PythonShell.defaultOptions = {
  pythonPath: PYTHON_PATH,
  pythonOptions: ['-u'],
  env: { Path: [FFMPEG_BIN_PATH, 'D:\\_myProject\\smartSlicer\\envs\\cuda'].join(';') }
}

export default function initIpcHub(mainWindow: BrowserWindow) {
  [
    windowIpc,
    dialogIpc,
    appIpc,
    pythonIpc,
    ffmpegIpc,
  ].forEach(item => item.initIpcChannel(mainWindow))
}
