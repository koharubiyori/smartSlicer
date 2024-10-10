import { AutoFilterSettings } from '~/views/fragments/operationPanel/components/dialogOfAutoFilter'
import PlainPrefs from './utils/plainPrefs'

const defaultValue: AutoFilterSettings = {
  evaluateMode: 'quick',
  computeMethod: 'max',
  isForce: false,
  workerNum: 3,
  threshold: 0.5
}

const autoFilterPrefs = new PlainPrefs('autoFilter', defaultValue).prefs

export default autoFilterPrefs
