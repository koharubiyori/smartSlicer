import { PREPROCESS_OUTPUT_CACHE_DIR_PATH, SEPARATE_VOCALS_SCRIPT, UVR_MODEL_PATH } from '~/../constants'
import { PythonShell } from 'python-shell'
import { IpcChannelOrderContext } from 'ipcHub/createIpcChannel'
import iconv from 'iconv-lite'

export default function startWorkerOfSeparateVocals(this: IpcChannelOrderContext) {
  const [port] = this.event.ports
  let restartPythonSell: ReturnType<typeof bindPythonShellToPort> | null = null
  restartPythonSell = bindPythonShellToPort()

  function bindPythonShellToPort() {
    const pythonShell = new PythonShell(SEPARATE_VOCALS_SCRIPT, {
      encoding: 'binary',   // for non-ascii characters, garbled text will occur if the default value utf8 is used
      args: [
        '--model_path', UVR_MODEL_PATH,
        '--output_dir', PREPROCESS_OUTPUT_CACHE_DIR_PATH,
      ],
    })
    let currentInferParameter: any = null

    pythonShell.stderr.addListener('data', data => {
      const decodedData = iconv.decode(data, 'utf8')
      console.log(decodedData)
      port.postMessage({ type: 'text', content: decodedData })
    })
    pythonShell.stdout.addListener('data', data => {
      const decodedData = iconv.decode(data, 'utf8')
      if (decodedData.substring(0, 7) !== '@@json:') {
        port.postMessage({ type: 'text', content: decodedData })
      } else {
        const parsedData = JSON.parse(decodedData.substring(7))
        port.postMessage(parsedData)
      }
    })

    pythonShell.addListener('close', () => {
      if ((pythonShell.exitCode !== null || pythonShell.exitCode !== 0) && !pythonShell.childProcess.killed) {
        console.log('the process exited with an error!')
        port.postMessage({ id: currentInferParameter.id, type: 'error', detail: 'SeparateVocals进程异常退出' })
        restartPythonSell?.call(undefined)
        restartPythonSell = bindPythonShellToPort()
      }
    })

    port.addListener('message', messageHandler)
    function messageHandler(message: Electron.MessageEvent) {
      const messageData: MessageData = message.data
      if (messageData.type === 'separate') {
        currentInferParameter = messageData.payload
        const { id, audio } = messageData.payload
        pythonShell.send(JSON.stringify({ id, audio }))
      }
      if (messageData.type === 'stop') {
        pythonShell.kill()
      }
    }

    port.start()

    return () => {
      pythonShell.stdout.removeAllListeners('data')
      pythonShell.stderr.removeAllListeners('data')
      pythonShell.removeAllListeners('close')
      port.removeListener('message', messageHandler)
    }
  }
}

interface MessageData {
  type: string
  payload: Record<string, any>
}
