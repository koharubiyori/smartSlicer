import { PythonShell } from 'python-shell'
import childProcess from 'child_process'
import createIpcChannel from '../../createIpcChannel'
import callWhisper, { SupportedDevices, SupportedLanguages, killCurrentWhisperProcess } from './utils/callWhisper'
import { PYTHON_PATH, VRP_INFER_PATH } from '../../../constants'
import path from 'path'

export const pythonIpc = createIpcChannel('childProcess', {
  isCudaAvailable() {
    return PythonShell.runString('import torch; print(torch.cuda.is_available())', {
      pythonPath: PYTHON_PATH
    }).then(([pyBoolValueResult]) => pyBoolValueResult === 'True')
  },

  whisper(filePath: string, language: SupportedLanguages, outputDir: string, device: SupportedDevices) {
    return callWhisper(filePath, language, outputDir, device)
  },

  async killCurrentWhisperProcess() {
    killCurrentWhisperProcess()
  },

  async inferToneSimilarity(voice1Path: string, voice2Path: string): Promise<number> {
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
  }
})

export const pythonClient = pythonIpc.getChannelClient()
