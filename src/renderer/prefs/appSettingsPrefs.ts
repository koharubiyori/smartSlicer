import { AppSettings } from '~/store/main'
import PlainPrefs from './utils/plainPrefs'

const defaultValue: AppSettings = {
  useGpu: true,
  outputAudioOnly: true,
  languageForGenerateSubtitle: 'zh',
}

const appSettingsPrefs = new PlainPrefs('appSettingsPrefs', defaultValue).prefs

export default appSettingsPrefs
