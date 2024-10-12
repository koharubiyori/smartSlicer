import { makeAutoObservable } from "mobx"
import speakersPrefs from "~/prefs/speakersPrefs"
import store from "."
import { VideoSlice } from "./main"

class SpeakersStore {
  speakerList = speakersPrefs.speakerList
  locked = speakersPrefs.locked
  selectedSpeakerName: string = SpeakerSelects.All
  positionsOfSliceList: Record<string, number> = {
    [SpeakerSelects.All]: 0
  }
  positionsOfLockedSliceList: Record<string, number> = {}
  lastMovement: 'next' | 'back' | null = null

  get sliceListOfSelectedSpeaker() {
    if (this.selectedSpeakerName === SpeakerSelects.All) return store.main.sliceList ?? []
    if (this.selectedSpeakerName === SpeakerSelects.Default) return store.main.sliceList!.filter(item => item.speaker === SpeakerSelects.Default)
    if (this.selectedSpeakerName === SpeakerSelects.Marked) return store.main.sliceList!.filter(item => item.speaker !== null)
    if (this.selectedSpeakerName === SpeakerSelects.Unmarked) return store.main.sliceList!.filter(item => item.speaker === null)
    return store.main.sliceList!.filter(item => item.speaker === this.selectedSpeakerName)
  }

  get lockedSliceListOfSelectedSpeaker() {
    return store.main.sliceList!.filter(item => item.locked.includes(this.selectedSpeakerName))
  }

  get lockedOrNotSliceList() {
    return this.selectedSliceListLocked ? this.lockedSliceListOfSelectedSpeaker : this.sliceListOfSelectedSpeaker
  }

  get positionsOfLockedOrNotSliceList() {
    return this.selectedSliceListLocked ? this.positionsOfLockedSliceList : this.positionsOfSliceList
  }

  get currentSelectedPosition() {
    return this.positionsOfLockedOrNotSliceList[this.selectedSpeakerName] ?? 0
  }

  get currentSelectedSlice(): VideoSlice | undefined {
    return this.lockedOrNotSliceList[this.currentSelectedPosition]
  }

  get selectedSpeaker() {
    return this.speakerList.find(item => item.name === this.selectedSpeakerName)
  }

  get selectedSliceListLocked() {
    return this.isSliceListLocked(this.selectedSpeakerName)
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

  resetStatus() {
    this.positionsOfSliceList = { [SpeakerSelects.All]: 0 }
    this.positionsOfLockedSliceList = {}
    this.lastMovement = null
    this.selectedSpeakerName = SpeakerSelects.All
  }

  next() {
    if (this.currentSelectedPosition < this.lockedOrNotSliceList.length - 1) {
      this.positionsOfLockedOrNotSliceList[this.selectedSpeakerName] = this.currentSelectedPosition + 1
      this.lastMovement = 'next'
    }
  }

  back() {
    if (this.currentSelectedPosition !== 0) {
      this.positionsOfLockedOrNotSliceList[this.selectedSpeakerName]--
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
    if (this.selectedSpeakerName === SpeakerSelects.All || this.selectedSliceListLocked) this.next()
  }

  dropAndNext() {
    this.currentSelectedSlice!.speaker = null
    this.currentSelectedSlice!.modified = false
    if (
      this.selectedSpeakerName === SpeakerSelects.All ||
      this.selectedSpeakerName === SpeakerSelects.Unmarked ||
      this.selectedSliceListLocked
    ) this.next()
  }

  isSliceListLocked(speakerName: string) {
    return this.locked[speakerName] ?? false
  }

  setSliceListLockStatus(speakerName: string, locked: boolean) {
    this.locked[speakerName] = locked
    speakersPrefs.locked = {
      ...speakersPrefs.locked,
      [speakerName]: locked
    }

    if (locked) {
      this.sliceListOfSelectedSpeaker.forEach(item => {
        item.locked ??= []
        item.locked.push(speakerName)
      })
      this.positionsOfLockedSliceList[speakerName] = this.positionsOfSliceList[speakerName]
    } else {
      this.lockedSliceListOfSelectedSpeaker.forEach(item => {
        item.locked = item.locked.filter(item => item !== speakerName)
      })
      this.positionsOfSliceList[speakerName] = 0
    }
  }

  toggleSliceListLock(speakerName: string) {
    this.setSliceListLockStatus(speakerName, !this.isSliceListLocked(speakerName))
  }

  static getSliceSpeakerType(slice: VideoSlice) {
    if (slice.speaker === null) return SpeakerSelects.Unmarked
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
