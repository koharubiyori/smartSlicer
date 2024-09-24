export interface PythonOrderTextMessage {
  type: 'text'
  content: string
}

export interface PythonOrderCloseMessage {
  type: 'close'
}

export type PythonOrderMessage =
  PythonOrderTextMessage |
  PythonOrderCloseMessage

export namespace OrderMessageOfGenerateSrt {
  interface SendOutputFileNameMessage {
    type: 'sendOutputFileName',
    fileName: string
  }

  type Messages = PythonOrderMessage |
    SendOutputFileNameMessage
}
