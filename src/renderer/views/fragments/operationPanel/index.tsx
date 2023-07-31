import { Box, Button, FormGroup, Paper, TextField } from '@mui/material'
import { shell } from 'electron'
import fsPromise from 'fs/promises'
import { dialogIpcClient } from 'ipcHub/modules/dialog'
import { ffmpegIpcClient } from 'ipcHub/modules/ffmpeg'
import { pythonClient } from 'ipcHub/modules/python'
import { Observer } from 'mobx-react-lite'
import path, { join } from 'path'
import React, { PropsWithChildren, useRef, useState } from 'react'
import store from '~/store'
import { VideoSlice } from '~/store/main'
import { globalBackdropRef } from '~/utils/globalBackdrop'
import { notify } from '~/utils/notify'
import parseTimeRangesFromSubtitle from '~/utils/parseTimeRangesFromSubtitle'
import { getBaseFirstName } from '~/utils/utils'
import DialogOfAutoFilter from './components/dialogOfAutoFilter'
import DialogOfSpeakerManagement from './components/dialogOfSpeakerManagement'
import DialogOfSubtitleGenerate, { DialogOfSubtitleGenerateRef } from './components/dialogOfSubtitleGenerate'
import DialogOfVideoSlice, { Props as DialogPropsOfVideoSlice } from './components/dialogOfVideoSlice'
import dayjs from 'dayjs'
import { FFMPEG_TIME_FORMAT, supportedAudioExtList, supportedVideoExtList } from '~/../constants'
import { loadSlices as execLoadSlices, saveProjectFile } from './utils/loadSlices'
import Bottleneck from 'bottleneck'

export interface Props {

}

function OperationPanelFragment(props: PropsWithChildren<Props>) {
  const dialogOfSubtitleGenerateDialogRef = useRef<DialogOfSubtitleGenerateRef>()
  const [videoSliceDialogParams, setVideoSliceDialogParams] = useState<DialogPropsOfVideoSlice>({
    isOpen: false,
    totalNumber: 0,
    completedNumber: 0,
    onCancel: () => {}
  })
  const [isDialogOfSpeakerManagementOpen, setIsDialogOfSpeakerManagementOpen] = useState(false)
  const [isDialogOfAutoFilterOpen, setIsDialogOfAutoFilterOpen] = useState(false)

  async function showFileSelectDialog(type: 'media' | 'subtitle'): Promise<string | null> {
    const willUseFilters = {
      media: [
        { name: '默认', extensions: supportedVideoExtList.concat(supportedAudioExtList) },
        { name: '视频', extensions: supportedVideoExtList },
        { name: '音频', extensions: supportedAudioExtList },
        { name: '全部', extensions: ['*'] }
      ],

      subtitle: [{ name: '字幕文件', extensions: 'vtt|srt|ass|tsv'.split('|') }]
    }[type]

    const result = await dialogIpcClient.showOpenDialog({
      properties: ['openFile'],
      filters: willUseFilters
    })

    return result.canceled ? null : result.filePaths[0]
  }

  async function showDirSelectDialog(): Promise<string | null> {
    const result = await dialogIpcClient.showOpenDialog({
      properties: ['openDirectory'],
    })

    return result.canceled ? null : result.filePaths[0]
  }

  function selectDirByDrop(
    setter: (dirPath: string) => void
  ) {
    return (e: React.DragEvent<HTMLDivElement>) => {
      const firstItemOfDropped = e.dataTransfer.files[0]
      if (firstItemOfDropped && firstItemOfDropped.type === '') {
        if (path.extname(firstItemOfDropped.path) === '.lnk') {
          return setter(shell.readShortcutLink(firstItemOfDropped.path).target)
        }

        return setter(firstItemOfDropped.path)
      }

      notify.warning('请拖入一个文件夹！')
    }
  }

  async function generateSubtitle() {
    if (store.main.videoInputPath === '') return notify.warning('完整视频路径不能为空')

    globalBackdropRef.show()
    const isCudaAvailable = await pythonClient.isCudaAvailable()
    !isCudaAvailable && notify.warning('CUDA不可用，预计需要较长时间！')
    isCudaAvailable && !store.main.appSettings.useGpu && notify.warning('未开启GPU加速，预计需要较长时间！')

    globalBackdropRef.hide()
    dialogOfSubtitleGenerateDialogRef.current?.show()

    const outputPath = './generatedSubtitles'
    const result = await pythonClient.whisper(
      store.main.videoInputPath,
      store.main.appSettings.languageForGenerateSubtitle,
      outputPath,
      store.main.appSettings.useGpu ? 'cuda' : 'cpu'
    )

    dialogOfSubtitleGenerateDialogRef.current?.hide()
    if (result === null) {
      notify.success('生成完毕')
      const filePath = path.resolve(outputPath, path.basename(store.main.videoInputPath, path.extname(store.main.videoInputPath)) + '.srt')
      store.main.subtitleInputPath = filePath
    } else if (result !== 'SIGTERM') {
      notify.error('发生错误')
    }
  }

  async function videoSlice() {
    if (store.main.videoInputPath === '') return notify.warning('完整视频路径不能为空')
    if (store.main.subtitleInputPath === '') return notify.warning('字幕路径不能为空')
    if (store.main.slicesPath === '') return notify.warning('切片路径不能为空')

    try {
      const fileContent = await fsPromise.readFile(store.main.subtitleInputPath, 'utf-8')
      const result = parseTimeRangesFromSubtitle(fileContent, path.extname(store.main.subtitleInputPath).replace('.', '') as any)

      const limiter = new Bottleneck({
        maxConcurrent: store.main.appSettings.ffmpegWorkingNum,
        rejectOnDrop: false
      })
      result.forEach(async (item, index) => {
        limiter.schedule({ id: (index + 1).toString() }, async () => {
          await ffmpegIpcClient.slice({
            originalFilePath: store.main.videoInputPath,
            startTime: item[0],
            endTime: item[1],
            outputDirPath: store.main.slicesPath,
            outputFileName: (index + 1).toString(),
            useGpu: store.main.appSettings.useGpu,
          })

          setVideoSliceDialogParams(prevVal => ({ ...prevVal, completedNumber: prevVal.completedNumber + 1 }))
        })
      })

      limiter.on('failed', (error, jobInfo) => {
        if (jobInfo.retryCount < 3) {
          notify.warning('切片任务出错，准备重试：' + jobInfo.options.id)
          return 25   // 25毫秒后重试
        } else {
          notify.error('切片任务失败：' + jobInfo.options.id)
        }
      })

      limiter.once('empty', () => {
        setVideoSliceDialogParams(prevVal => ({ ...prevVal, isOpen: false }))
        notify.success('切片完成！')
        loadSlices()
      })

      setVideoSliceDialogParams({
        isOpen: true,
        completedNumber: 0,
        totalNumber: result.length,
        onCancel: async () => {
          setVideoSliceDialogParams(prevVal => ({ ...prevVal, isOpen: false }))
          await limiter.disconnect()
          limiter.stop()
        }
      })
    } catch(e) {
      console.log(e)
      notify.error('发生异常：' + e)
    }
  }

  async function loadSlices() {
    if (store.main.slicesPath === '') return notify.warning('切片路径不能为空')
    const loadResult = await execLoadSlices(store.main.slicesPath)
    store.main.sliceList = loadResult.slices

    if (loadResult.source === 'files') {
      saveProjectFile(store.main.slicesPath, loadResult.slices)
    }
  }

  async function output() {
    if (store.main.outputPath === '') return notify.warning('最终输出路径不能为空')
    const modifiedSliceList = store.main.sliceList?.filter(item => item.modified)
    if (modifiedSliceList == null || modifiedSliceList.length === 0) return notify.warning('没有可输出的结果')
    globalBackdropRef.show()
    const speakerNames = new Set(modifiedSliceList.map(item => item.speaker))
    for (let item of speakerNames) await fsPromise.mkdir(path.join(store.main.outputPath, item!)).catch(() => {})

    const limiter = new Bottleneck({
      maxConcurrent: store.main.appSettings.ffmpegWorkingNum,
      rejectOnDrop: false
    })

    modifiedSliceList.forEach(item => {
      limiter.schedule(() => {
        const outputDirPath = path.join(store.main.outputPath, item.speaker!)
        return ffmpegIpcClient.slice({
          originalFilePath: path.join(store.main.slicesPath, item.filePath),
          outputDirPath,
          outputFileName: getBaseFirstName(item.filePath),
          startTime: item.cutRange ? dayjs.duration(Math.round(item.cutRange[0] * 1000)).format(FFMPEG_TIME_FORMAT) : undefined,
          endTime: item.cutRange ? dayjs.duration(Math.round(item.cutRange![1] * 1000)).format(FFMPEG_TIME_FORMAT) : undefined,
          audioOnly: store.main.appSettings.outputAudioOnly,
        })
      })
    })

    limiter.on('failed', (error, jobInfo) => jobInfo.retryCount < 3 ? 25 : undefined)
    limiter.once('empty', () => {
      globalBackdropRef.hide()
      notify.success('输出结果完成')
      store.main.sliceList = null
    })
  }

  return (
    <Paper style={{ marginLeft: 10, boxSizing: 'border-box', padding: 10 }}>
      <FormGroup>
        <Observer>{() => <>
          <Box className="flex-row flex-cross-end">
            <TextField fullWidth
              variant="standard"
              label="完整视频路径"
              value={store.main.videoInputPath}
              onChange={e => store.main.videoInputPath = e.target.value}
              onDrop={e => store.main.videoInputPath = e.dataTransfer.files[0]?.path ?? ''}
            />
            <Button
              variant="contained"
              color="secondary"
              size="small"
              style={{ marginLeft: 10 }}
              onClick={async () => {
                const result = await showFileSelectDialog('media')
                if (result) store.main.videoInputPath = result
              }}
            >浏览</Button>
          </Box>

          <Box className="flex-row flex-cross-end" style={{ marginTop: 5 }}>
            <TextField fullWidth
              variant="standard"
              label="字幕文件路径"
              value={store.main.subtitleInputPath}
              onChange={e => store.main.subtitleInputPath = e.target.value}
              onDrop={e => store.main.subtitleInputPath = e.dataTransfer.files[0]?.path ?? ''}
            />
            <Button
              variant="contained"
              color="secondary"
              size="small"
              style={{ marginLeft: 10 }}
              onClick={async () => {
                const result = await showFileSelectDialog('subtitle')
                if (result) store.main.subtitleInputPath = result
              }}
            >浏览</Button>

            {/* <Button
              variant="contained"
              color="secondary"
              size="small"
              style={{ marginLeft: 10, whiteSpace: 'nowrap' }}
              onClick={generateSubtitle}
            >自动生成</Button> */}
          </Box>

          <Box className="flex-row flex-cross-end" style={{ marginTop: 5 }}>
            <TextField fullWidth
              variant="standard"
              label="视频切片路径"
              value={store.main.slicesPath}
              onChange={e => store.main.slicesPath = e.target.value}
              onDrop={selectDirByDrop(path => {
                store.main.slicesPath = path
                if (store.main.outputPath === '') store.main.outputPath = path
              })}
            />
            <Button
              variant="contained"
              color="secondary"
              size="small"
              style={{ marginLeft: 10 }}
              onClick={async () => {
                const result = await showDirSelectDialog()
                if (!result) { return }
                store.main.slicesPath = result
                if (store.main.outputPath === '') store.main.outputPath = result
              }}
            >浏览</Button>
            <Button
              variant="contained"
              color="secondary"
              size="small"
              style={{ marginLeft: 10, whiteSpace: 'nowrap' }}
              onClick={videoSlice}
            >执行切片</Button>
          </Box>

          <Box className="flex-row flex-cross-end" style={{ marginTop: 5 }}>
            <TextField fullWidth
              variant="standard"
              label="最终输出路径"
              value={store.main.outputPath}
              onChange={e => store.main.outputPath = e.target.value}
              onDrop={selectDirByDrop(path => store.main.outputPath = path)}
            />
            <Button
              variant="contained"
              color="secondary"
              size="small"
              style={{ marginLeft: 10 }}
              onClick={async () => {
                const result = await showDirSelectDialog()
                if (result) store.main.outputPath = result
              }}
            >浏览</Button>
            <Button
              variant="contained"
              color="secondary"
              size="small"
              style={{ marginLeft: 10 }}
              onClick={async () => {
                if (store.main.outputPath === '') return notify.warning('还未填写最终输出路径')
                shell.openPath(store.main.outputPath)
              }}
            >打开</Button>
          </Box>
        </>}</Observer>

        <Box className="flex-row flex-between flex-cross-center" style={{ marginTop: 10 }}>
          <div className="flex-row-inline">
            <Button
              variant="contained"
              color="secondary"
              size="small"
              onClick={loadSlices}
            >加载视频切片</Button>

            <Button
              variant="contained"
              color="secondary"
              size="small"
              style={{ marginLeft: 10 }}
              onClick={() => setIsDialogOfSpeakerManagementOpen(true)}
            >说话人管理</Button>

            <Button
              variant="contained"
              color="secondary"
              size="small"
              style={{ marginLeft: 10 }}
              onClick={() => setIsDialogOfAutoFilterOpen(true)}
            >切片自动筛选</Button>

            {/* <Button
              variant="contained"
              color="secondary"
              size="small"
              style={{ marginLeft: 10 }}
              onClick={() => {}}
            >后台切片</Button> */}
          </div>

          <Button
            variant="contained"
            color="primary"
            size="small"
            onClick={output}
          >输出结果</Button>
        </Box>
      </FormGroup>

      <DialogOfSubtitleGenerate getRef={dialogOfSubtitleGenerateDialogRef} />
      <DialogOfVideoSlice {...videoSliceDialogParams} />
      <DialogOfSpeakerManagement
        isOpen={isDialogOfSpeakerManagementOpen}
        onCancel={() => setIsDialogOfSpeakerManagementOpen(false)}
      />
      <DialogOfAutoFilter isOpen={isDialogOfAutoFilterOpen} onClose={() => setIsDialogOfAutoFilterOpen(false)} />
    </Paper>
  )
}

export default OperationPanelFragment
