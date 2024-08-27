import fsPromise from 'fs/promises'
import { ffmpegIpcClient } from "ipcHub/modules/ffmpeg"
import { pythonClient } from "ipcHub/modules/python"
import md5 from "md5"
import path from "path"
import { SPEAKER_VOICE_SAMPLES_DIR_PATH } from "~/../constants"
import { VideoSlice } from "~/store/main"
import { AutoFilterSettings } from ".."
import { Speaker } from '~/store/speakers'
import _ from 'lodash'

export interface FilterTaskSchedulerOptions extends AutoFilterSettings {

}

class FilterTasksScheduler {
  static preprocessCacheDirPath = '.preprocessCache'
  #intervalKey: any = 0
  #taskQueue: (() => Promise<void>)[] = []
  #voiceSamples: { speakerId: string, filePath: string }[] = []
  onEvaluated: (newVideoSlice: VideoSlice | null, result: InferResult[], count: number, originalVideoSlice: VideoSlice) => void = () => {}

  constructor(
    public sliceList: VideoSlice[],
    public speakerList: Speaker[],
    public options: FilterTaskSchedulerOptions,
    public slicesPath: string
  ) { }

  async start() {
    await this.loadVoiceSamples()
    await this.createCacheDir()
    const tasks = new Map<Function, Promise<void>>()

    const intervalLoop = () => setTimeout(() => {
      if (tasks.size < this.options.workerNum && this.#taskQueue.length !== 0) {
        const shiftedTask = this.#taskQueue.shift()!
        const taskPromise = shiftedTask()
          .finally(() => tasks.delete(shiftedTask))
        tasks.set(shiftedTask, taskPromise)
      }
      this.#intervalKey = intervalLoop()
    }, _.random(50, 2000))


    this.#intervalKey = intervalLoop()

    this.sliceList.forEach(async (item, index) => {
      const count = index + 1
      const result = await this.evaluate(item.filePath)
      if (!result.speakerId) return this.onEvaluated(null, result.scores, count, item)
      const speakerName = this.speakerList.find(item => item.id === result.speakerId)!.name
      if (speakerName === item.speaker) return this.onEvaluated(item, result.scores, count, item)
      this.onEvaluated({
        ...item,
        modified: true,
        speaker: speakerName
      }, result.scores, count, item)
    })
  }

  stop() {
    clearInterval(this.#intervalKey)
  }

  async loadVoiceSamples() {
    this.#voiceSamples = this.speakerList.map(item =>
      item.voiceSample.map(fileName => ({
        speakerId: item.id,
        filePath: path.resolve(SPEAKER_VOICE_SAMPLES_DIR_PATH, item.id, fileName)
      }))
    ).flat()
  }

  async createCacheDir() {
    await fsPromise.mkdir(FilterTasksScheduler.preprocessCacheDirPath).catch(() => {})
  }

  async preprocess(filePath: string) {
    const extName = path.extname(filePath)
    if (extName === '.wav') return filePath
    const filePathMd5 = md5(filePath)
    const outputFilePath = path.resolve(FilterTasksScheduler.preprocessCacheDirPath, filePathMd5 + '.wav')
    try {
      await fsPromise.access(outputFilePath, fsPromise.constants.F_OK)
    } catch(e) {
      await ffmpegIpcClient.video2audio(filePath, outputFilePath)
    }

    return outputFilePath
  }

  async infer(filePath: string, voiceSamplePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      this.#taskQueue.push(async () => {
        try {
          const preprocessedSliceFile = await this.preprocess(path.join(this.slicesPath, filePath))
          const similarityValue = await pythonClient.inferSpeakerSimilarity(preprocessedSliceFile, voiceSamplePath)
          resolve(similarityValue)
        } catch(e) {
          // reject(e)
          console.log(e)
          resolve(0)
        }
      })
    })
  }

  async evaluate(filePath: string): Promise<{ speakerId: string | null, scores: InferResult[] }> {
    const returnVal = (speakerId: string | null, scores: InferResult[]) => ({ speakerId, scores })

    try {
      if (this.options.evaluateMode === 'quick') {
        const results: InferResult[] = []
        const raceResult = await Promise.race<string | null>(
          this.#voiceSamples.map((item, index) => new Promise(async (resolve, reject) => {
            const result = await this.infer(filePath, item.filePath)
            results.push({ speakerId: item.speakerId, score: result })
            if (result > this.options.threshold) return resolve(item.speakerId)
            if (index === this.#voiceSamples.length - 1) resolve(null)
          }))
        )

        if (raceResult) return returnVal(raceResult, results)

        if (this.options.isForce) {
          return returnVal(results.sort((a, b) => b.score - a.score)[0].speakerId, results)
        }

        return returnVal(null, results)
      }

      if (['normal', 'strict'].includes(this.options.evaluateMode)) {
        const results: InferResult[] = await Promise.all(
          this.#voiceSamples.map(async item => {
            const result = await this.infer(filePath, item.filePath)
            return { speakerId: item.speakerId, score: result }
          })
        )

        const returnValWithScores = (speakerId: string | null = null) => returnVal(speakerId, results)

        if (this.options.evaluateMode === 'normal') {
          if (this.options.computeMethod === 'max') {
            const speakerOfMaxScore = results.sort((a, b) => b.score - a.score)[0]
            if (speakerOfMaxScore.score >= this.options.threshold || this.options.isForce) return returnValWithScores(speakerOfMaxScore.speakerId)
            return returnValWithScores()
          }
          if (this.options.computeMethod === 'average') {
            const speakerFromMaxAverage = computeMaxAverageSpeaker(results)
            if (speakerFromMaxAverage.average >= this.options.threshold || this.options.isForce) return returnValWithScores(speakerFromMaxAverage.speakerId)
            return returnValWithScores()
          }
        }

        if (this.options.evaluateMode === 'strict') {
          const speakersUnderThreshold = results.filter(item => item.score < 0.6).map(item => item.speakerId)
          const blockList = Array.from(new Set(speakersUnderThreshold))
          const newResults = results.filter(item => !blockList.includes(item.speakerId))

          if (newResults.length === 0) return returnValWithScores()
          if (newResults.length === 1) return returnValWithScores(results[0].speakerId)

          if (this.options.computeMethod === 'max') {
            return returnValWithScores(newResults.sort((a, b) => b.score - a.score)[0].speakerId)
          }

          if (this.options.computeMethod === 'average') {
            return returnValWithScores(computeMaxAverageSpeaker(newResults).speakerId)
          }
        }
        function computeMaxAverageSpeaker(results: InferResult[]) {
          const speakerIdToScoresMap = results.reduce((snowball, item) => {
            snowball[item.speakerId] ??= []
            snowball[item.speakerId].push(item.score)
            return snowball
          }, {} as Record<string, number[]>)
          const speakerIdToScoreAverages: { speakerId: string, average: number }[] = Object.entries(speakerIdToScoresMap).map(([speakerId, scores]) => ({
            speakerId,
            average: scores.reduce((prev, item) => prev + item, 0) / scores.length
          }))
          return speakerIdToScoreAverages.sort((a, b) => b.average - a.average)[0]
        }
      }
    } catch(e) {
      console.log(e)
    }

    return returnVal(null, [])
  }

  static cleanCache() {
    return fsPromise.rmdir(FilterTasksScheduler.preprocessCacheDirPath, { recursive: true }).catch(() => {})
  }
}

export default FilterTasksScheduler

export interface InferResult {
  speakerId: string
  score: number
}
