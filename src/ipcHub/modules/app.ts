import { app, App } from 'electron'
import createIpcChannel from '../createIpcChannel'

export const appIpc = createIpcChannel('app', {
  getGpuInfo() {
    return app.getGPUInfo('complete') as any
  },
})

export const appIpcClient = appIpc.getChannelClient()
