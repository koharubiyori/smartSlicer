import fsPromise from 'fs/promises'
import { ffmpegIpcClient } from "ipcHub/modules/ffmpeg"
import { pythonClient } from "ipcHub/modules/python"
import { OrderMessageOfInferSpeakerSimilarity, OrderMessageOfSeparateVocals } from 'ipcHub/modules/python/pythonOrder'
import path from "path"
import { PREPROCESS_OUTPUT_CACHE_DIR_PATH, SPEAKER_VOICE_SAMPLES_DIR_PATH } from "~/../constants"
import { VideoSlice } from "~/store/main"
import { Speaker } from '~/store/speakers'
import { getCachedOutputFilePath } from '~/utils/utils'
import { AutoFilterSettings } from ".."

export interface FilterTaskSchedulerOptions extends AutoFilterSettings {

}

type WorkerPortClient = InstanceType<typeof FilterTasksScheduler.WorkerPortClient>

class FilterTasksScheduler {
  #workerPorts: (WorkerPortClient)[] = []
  #waitingPromises: ((value: WorkerPortClient) => void)[] = []
  #voiceSamples: { speakerId: string, filePath: string }[] = []
  onEvaluated: (newVideoSlice: VideoSlice | null, result: InferResult[], count: number, originalVideoSlice: VideoSlice) => void = () => {}

  constructor(
    public sliceList: VideoSlice[],
    public speakerList: Speaker[],
    public options: FilterTaskSchedulerOptions,
    public slicesPath: string
  ) {
    this.#initWorkerPorts()
  }

  #initWorkerPorts() {
    this.#workerPorts = new Array(this.options.workerNum).fill(0).map(() => {
      const port = pythonClient.startWorkerOfInferSpeakerSimilarity()
      const portOfSeparateVocals = pythonClient.startWorkerOfSeparateVocals()
      return new FilterTasksScheduler.WorkerPortClient(port, portOfSeparateVocals, this)
    })
  }

  async start() {
    await this.loadVoiceSamples()
    await this.createCacheDir()

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

  #getIdleWorker(): Promise<WorkerPortClient> {
    return new Promise(resolve => {
      const foundItem = this.#workerPorts.find(item => !item.using)
      if (foundItem) {
        foundItem.beforehandHold()
        console.log(this.#workerPorts)
        return resolve(foundItem)
      }

      const wrappedResolve = (value: WorkerPortClient) => {
        resolve(value)
        value.beforehandHold()
      }

      this.#waitingPromises.push(wrappedResolve)
    })
  }

  stop() {
   this.#workerPorts.forEach(item => item.stop())
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
    await fsPromise.mkdir(PREPROCESS_OUTPUT_CACHE_DIR_PATH).catch(() => {})
  }

  async preprocess(filePath: string, portSeparateVocals: MessagePort) {
    const outputFilePath = getCachedOutputFilePath('audio', filePath)
    const vocalFilePath = getCachedOutputFilePath('vocal', filePath)
    let hasVocalFile = false
    try {
      await fsPromise.access(vocalFilePath, fsPromise.constants.F_OK)
      hasVocalFile = true
    } catch(e) {
      await ffmpegIpcClient.video2audio(filePath, outputFilePath)
      await new Promise<void>((resolve, reject) => {
        portSeparateVocals.addEventListener('message', messageHandler)
        function messageHandler(message: MessageEvent) {
          const messageData: OrderMessageOfSeparateVocals.Messages = message.data
          console.log(messageData)
          const clean = () => portSeparateVocals.removeEventListener('message', messageHandler)
          if (messageData.type === 'success') {
            resolve()
            hasVocalFile = true
            clean()
          }
          if (messageData.type === 'error') {
            reject()
            console.log(messageData.detail)
            clean()
          }
        }
        portSeparateVocals.postMessage({ type: 'separate', payload: { id: outputFilePath, audio: outputFilePath } })
        portSeparateVocals.start()
      }).catch(console.log)
    }

    !hasVocalFile && console.log(filePath + '：因分离人声失败回退至原始音频')
    return hasVocalFile ? vocalFilePath : outputFilePath
  }

  async infer(filePath: string, voiceSamplePath: string): Promise<number> {
    try {
      const workerClient = await this.#getIdleWorker()
      const processedSliceFile = await this.preprocess(path.join(this.slicesPath, filePath), workerClient.portOfSeparateVocals)
      const processedSamplePath = await this.preprocess(voiceSamplePath, workerClient.portOfSeparateVocals)
      const similarityValue = await workerClient.infer(filePath + voiceSamplePath, processedSliceFile, processedSamplePath)
      return similarityValue
    } catch(e) {
      console.log(e)
      return 0
    }
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
    return fsPromise.rm(PREPROCESS_OUTPUT_CACHE_DIR_PATH, { recursive: true, force: true }).catch(console.log)
  }

  static WorkerPortClient = class WorkerPortClient {
    using = false
    #held = false
    // onRunningChanged: (running: boolean) => void = () => {}

    constructor(
      public port: MessagePort,
      public portOfSeparateVocals: MessagePort,   // contain the port of separate vocals to manage it without defining more methods
                                                  // because it must be idle when the port is idle
      public scheduler: FilterTasksScheduler,
    ) { }

    infer(id: string, audio1: string, audio2: string): Promise<number> {
      if (this.using && !this.#held) throw Error('worker is running!')
      this.#held = false

      return new Promise((resolve, reject) => {
        const listener = (message: MessageEvent) => {
          const messageData: OrderMessageOfInferSpeakerSimilarity.Messages = message.data
          if (messageData.id !== id) { return }
          if (messageData.type === 'result') resolve(parseFloat(messageData.score))
          if (messageData.type === 'error') resolve(-1)
          this.port.removeEventListener('message', listener)
          this.using = false
          this.scheduler.#waitingPromises.shift()?.(this)
        }
        this.port.addEventListener('message', listener)
        this.port.postMessage({ type: 'infer', payload: { id, audio1, audio2 } })
        this.port.start()
        this.using = true
      })
    }

    beforehandHold() {
      this.using = true
      this.#held = true
    }

    stop() {
      this.port.postMessage({ type: 'stop' })
      this.portOfSeparateVocals.postMessage({ type: 'stop' })
    }
  }
}

export default FilterTasksScheduler

export interface InferResult {
  speakerId: string
  score: number
}

