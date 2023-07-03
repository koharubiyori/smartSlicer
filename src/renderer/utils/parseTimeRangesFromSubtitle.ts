import dayjs from 'dayjs'
import * as assCompiler from 'ass-compiler'

type SupportedFormat = 'srt' | 'ass' | 'vtt' | 'tsv'

const srtRegex = /^(\d\d:\d\d:\d\d,\d\d\d) --> (\d\d:\d\d:\d\d,\d\d\d)$/
const vttRegex = /^(\d\d:\d\d\.\d\d\d) --> (\d\d:\d\d\.\d\d\d)$/
const tsvRegex = /^(\d+)\s+(\d+).+$/

const timeFormat = 'HH:mm:ss.SSS'

export default function parseTimeRangesFromSubtitle(subtitleFileContent: string, format: SupportedFormat): [string, string][] {
  let result: [string, string][] = []

  if (format === 'srt') {
    result = subtitleFileContent.split(/\r?\n/)
      .filter(item => srtRegex.test(item))
      .map(item => {
        const [_, startTime, endTime] = item.match(srtRegex) as string[]
        return [startTime.replace(',', '.'), endTime.replace(',', '.')]
      })
  }

  if (format === 'vtt') {
    result = subtitleFileContent.split(/\r?\n/)
      .filter(item => vttRegex.test(item))
      .map(item => {
        const [_, startTime, endTime] = item.match(vttRegex) as string[]
        return [startTime, endTime]
      })
  }

  if (format === 'tsv') {
    result = subtitleFileContent.split(/\r?\n/)
      .filter(item => tsvRegex.test(item))
      .map(item => {
        const [_, startTime, endTime] = item.match(tsvRegex) as string[]
        return [dayjs.duration(parseInt(startTime)).format(timeFormat), dayjs.duration(parseInt(endTime)).format(timeFormat)]
      })
  }

  if (format === 'ass') {
    const parsedResult = assCompiler.parse(subtitleFileContent)
    result = parsedResult.events.dialogue
      .map(item => {
        const startTime = Math.round(item.Start * 1000)
        const endTime = Math.round(item.End * 1000)
        return [dayjs.duration(startTime).format(timeFormat), dayjs.duration(endTime).format(timeFormat)]
      })
  }

  return (function removeDuplicate() {
    const stringItems = result.map(([start, end]) => start + '|' + end)
    const duplicateRemoved = Array.from(new Set(stringItems))
    return duplicateRemoved.map(item => item.split('|') as [string, string])
  })()
}
