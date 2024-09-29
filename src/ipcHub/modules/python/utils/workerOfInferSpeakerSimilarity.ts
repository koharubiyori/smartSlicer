import path from 'path'
import iconv from 'iconv-lite'
import { IpcChannelOrderContext } from 'ipcHub/createIpcChannel'
import { VRP_INFER_PATH } from '~/../constants'
import { PythonShell } from 'python-shell'

export default function startWorkerOfInferSpeakerSimilarity(this: IpcChannelOrderContext) {
  const [port] = this.event.ports
  const cwdDir = path.dirname(VRP_INFER_PATH)
  const fileName = path.basename(VRP_INFER_PATH)

  let restartPythonSell: ReturnType<typeof bindPythonShellToPort> | null = null
  restartPythonSell = bindPythonShellToPort()

  function bindPythonShellToPort() {
    const pythonShell = new PythonShell(fileName, {
      cwd: cwdDir,
      encoding: 'binary'
    })
    let currentInferParameter: any = null

    pythonShell.stderr.pipe(process.stderr)
    pythonShell.stdout.addListener('data', data => {
      const decodedData = iconv.decode(data, 'utf8')
      if (decodedData.substring(0, 7) !== '@@json:') { return }
      const parsedData = JSON.parse(decodedData.substring(7))
      port.postMessage(parsedData)
    })

    pythonShell.addListener('close', () => {
      if ((pythonShell.exitCode !== null || pythonShell.exitCode !== 0) && !pythonShell.childProcess.killed) {
        console.log('the process exited with an error!')
        port.postMessage({ id: currentInferParameter.id, type: 'error', detail: 'InferSpeakerSimilarity进程异常退出' })
        restartPythonSell?.call(undefined)
        restartPythonSell = bindPythonShellToPort()
      }
    })

    port.addListener('message', messageHandler)
    function messageHandler(message: Electron.MessageEvent) {
      const messageData: MessageData = message.data
      if (messageData.type === 'infer') {
        currentInferParameter = messageData.payload
        const { id, audio1, audio2 } = messageData.payload
        pythonShell.send(JSON.stringify({ id, audio1, audio2 }))
      }
      if (messageData.type === 'stop') {
        pythonShell.kill()
      }
    }

    port.start()

    return () => {
      pythonShell.stdout.removeAllListeners('data')
      pythonShell.removeAllListeners('close')
      port.removeListener('message', messageHandler)
    }
  }
}

interface MessageData {
  type: string
  payload: Record<string, any>
}
