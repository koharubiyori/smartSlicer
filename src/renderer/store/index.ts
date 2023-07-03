import { configure } from 'mobx'
import MainStore from './main'
import SpeakersStore from './speakers'

configure({
  enforceActions: 'never'
})

const store = {
  main: new MainStore(),
  speakers: new SpeakersStore()
}

export default store
