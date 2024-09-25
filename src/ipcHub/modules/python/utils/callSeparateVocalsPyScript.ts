import { PREPROCESS_OUTPUT_CACHE_DIR_PATH, SEPARATE_VOCALS_SCRIPT, UVR_MODEL_PATH } from '~/../constants'
import { PythonShell } from 'python-shell'

let processInstance: PythonShell | null = null

export default function callSeparateVocalsPyScript(inputPath: string) {
  processInstance = new PythonShell(SEPARATE_VOCALS_SCRIPT, {
    encoding: 'binary',   // for non-ascii characters, garbled text will occur if the default value utf8 is used
    args: [
      '--model_path', UVR_MODEL_PATH,
      '--input', inputPath,
      '--output_dir', PREPROCESS_OUTPUT_CACHE_DIR_PATH,
    ],
  })

  return processInstance
}

export function killCurrentProcessOfSeparateVocals() {
  processInstance?.kill()
}
