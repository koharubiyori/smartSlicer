import path from 'path'
import dayjs from 'dayjs'
import durationExtOfDayjs from 'dayjs/plugin/duration'
import customParseFormatExtOfDayjs from 'dayjs/plugin/customParseFormat'
import { FFMPEG_BIN_PATH } from '../constants'
import ffmpeg from 'fluent-ffmpeg'

ffmpeg.setFfmpegPath(path.join(FFMPEG_BIN_PATH, 'ffmpeg.exe'))
ffmpeg.setFfprobePath(path.join(FFMPEG_BIN_PATH, 'ffprobe.exe'))

dayjs.extend(durationExtOfDayjs)
dayjs.extend(customParseFormatExtOfDayjs)
