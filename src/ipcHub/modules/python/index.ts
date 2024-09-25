import childProcess from 'child_process'
import iconv from 'iconv-lite'
import md5 from 'md5'
import path from 'path'
import { PythonShell } from 'python-shell'
import { GENERATED_SUBTITLES_DIR_PATH, PREPROCESS_OUTPUT_CACHE_DIR_PATH, VRP_INFER_PATH } from '../../../constants'
import createIpcChannel from '../../createIpcChannel'
import { OrderMessageOfGenerateSrt, OrderMessageOfSeparateVocals, PythonOrderMessage } from './pythonOrder'
import callGenerateSrtPyScript, { killCurrentProcessOfGenerateSrt, SupportedLanguages } from './utils/callGenerateSrtPyScript'
import callSeparateVocalsPyScript, { killCurrentProcessOfSeparateVocals } from './utils/callSeparateVocalsPyScript'


export const pythonIpc = createIpcChannel('childProcess', {
  isCudaAvailable() {
    return PythonShell.runString('import torch; print(torch.cuda.is_available())')
      .then(([pyBoolValueResult]) => pyBoolValueResult === 'True')
  },

  killCurrentProcessOfGenerateSrt() {
    killCurrentProcessOfGenerateSrt()
  },

  killCurrentProcessOfSeparateVocals() {
    killCurrentProcessOfSeparateVocals()
  },

  async inferSpeakerSimilarity(voice1Path: string, voice2Path: string): Promise<number> {
    const getScoreRegex = /^>>> (\-?[\d\.]+)$/m

    return new Promise((resolve, reject) => {
      const cwdDir = path.dirname(VRP_INFER_PATH)
      const fileName = path.basename(VRP_INFER_PATH)
      childProcess.exec(
        `..\\python\\python.exe ${fileName} --audio_path1 "${voice1Path}" --audio_path2 "${voice2Path}"`,
        { cwd: cwdDir },
        (error, stdout, stderr) => {
          if (error) return reject(error)
          const score = stdout.match(getScoreRegex)
          if (!score) return reject(stdout)
          resolve(parseFloat(score![1]))
        }
      )
    })
  },
}, {
  generateSrt(modelName: string, filePath: string, language: SupportedLanguages) {
    const [port] = this.event.ports
    const outputFileId = md5(filePath).substring(0, 6)
    const outputFileName = path.basename(filePath).replace( /\.[^/\\.]+$/, '') + `_${outputFileId}.srt`
    const pythonShell = callGenerateSrtPyScript(modelName, filePath, outputFileName, language)

    ;(() => {
      const message: OrderMessageOfGenerateSrt.SendOutputFilePathMessage = {
        type: 'sendOutputFilePath',
        filePath: path.join(GENERATED_SUBTITLES_DIR_PATH, outputFileName)
      }
      port.postMessage(message)
    })()

    pythonShell.stdout.on('data', data => {
      // the received data of terminal output can be sent to renderer process and it's fine for display. but if printed in main process, garbled text will occur as if wrong encoding is being used.
      const message: PythonOrderMessage = {
        type: 'text',
        content: iconv.decode(data, 'utf8')
      }
      port.postMessage(message)
    })

    pythonShell.stderr.on('data', data => {
      const message: PythonOrderMessage = {
        type: 'text',
        content: iconv.decode(data, 'utf8')
      }
      port.postMessage(message)
    })

    pythonShell.on('close', () => {
      const message: PythonOrderMessage = { type: 'close' }
      port.postMessage(message)
    })
  },

  separateVocals(filePath: string) {
    const [port] = this.event.ports
    const pythonShell = callSeparateVocalsPyScript(filePath)
    let outputFileName = ''
    const getOutputFileNameRegex = /^>>> ([\s\S]+\.wav)\s+$/m

    pythonShell.stdout.on('data', data => {
      const content = iconv.decode(data, 'utf8')
      const message: PythonOrderMessage = { type: 'text', content }
      port.postMessage(message)
      if (getOutputFileNameRegex.test(content)) outputFileName = content.match(getOutputFileNameRegex)!![1]
    })

    pythonShell.stderr.on('data', data => {
      const message: PythonOrderMessage = {
        type: 'text',
        content: iconv.decode(data, 'utf8')
      }
      port.postMessage(message)
    })

    pythonShell.on('close', () => {
      const message: PythonOrderMessage = { type: 'close' }
      const outputFileNameMessage: OrderMessageOfSeparateVocals.SendOutputFilePathMessage = {
        type: 'sendOutputFilePath',
        filePath: path.join(PREPROCESS_OUTPUT_CACHE_DIR_PATH, outputFileName)
      }
      outputFileName !== '' && port.postMessage(outputFileNameMessage)
      port.postMessage(message)
    })
  }
})

export const pythonClient = pythonIpc.getChannelClient()
