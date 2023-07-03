import dayjs from 'dayjs'
import path from 'path'
import ffmpeg from 'fluent-ffmpeg'
import createIpcChannel from '../createIpcChannel'
import { getGpuList } from '../../ipcHub/utils/utils'
import { FFMPEG_TIME_FORMAT } from '../../constants'

export const ffmpegIpc = createIpcChannel('ffmpeg', {
  async slice(options: FFmpegSliceOptions)  {
    const {
      originalFilePath, startTime, endTime, outputDirPath, outputFileName,
      audioOnly = false, useGpu = true
    } = options
    let command = ffmpeg(originalFilePath)

    if (startTime && endTime) {
      const startTimeMs = createDayjsDurationFromFFmpegDate(startTime).asMilliseconds() / 1000
      const endTimeMs = createDayjsDurationFromFFmpegDate(endTime).asMilliseconds() / 1000
      const duration = (endTimeMs - startTimeMs).toFixed(3)

      command.setStartTime(startTime).setDuration(duration)
    }

    const extName = audioOnly ? 'wav' : 'mp4'

    const videoCode = await (async () => {
      if (!useGpu) return 'h264'
      const gpuList = await getGpuList()
      if (gpuList.includes('NVIDIA')) return 'hevc_nvenc'
      if (gpuList.includes('AMD')) return 'hevc_amf'
      return 'h264'
    })()

    if (audioOnly) command.noVideo()

    return new Promise((resolve, reject) => {
      command
        .format(extName)
        .videoCodec(videoCode)
        .save(path.join(outputDirPath, `${outputFileName}.${extName}`))
        .on('end', resolve)
        .on('error', (e) => reject(e.message))
    })
  },

  async video2audio(inputFilePath: string, outputFilePath: string): Promise<void> {
    let command = ffmpeg(inputFilePath)

    return new Promise((resolve, reject) => {
      command
        .noVideo()
        .format('wav')
        .save(outputFilePath)
        .on('end', resolve)
        .on('error', e => reject(e.message))
    })
  }
})

export const ffmpegIpcClient = ffmpegIpc.getChannelClient()

export interface FFmpegSliceOptions {
  originalFilePath: string
  startTime?: string
  endTime?: string
  outputDirPath: string
  outputFileName: string
  audioOnly?: boolean
  useGpu?: boolean
}

function createDayjsDurationFromFFmpegDate(ffmpegDate: string) {
  const [hh, mm, ss_sss] = ffmpegDate.split(':')
  const [ss, sss] = ss_sss.split('.').map(item => parseInt(item))
  return dayjs.duration({ hours: parseInt(hh), minutes: parseInt(mm), seconds: ss, milliseconds: sss })
}
