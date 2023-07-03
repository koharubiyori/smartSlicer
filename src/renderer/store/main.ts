import { SupportedLanguages } from 'ipcHub/modules/python/utils/callWhisper'
import { makeAutoObservable } from "mobx"
import appSettingsPrefs from '~/prefs/appSettingsPrefs'

class MainStore {
  videoInputPath: string = ''
  subtitleInputPath: string = ''
  slicesPath: string = ''
  outputPath: string = ''

  sliceList: VideoSlice[] | null = null

  appSettings = {
    useGpu: true,
    outputAudioOnly: false,
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
}

export default MainStore

export class VideoSlice {
  speaker: string | null = null
  filePath: string
  cutRange: [number, number] | null = null
  modified = false

  constructor(filePath: string, speaker: string | null = null) {
    this.filePath = filePath
    this.speaker = speaker
  }
}

export type AppSettings = MainStore['appSettings']
