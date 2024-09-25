import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, MenuItem, Select, TextField, Typography } from '@mui/material'
import fsPromise from 'fs/promises'
import { pythonClient } from 'ipcHub/modules/python'
import { OrderMessageOfGenerateSrt, OrderMessageOfSeparateVocals } from 'ipcHub/modules/python/pythonOrder'
import { supportedLanguageMaps } from 'ipcHub/modules/python/utils/callGenerateSrtPyScript'
import { Observer } from 'mobx-react-lite'
import path from 'path'
import { MutableRefObject, PropsWithChildren, useEffect, useRef, useState } from 'react'
import { PREPROCESS_OUTPUT_CACHE_DIR_PATH, WHISPER_MODELS_PATH } from '~/../constants'
import store from '~/store'
import { notify } from '~/utils/notify'
import classes from './index.module.scss'
import { ffmpegIpcClient } from 'ipcHub/modules/ffmpeg'
import md5 from 'md5'

export interface Props {
  getRef?: MutableRefObject<any>
}

export interface DialogOfSubtitleGenerateRef {
  show(): void
  hide(): void
}

const languageListOfGenerateSubtitle = Object.entries(supportedLanguageMaps)

function DialogOfSubtitleGenerate(props: PropsWithChildren<Props>) {
  const [isOpen, setIsOpen] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [modelList, setModelList] = useState<string[]>([])
  const [logContent, setLogContent] = useState('')

  const logTextFieldRef = useRef<HTMLDivElement>(null)

  if (props.getRef) props.getRef.current = {
    show: () => setIsOpen(true),
    hide: () => setIsOpen(false)
  }

  useEffect(() => {
    if (!isOpen) { return }
    loadWhisperModelList()
    setLogContent('')
  }, [isOpen])

  useEffect(() => {
    logTextFieldRef.current?.querySelector('textarea')?.scrollBy(0, 1e16)
  }, [logContent])

  function loadWhisperModelList() {
    fsPromise.readdir(WHISPER_MODELS_PATH).then(models => {
      if (models.length === 0) return notify.warning('未找到任何whisper模型！')
      setModelList(models)
      if (!models.includes(store.main.appSettings.modelForGenerateSubtitle)) {
        store.main.updateAppSetting('modelForGenerateSubtitle', '')
      }
      if (models.length === 1) {
        store.main.updateAppSetting('modelForGenerateSubtitle', models[0])
      }
    })
  }

  async function start() {
    if (store.main.appSettings.modelForGenerateSubtitle === '') return notify.warning('请先选择要使用的模型')
    setIsRunning(true)
    setLogContent('')

    function printLog(text: string) {
      setLogContent(prevVal => (prevVal.length !== 0 && prevVal[prevVal.length - 1] !== '\n' ? '\n' : '') +  prevVal + text + '\n')
    }

    const inputFileId = md5(store.main.videoInputPath).substring(0, 6)
    const inputFileBaseName = path.basename(store.main.videoInputPath).replace(/\..+?$/, '')
    const audioFilePath = path.join(PREPROCESS_OUTPUT_CACHE_DIR_PATH, inputFileBaseName + '_' + inputFileId + '_audio.wav')

    // get the audio track of the inputted video
    try {
      printLog('开始从视频中分离音频...')

      await fsPromise.mkdir(PREPROCESS_OUTPUT_CACHE_DIR_PATH).catch(console.log)
      await ffmpegIpcClient.video2audio(store.main.videoInputPath, audioFilePath)
    } catch(e: any) {
      printLog(e.toString())
      return
    }

    // get the pure vocals from the audio
    printLog('开始从音频中提取人声...')
    const vocalsAudioPath = await new Promise<string>((resolve) => {
      const pyShellPort = pythonClient.separateVocals(audioFilePath)

      let isLastMsgWithPercent = false
      let outputFilePath = ''
      pyShellPort.addEventListener('message', message => {
        const messageData: OrderMessageOfSeparateVocals.Messages = message.data
        console.log(messageData)
        if (messageData.type === 'sendOutputFilePath') {
          outputFilePath = messageData.filePath
        }
        if (messageData.type === 'text') {
          console.log(messageData.content)
          setLogContent(prevVal => {
            let result = ''
            if (messageData.content.includes('%') && isLastMsgWithPercent) {
              result = prevVal.replace(/^([\s\S]+\n)[\s\S]+$/, '$1') + messageData.content
            } else {
              result = prevVal + messageData.content
            }
            isLastMsgWithPercent = messageData.content.includes('%')
            return result
          })
        }
        if (messageData.type === 'close') {
          printLog('SeparateVocals进程已退出！')
          resolve(outputFilePath)
        }
      })
      pyShellPort.start()
    })

    if (vocalsAudioPath === '') {
      setIsRunning(false)
      printLog('流程中止')
      return
    }

    // start to generate srt with the vocals audio
    printLog('开始生成字幕文件...')
    const pyShellPort = pythonClient.generateSrt(
      store.main.appSettings.modelForGenerateSubtitle,
      vocalsAudioPath,
      store.main.appSettings.languageForGenerateSubtitle
    )

    let subtitleFilePath = ''
    pyShellPort.addEventListener('message', message => {
      const messageData: OrderMessageOfGenerateSrt.Messages = message.data
      if (messageData.type === 'sendOutputFilePath') {
        subtitleFilePath = messageData.filePath
      }
      if (messageData.type === 'text') {
        console.log(messageData.content)
        setLogContent(prevVal => prevVal + messageData.content)
      }
      if (messageData.type === 'close') {
        setLogContent(prevVal => prevVal + 'GenerateSrt进程已退出！\n')
        setIsRunning(false)

        fsPromise.rm(PREPROCESS_OUTPUT_CACHE_DIR_PATH, { recursive: true, force: true })
        fsPromise.stat(subtitleFilePath)
          .then(stat => {
            if (stat.size === 0) throw new Error()
            store.main.subtitleInputPath = subtitleFilePath
            printLog('字幕文件生成完毕！')
            notify.success('字幕文件生成完毕')
          })
          .catch(() => {
            const fileName = path.basename(subtitleFilePath)
            console.warn(`the visibility check for ${fileName} proved that it was not generated!`)
            printLog('字幕文件生成失败！')
            notify.error('字幕文件生成失败')
          })
      }
    })
    pyShellPort.start()
  }

  function stop() {
    pythonClient.killCurrentProcessOfGenerateSrt()
    pythonClient.killCurrentProcessOfSeparateVocals()
    setIsRunning(false)
  }

  return (
    <Dialog fullWidth
      open={isOpen}
      classes={{ paperFullWidth: classes.largerDialog }}
      onClose={(e, reason) => reason !== 'backdropClick' && setIsOpen(false)}
    >
      <DialogTitle>自动生成字幕文件</DialogTitle>
      <DialogContent style={{ paddingBottom: 5 }}>
        <Grid container spacing={3} style={{ marginTop: 2, position: 'relative', left: 16 }}>
          <Observer>{() => <>
            <Grid xs={4}>
              <div className="flex-row flex-cross-center">
                <Typography style={{ color: 'var(--text-secondary)' }}>生成语言：</Typography>
                <Select
                  size="small"
                  style={{ marginLeft: 10, width: 150 }}
                  value={store.main.appSettings.languageForGenerateSubtitle}
                  onChange={e => {
                    store.main.updateAppSetting('languageForGenerateSubtitle', e.target.value as any)
                  }}
                >
                  {languageListOfGenerateSubtitle.map(([value, showText]) =>
                    <MenuItem key={value} value={value}>{value} - {showText}</MenuItem>
                  )}
                </Select>
              </div>
            </Grid>
            <Grid xs={4}>
              <div className="flex-row flex-cross-center">
                <Typography style={{ color: 'var(--text-secondary)' }}>使用模型：</Typography>
                <Select displayEmpty
                  size="small"
                  style={{ marginLeft: 10, width: 150 }}
                  value={store.main.appSettings.modelForGenerateSubtitle}
                  onChange={e => {
                    store.main.updateAppSetting('modelForGenerateSubtitle', e.target.value as any)
                  }}
                  disabled={modelList.length === 0}
                  renderValue={value => value === '' ? '未选择' : value}
                >
                  {modelList.map(value =>
                    <MenuItem key={value} value={value}>{value}</MenuItem>
                  )}
                </Select>
              </div>
            </Grid>
          </>}</Observer>
        </Grid>
        <TextField multiline fullWidth focused
          value={logContent}
          label="日志"
          style={{ marginTop: 20 }}
          rows={15}
          inputProps={{ readonly: true }}
          ref={logTextFieldRef}
        />
        {/* {isRunning &&
          <div className="flex-row flex-cross-center" style={{ marginTop: 20, width: 420 }}>
            <div>
              <CircularProgress thickness={5} />
            </div>
            <div style={{ marginLeft: 25, position: 'relative', bottom: 5 }}>正在根据视频内容生成字幕，所需时长受硬件性能及视频长度影响，请耐心等待。</div>
          </div>
        } */}
      </DialogContent>
      <DialogActions>
        <Button onClick={start} disabled={isRunning}>开始</Button>
        {isRunning ?
          <Button onClick={stop}>中止</Button>
        :
          <Button onClick={() => setIsOpen(false)}>关闭</Button>
        }
      </DialogActions>
    </Dialog>
  )
}

export default DialogOfSubtitleGenerate
