import p from 'path'
import { appIpcClient } from 'ipcHub/modules/app'

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

export function isVisible(domElement: Element): Promise<boolean> {
  return new Promise((resolve) => {
    const o = new IntersectionObserver(([entry]) => {
      resolve(entry.intersectionRatio === 1)
      o.disconnect()
    })
    o.observe(domElement)
  })
}

export function getBaseFirstName(path: string) {
  return p.basename(path, p.extname(path))
}
