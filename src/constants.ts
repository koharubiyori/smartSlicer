import path from 'path'

export const IS_DEV = process.env.NODE_ENV === 'development'
export const FFMPEG_TIME_FORMAT = 'HH:mm:ss.SSS'

export const ENVS_PATH = IS_DEV ?
  'E:/myProject/smartSlicer/envs' :
  'envs'
export const SPEAKER_VOICE_SAMPLES_DIR_PATH = path.resolve('speakerVoiceSamples')

export const PYTHON_PATH = path.join(ENVS_PATH, 'python/python.exe')
export const FFMPEG_BIN_PATH = path.join(ENVS_PATH, 'ffmpeg/bin')
export const VRP_INFER_PATH = path.join(ENVS_PATH, 'VoiceprintRecognition_Pytorch/infer_contrast.py')

