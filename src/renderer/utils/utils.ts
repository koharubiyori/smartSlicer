import p from 'path'
import fsPromise from 'fs/promises'
import { appIpcClient } from 'ipcHub/modules/app'
import { dialogIpcClient } from 'ipcHub/modules/dialog'

export const supportedVideoExtList =
  'avi|flv|mkv|mov|mp4|m4v|mpeg|webm|wmv|rmvb|m2ts'.split('|')
export const supportedAudioExtList = 'mp3|wav'.split('|')

export async function isNvidiaGpu(): Promise<boolean> {
  const gpuAdapter = await (navigator as any).gpu.requestAdapter()
  const gpuInfo = await gpuAdapter.requestAdapterInfo()
  if (gpuInfo.vendor !== '') {
    return gpuInfo.vendor === 'nvidia'
  } else {
    const gpuInfo = await appIpcClient.getGpuInfo()
    return gpuInfo.gpuDevice.some((item: any) => item.driverVendor === 'NVIDIA')
  }
}

export function addEventListener<K extends keyof HTMLElementEventMap>(
  element: HTMLElement,
  event: K,
  listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any,
  options?: Parameters<typeof document.body.addEventListener>['2']
) {
  element.addEventListener(event, listener, options)
  return () => element.removeEventListener(event, listener)
}

export function isVisibleOnScreen(element: Element): boolean {
  const rect = element.getBoundingClientRect()
  const centralPoint = {
    x: rect.right - rect.width / 2,
    y: rect.bottom - rect.height / 2
  }

  const hitElement = document.elementFromPoint(centralPoint.x, centralPoint.y)
  const isOnTop = hitElement === element || element.contains(hitElement)

  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth) &&
    isOnTop
  )
}

export function getBaseFirstName(path: string) {
  return p.basename(path, p.extname(path))
}

export async function showConfirm({
  title = '提示',
  message = '',
  okText = '确定',
  cancelText = '取消'
}) {
  const result = await dialogIpcClient.showMessageBox({
    title, message,
    type: 'question',
    buttons: [okText, cancelText],
    defaultId: 0,
    noLink: true,
  })

  return result.response === 0
}
