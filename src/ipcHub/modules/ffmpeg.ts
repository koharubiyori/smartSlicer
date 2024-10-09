import dayjs from 'dayjs'
import path from 'path'
import ffmpeg, { ffprobe, FfprobeData } from 'fluent-ffmpeg'
import createIpcChannel from '../createIpcChannel'
import { getGpuList } from '../../ipcHub/utils/utils'

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

    const videoCodec = await (async () => {
      if (!useGpu) return 'libx264'
      const gpuList = await getCachedGpuList()
      if (gpuList.includes('NVIDIA')) return 'h264_nvenc'
      if (gpuList.includes('AMD')) return 'h264_amf'
      return 'libx264'
    })()

    if (audioOnly) command.noVideo()

    return new Promise((resolve, reject) => {
      command
        .format(extName)
        .videoCodec(videoCodec)
        .audioCodec('copy')
        .save(path.join(outputDirPath, `${outputFileName}.${extName}`))
        .addOutputOption('-pix_fmt', 'yuv420p')
        .on('end', resolve)
        .on('error', (e) => reject(e.message))
    })
  },

  async video2audio(inputFilePath: string, outputFilePath: string): Promise<void> {
    let command = ffmpeg(inputFilePath)

    return new Promise((resolve, reject) => {
      command
        .noVideo()
        .audioCodec('copy')
        .format('wav')
        .save(outputFilePath)
        .on('end', resolve as any)
        .on('error', e => reject(e.message))
    })
  },

  ffprobe(filePath: string) {
    return new Promise<FfprobeData>((resolve, reject) => {
      ffprobe(filePath, (err, data) => {
        if (err) reject(err)
        resolve(data)
      })
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

const getCachedGpuList = (() => {
  let list: ("NVIDIA" | "AMD")[] = []
  return async function() {
    if (list.length > 0) return list
    list = await getGpuList()
    return list
  }
})()
