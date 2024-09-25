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
  interface SendOutputFilePathMessage {
    type: 'sendOutputFilePath'
    filePath: string
  }

  type Messages = PythonOrderMessage |
    SendOutputFilePathMessage
}

export namespace OrderMessageOfSeparateVocals {
  interface SendOutputFilePathMessage {
    type: 'sendOutputFilePath'
    filePath: string
  }

  type Messages = PythonOrderMessage |
    SendOutputFilePathMessage
}
