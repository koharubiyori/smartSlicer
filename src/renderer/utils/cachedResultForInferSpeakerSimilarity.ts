import md5 from 'md5'

export default class CachedResultForInferSpeakerSimilarity {
  private static prefix = 'cachedResultForInferSpeakerSimilarity'
  static hasCache = false

  private static computeKey(audio1Path: string, audio2Path: string) {
    return this.prefix + '-' + md5(audio1Path + audio2Path)
  }

  static set(audio1Path: string, audio2Path: string, score: number) {
    sessionStorage.setItem(this.computeKey(audio1Path, audio2Path), score.toString())
    this.hasCache = true
  }

  static get(audio1Path: string, audio2Path: string) {
    const cachedValue = sessionStorage.getItem(this.computeKey(audio1Path, audio2Path))
    return cachedValue ? parseFloat(cachedValue) : null
  }
}
