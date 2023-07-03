import { app } from 'electron'

// 返回值不一定对
export async function getGpuList(): Promise<('NVIDIA' | 'AMD')[]> {
  const gpuInfo = await app.getGPUInfo('complete') as any
  const rawGpuList = gpuInfo.gpuDevice.map((item: any) => item.driverVendor).filter((item: any) => !!item)
  return Array.from(new Set(rawGpuList))
}
