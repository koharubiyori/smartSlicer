import storage from '~/utils/storage'
import _ from 'lodash'

export default class PlainPrefs<T> {
  storageKey: string
  defaultValues: T
  prefs: T

  constructor(storageKey: string, defaultValues: T) {
    this.storageKey = storageKey
    this.defaultValues = _.cloneDeep(defaultValues)
    this.init()

    this.prefs = new Proxy(this.defaultValues as any, {
      get(target: any, getter: string) {
        return target[getter]
      },

      set(target: any, key: string, value: any) {
        target[key] = value
        storage.set(storageKey, target)
        return true
      }
    }) as any
  }

  init() {
    const currentData = storage.get(this.storageKey)
    if (currentData === null) { return }

    for (let [key, value] of Object.entries(currentData)) {
      ;(this.defaultValues as any)[key] = value
    }
  }
}
