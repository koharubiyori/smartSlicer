import path from 'path'

export const IS_DEV = process.env.NODE_ENV === 'development'
export const FFMPEG_TIME_FORMAT = 'HH:mm:ss.SSS'
export const WITHOUT_AI = process.env.WITHOUT_AI === 'true'


// for main
export const ENVS_PATH = path.resolve('envs')
export const SPEAKER_VOICE_SAMPLES_DIR_PATH = path.resolve('speakerVoiceSamples')
export const GENERATED_SUBTITLES_DIR_PATH = path.resolve('generatedSubtitles')

export const PYTHON_HOME = path.join(ENVS_PATH, 'python')
export const PYTHON_PATH = path.join(ENVS_PATH, 'python/python.exe')
export const FFMPEG_BIN_PATH = path.join(ENVS_PATH, 'ffmpeg/bin')
export const VRP_INFER_PATH = path.join(ENVS_PATH, 'VoiceprintRecognition-Pytorch/infer_contrast.py')
export const WHISPER_MODELS_PATH = path.join(ENVS_PATH, 'whisper_models')
export const UVR_MODEL_PATH = path.join(ENVS_PATH, 'uvr_model')

export const GENERATE_SRT_SCRIPT = path.join(ENVS_PATH, 'generate_srt.py')
export const SEPARATE_VOCALS_SCRIPT = path.join(ENVS_PATH, 'separate_vocals.py')


// for render
export const supportedVideoExtList =
  'avi|flv|mkv|mov|mp4|m4v|mpeg|webm|wmv|rmvb|m2ts'.split('|')
export const supportedAudioExtList = 'mp3|wav'.split('|')
