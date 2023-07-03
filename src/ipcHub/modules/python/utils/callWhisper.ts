import stream from 'stream'
import net from 'net'
import childProcess, { ChildProcess } from 'child_process'
import { FFMPEG_BIN_PATH, PYTHON_PATH } from '../../../../constants'

export const supportedLanguageMaps = {
  zh: '汉语',
  en: '英语',
  ja: '日语',
  de: '德语',
  fr: '法语',
  ko: '韩语',
  ru: '俄语'
}

export type SupportedLanguages = keyof typeof supportedLanguageMaps
export type SupportedDevices = 'cuda' | 'cpu'

let processInstance: ChildProcess | null = null

export default async function callWhisper(filePath: string, language: SupportedLanguages, outputDir: string, device: SupportedDevices): Promise<string | null> {
  processInstance?.kill()

  // 存在编码问题：UnicodeEncodeError: 'gbk' codec can't encode character '\u30fb' in position 48: illegal multibyte sequence
  // 先暂时放下
  processInstance = childProcess.spawn(
    PYTHON_PATH, ['-m', 'whisper', filePath,
      '--output_format', 'srt',
      '--device', device,
      '--language', language,
      '--output_dir', outputDir ?? '.'
    ], {
      env: { Path: FFMPEG_BIN_PATH },
      stdio: ['ignore', 'inherit', 'inherit'],
    }
  )

  // python脚本运行在js里时，中途输出的内容不会输出到stdout。只好设置stdio:inherit
  process.stdout!.on('data', data => {
    console.log(data.toString())
  })

  process.stderr!.on('data', data => {
    console.log(data.toString())
  })

  // [00:30.000 --> 00:32.000]
  return new Promise(resolve => {
    processInstance!.on('exit', (code, signal) => {
      console.log(code)
      resolve(signal as any)
    })
  })
}

export function killCurrentWhisperProcess() {
  processInstance?.kill()
}
