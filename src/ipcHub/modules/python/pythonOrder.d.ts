// 这里只存放main -> renderer的message类型
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
  interface SuccessMessage {
    type: 'success'
    id: string
  }
  interface ErrorMessage {
    type: 'error'
    id: string
    detail: string
  }

  type Messages = PythonOrderMessage |
    SuccessMessage | ErrorMessage
}

export namespace OrderMessageOfInferSpeakerSimilarity {
  interface ResultMessage {
    type: 'result'
    id: string
    score: string
  }

  interface ErrorResult {
    type: 'error'
    id: string
    detail: string
  }

  type Messages = ResultMessage | ErrorResult
}
