import { useEffect } from 'react'
import AppHeader from './appHeader'
import ViewLayout from './layout'
import SettingsFragment from './fragments/settings'
import OperationPanelFragment from './fragments/operationPanel'
import { appIpcClient } from 'ipcHub/modules/app'
import { pythonClient } from 'ipcHub/modules/python'
import { notify } from '~/utils/notify'
import { isNvidiaGpu } from '~/utils/utils'
import SliceListFragment from './fragments/sliceList'
import VideoPlayerFragment from './fragments/videoPlayer'
import { WITHOUT_AI } from '../../constants'

function AppView() {

  useEffect(() => {
    !WITHOUT_AI && checkGpuEnv()
  }, [])

  async function checkGpuEnv() {
    const isNvidiaGPU = await isNvidiaGpu()
    const isCudaAvailable = await pythonClient.isCudaAvailable()

    !isNvidiaGPU && notify.warning('未检测到N卡，无法使用切片自动筛选')
    isNvidiaGPU && !isCudaAvailable && notify.error('CUDA没有正确配置，可能无法使用切片自动筛选！')
  }

  return (
    <ViewLayout
      header={<AppHeader />}
      settings={<SettingsFragment />}
      sliceList={<SliceListFragment />}
      operationPanel={<OperationPanelFragment />}
      videoPlayer={<VideoPlayerFragment />}
    />
  )
}

export default AppView
