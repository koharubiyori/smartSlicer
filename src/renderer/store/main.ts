import { SupportedLanguages } from 'ipcHub/modules/python/utils/callWhisper'
import { makeAutoObservable } from "mobx"
import path from 'path'
import appSettingsPrefs from '~/prefs/appSettingsPrefs'
import { projectFileName, saveProjectFile } from '~/views/fragments/operationPanel/utils/loadSlices'

class MainStore {
  videoInputPath: string = ''
  subtitleInputPath: string = ''
  slicesPath: string = ''
  outputPath: string = ''

  sliceList: VideoSlice[] | null = null
  activeSlicesPath: string = ''   // 在读取切片时会将slicesPath的值赋给这个变量

  appSettings = {
    useGpu: true,
    outputAudioOnly: false,
    ffmpegWorkingNum: 2,
    languageForGenerateSubtitle: 'zh' as SupportedLanguages,
  }

  constructor() {
    this.appSettings = appSettingsPrefs

    makeAutoObservable(this)
  }

  updateAppSetting<T extends keyof AppSettings>(name: T, value: AppSettings[T]) {
    this.appSettings[name] = value
    appSettingsPrefs[name] = value
  }

  saveCurrentSliceList() {
    saveProjectFile(this.slicesPath, this.sliceList!)
  }
}

export default MainStore

export class VideoSlice {
  constructor(
    public filePath: string,
    public speaker: string | null = null,
    public cutRange: [number, number] | null = null,
    public modified = false
  ) {}
}

export type AppSettings = MainStore['appSettings']
