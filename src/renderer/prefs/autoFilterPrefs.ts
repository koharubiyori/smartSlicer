import { AutoFilterSettings } from '~/views/fragments/operationPanel/components/dialogOfAutoFilter'
import PlainPrefs from './utils/plainPrefs'

const defaultValue: AutoFilterSettings = {
  evaluateMode: 'normal',
  computeMethod: 'average',
  isForce: false,
  workerNum: 3,
  threshold: 0.75
}

const autoFilterPrefs = new PlainPrefs('autoFilter', defaultValue).prefs

export default autoFilterPrefs
