import childProcess from 'child_process'
import path from 'path'
import { FFMPEG_BIN_PATH, GENERATE_SRT_SCRIPT, GENERATED_SUBTITLES_DIR_PATH, PYTHON_HOME, PYTHON_PATH, WHISPER_MODELS_PATH } from '../../../../constants'
import { PythonShell } from 'python-shell'
import md5 from 'md5'

export const supportedLanguageMaps = {
  auto: '自动检测',
  zh: '中文',
  ja: '日语',
  en: '英语',
  ko: '韩语',
  fr: '法语',
  de: '德语',
  ru: '俄语',

  af: '南非荷兰语',
  am: '阿姆哈拉语',
  ar: '阿拉伯语',
  as: '阿萨姆语',
  az: '阿塞拜疆语',
  ba: '巴什基尔语',
  be: '白俄罗斯语',
  bg: '保加利亚语',
  bn: '孟加拉语',
  bo: '藏语',
  br: '布列塔尼语',
  bs: '波斯尼亚语',
  ca: '加泰罗尼亚语',
  cs: '捷克语',
  cy: '威尔士语',
  da: '丹麦语',
  el: '希腊语',
  es: '西班牙语',
  et: '爱沙尼亚语',
  eu: '巴斯克语',
  fa: '波斯语',
  fi: '芬兰语',
  fo: '法罗语',
  gl: '加利西亚语',
  gu: '古吉拉特语',
  ha: '豪萨语',
  haw: '夏威夷语',
  he: '希伯来语',
  hi: '印地语',
  hr: '克罗地亚语',
  ht: '海地克里奥尔语',
  hu: '匈牙利语',
  hy: '亚美尼亚语',
  id: '印尼语',
  is: '冰岛语',
  it: '意大利语',
  jw: '爪哇语',
  ka: '格鲁吉亚语',
  kk: '哈萨克语',
  km: '高棉语',
  kn: '卡纳达语',
  la: '拉丁语',
  lb: '卢森堡语',
  ln: '林加拉语',
  lo: '老挝语',
  lt: '立陶宛语',
  lv: '拉脱维亚语',
  mg: '马尔加什语',
  mi: '毛利语',
  mk: '马其顿语',
  ml: '马拉雅拉姆语',
  mn: '蒙古语',
  mr: '马拉地语',
  ms: '马来语',
  mt: '马耳他语',
  my: '缅甸语',
  ne: '尼泊尔语',
  nl: '荷兰语',
  nn: '新挪威语',
  no: '挪威语',
  oc: '奥克语',
  pa: '旁遮普语',
  pl: '波兰语',
  ps: '普什图语',
  pt: '葡萄牙语',
  ro: '罗马尼亚语',
  sa: '梵语',
  sd: '信德语',
  si: '僧伽罗语',
  sk: '斯洛伐克语',
  sl: '斯洛文尼亚语',
  sn: '绍纳语',
  so: '索马里语',
  sq: '阿尔巴尼亚语',
  sr: '塞尔维亚语',
  su: '巽他语',
  sv: '瑞典语',
  sw: '斯瓦希里语',
  ta: '泰米尔语',
  te: '泰卢固语',
  tg: '塔吉克语',
  th: '泰语',
  tk: '土库曼语',
  tl: '塔加洛语',
  tr: '土耳其语',
  tt: '鞑靼语',
  uk: '乌克兰语',
  ur: '乌尔都语',
  uz: '乌兹别克语',
  vi: '越南语',
  yi: '依地语',
  yo: '约鲁巴语',
}

export type SupportedLanguages = keyof typeof supportedLanguageMaps

let processInstance: PythonShell | null = null

export default function callGenerateSrtPyScript(
  modelName: string,
  inputFilePath: string,
  outputFileName: string,
  language: SupportedLanguages,
) {
  processInstance = new PythonShell(GENERATE_SRT_SCRIPT, {
    encoding: 'binary',   // for non-ascii characters, garbled text will occur if the default value utf8 is used
    args: [
      '--model_path', path.join(WHISPER_MODELS_PATH, modelName),
      '--output', path.join(GENERATED_SUBTITLES_DIR_PATH, outputFileName),
      '--language', language,
      '--input', inputFilePath
    ],
  })
  // processInstance = childProcess.spawn(PYTHON_PATH, [
  //   '-u',
  //   GENERATE_SRT_SCRIPT,
  //   '--model_path', path.join(WHISPER_MODELS_PATH, modelName),
  //   '--output', path.join(GENERATED_SUBTITLES_DIR_PATH, outputFileName),
  //   '--language', language,
  //   '--input', inputFilePath,
  // ], {
  //   env: { Path: [FFMPEG_BIN_PATH, 'D:\\_myProject\\smartSlicer\\envs\\cuda'].join(';') },
  // })

  return processInstance
}

export function killCurrentWhisperProcess() {
  processInstance?.kill()
}
