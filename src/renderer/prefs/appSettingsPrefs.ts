import { AppSettings } from '~/store/main'
import PlainPrefs from './utils/plainPrefs'

const defaultValue: AppSettings = {
  useGpu: true,
  outputAudioOnly: true,
  ffmpegWorkingNum: 2,
  languageForGenerateSubtitle: 'auto',
  modelForGenerateSubtitle: 'small'
}

const appSettingsPrefs = new PlainPrefs('appSettingsPrefs', defaultValue).prefs

export default appSettingsPrefs
