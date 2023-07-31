import { makeAutoObservable } from "mobx"
import speakersPrefs from "~/prefs/speakersPrefs"
import store from "."
import { VideoSlice } from "./main"

class SpeakersStore {
  speakerList = speakersPrefs.speakerList
  selectedSpeaker: string = SpeakerSelects.All
  positionOfSpeakerLists: Record<string, number> = {
    [SpeakerSelects.All]: 0
  }
  lastMovement: 'next' | 'back' | null = null

  get sliceListOfSelectedSpeaker() {
    if (this.selectedSpeaker === SpeakerSelects.All) return store.main.sliceList ?? []
    if (this.selectedSpeaker === SpeakerSelects.Default) return store.main.sliceList!.filter(item => item.speaker === defaultSpeakerShowName)
    if (this.selectedSpeaker === SpeakerSelects.Marked) return store.main.sliceList!.filter(item => item.speaker !== null)
    if (this.selectedSpeaker === SpeakerSelects.Unmarked) return store.main.sliceList!.filter(item => item.speaker === null)
    return store.main.sliceList!.filter(item => item.speaker === this.selectedSpeaker)
  }

  get currentSelectedPosition() {
    return this.positionOfSpeakerLists[this.selectedSpeaker] ?? 0
  }

  get currentSelectedSlice(): VideoSlice | undefined {
    return this.sliceListOfSelectedSpeaker?.[this.currentSelectedPosition]
  }

  constructor() {
    makeAutoObservable(this)
  }

  saveSpeakerList() {
    speakersPrefs.speakerList = this.speakerList
  }

  createMobxSnapshot(): typeof this.speakerList {
    const clone = JSON.parse(JSON.stringify(this))
    return makeAutoObservable(clone)
  }

  next() {
    if (this.currentSelectedPosition < this.sliceListOfSelectedSpeaker.length - 1) {
      this.positionOfSpeakerLists[this.selectedSpeaker] = this.currentSelectedPosition + 1
      this.lastMovement = 'next'
    }
  }

  back() {
    if (this.currentSelectedPosition !== 0) {
      this.positionOfSpeakerLists[this.selectedSpeaker]--
      this.lastMovement = 'back'
    }
  }

  emit(newValue: VideoSlice) {
    const foundIndex = store.main.sliceList!.findIndex(item => item.filePath === newValue.filePath)
    store.main.sliceList![foundIndex] = newValue
    store.main.saveCurrentSliceList()
  }

  emitAndNext(newValue: VideoSlice) {
    this.emit(newValue)
    if (this.selectedSpeaker === SpeakerSelects.All) this.next()
  }

  dropAndNext() {
    this.currentSelectedSlice!.speaker = null
    this.currentSelectedSlice!.modified = false
    if (this.selectedSpeaker === SpeakerSelects.All || this.selectedSpeaker === SpeakerSelects.Unmarked) this.next()
  }

  static getSliceSpeakerType(slice: VideoSlice) {
    if (slice.speaker === null) return SpeakerSelects.Unmarked
    if (slice.speaker === defaultSpeakerShowName) return SpeakerSelects.Default
    return SpeakerSelects.Marked
  }
}

export default SpeakersStore

export interface Speaker {
  id: string
  name: string
  enabled: boolean
  boundKey: string
  voiceSample: string[]
}

export enum SpeakerSelects {
  Default = '@@SPEAKER_SELECT_DEFAULT',
  All = '@@SPEAKER_SELECT_ALL',
  Marked = '@@SPEAKER_SELECT_MARKED',
  Unmarked = '@@SPEAKER_SELECT_UNMARKED'
}

export const defaultSpeakerShowName = '默认说话人'
