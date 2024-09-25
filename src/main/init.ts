import dayjs from 'dayjs'
import customParseFormatExtOfDayjs from 'dayjs/plugin/customParseFormat'
import durationExtOfDayjs from 'dayjs/plugin/duration'
import ffmpeg from 'fluent-ffmpeg'
import path from 'path'
import { PythonShell } from 'python-shell'
import { CUDA_HOME, FFMPEG_BIN_PATH, PYTHON_PATH } from '../constants'

PythonShell.defaultOptions = {
  pythonPath: PYTHON_PATH,
  pythonOptions: ['-u'],
  env: { Path: [FFMPEG_BIN_PATH, CUDA_HOME].join(';') }
}

ffmpeg.setFfmpegPath(path.join(FFMPEG_BIN_PATH, 'ffmpeg.exe'))
ffmpeg.setFfprobePath(path.join(FFMPEG_BIN_PATH, 'ffprobe.exe'))

dayjs.extend(durationExtOfDayjs)
dayjs.extend(customParseFormatExtOfDayjs)
