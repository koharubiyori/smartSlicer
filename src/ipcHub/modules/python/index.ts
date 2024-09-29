import md5 from 'md5'
import path, { parse } from 'path'
import { PythonShell } from 'python-shell'
import iconv from 'iconv-lite'
import { GENERATED_SUBTITLES_DIR_PATH, PREPROCESS_OUTPUT_CACHE_DIR_PATH, VRP_INFER_PATH } from '../../../constants'
import createIpcChannel from '../../createIpcChannel'
import { OrderMessageOfGenerateSrt, OrderMessageOfSeparateVocals, PythonOrderMessage } from './pythonOrder'
import callGenerateSrtPyScript, { killCurrentProcessOfGenerateSrt, SupportedLanguages } from './utils/callGenerateSrtPyScript'
import callSeparateVocalsPyScript, { killCurrentProcessOfSeparateVocals } from './utils/callSeparateVocalsPyScript'
import startWorkerOfInferSpeakerSimilarity from './utils/workerOfInferSpeakerSimilarity'
import startWorkerOfSeparateVocals from './utils/workerOfSeparateVocals'


export const pythonIpc = createIpcChannel('childProcess', {
  isCudaAvailable() {
    return PythonShell.runString('import torch; print(torch.cuda.is_available())')
      .then(([pyBoolValueResult]) => pyBoolValueResult === 'True')
  },

  killCurrentProcessOfGenerateSrt() {
    killCurrentProcessOfGenerateSrt()
  },
}, {
  startWorkerOfInferSpeakerSimilarity() {
    startWorkerOfInferSpeakerSimilarity.call(this)
  },

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

    pythonShell.childProcess.stdout!.addListener('data', data => {
      // the received data of terminal output can be sent to renderer process and it's fine for display. but if printed in main process, garbled text will occur as if wrong encoding is being used.
      const message: PythonOrderMessage = {
        type: 'text',
        content: iconv.decode(data, 'utf8')
      }
      port.postMessage(message)
    })

    pythonShell.childProcess.stderr!.addListener('data', data => {
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

  startWorkerOfSeparateVocals() {
    startWorkerOfSeparateVocals.call(this)
  }
})

export const pythonClient = pythonIpc.getChannelClient()
