import { Button, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, TextField } from '@mui/material'
import path from 'path'
import { PropsWithChildren, useEffect, useRef, useState } from 'react'
import store from '~/store'
import { VideoSlice } from '~/store/main'
import FilterTasksScheduler, { InferResult } from '../../utils/filterTasksScheduler'

export interface Props {
  scheduler: FilterTasksScheduler | null
  isOpen: boolean
  onCancel(): void
}

function DialogOfFilterResult(props: PropsWithChildren<Props>) {
  const [evaluatedCount, setEvaluatedCount] = useState(0)
  const [speakerResultCounts, setSpeakerResultCounts] = useState<Record<string, number>>({})
  const [logContent, setLogContent] = useState('')
  const [stopped, setStopped] = useState(false)
  const notMatchedText = '无匹配'
  const logTextFieldRef = useRef<HTMLDivElement>()

  useEffect(() => {
    if (!props.scheduler) { return }

    setEvaluatedCount(0)
    initSpeakerCounts()
    setLogContent('开始筛选...')
    setStopped(false)
    props.scheduler.onEvaluated = (newVideoSlice, scores, count, originalVideoSlice) => {
      if (newVideoSlice) store.speakers.emit(newVideoSlice)
      const speaker = newVideoSlice?.speaker ?? notMatchedText
      setSpeakerResultCounts(prevVal => ({
        ...prevVal,
        [speaker]: prevVal[speaker] + 1
      }))

      generateLogLine(newVideoSlice, scores, count, originalVideoSlice)
      setEvaluatedCount(count)

      if (props.scheduler?.sliceList?.length === count) {
        setLogContent(prevVal => prevVal + '\n筛选结束！')
        setStopped(true)
      }
    }

    props.scheduler.start()
  }, [props.scheduler])

  useEffect(() => {
    logTextFieldRef.current?.querySelector('textarea')?.scrollBy(0, 1e16)
  }, [logContent])

  function initSpeakerCounts() {
    const entries = props.scheduler!.speakerList.map(item => [
      item.name,
      item.voiceSample.length === 0 ? -1 : 0  // if there are no voice samples for the speaker, use -1 as a marker
    ]).concat([[notMatchedText, 0]])
    setSpeakerResultCounts(Object.fromEntries(entries))
  }

  function generateLogLine(newVideoSlice: VideoSlice | null, scores: InferResult[], count: number, originalVideoSlice: VideoSlice) {
    const basename = path.basename(originalVideoSlice.filePath)
    const namedScores = scores.reduce((prevVal, item) => {
      prevVal.find(prevValItem => prevValItem.speakerId === item.speakerId)?.scores.push(item.score.toFixed(2)) ??
        prevVal.push({ speakerId: item.speakerId, scores: [item.score.toFixed(2)] })
      return prevVal
    }, [] as { speakerId: string, scores: string[] }[])
      .map(item => {
        const speakerName = props.scheduler!.speakerList.find(speakerItem => speakerItem.id === item.speakerId)!.name
        return `\n${speakerName} [${item.scores.join(', ')}]`
      })
      .join('')

    const resultSpeaker = newVideoSlice?.speaker ?? notMatchedText
    const namedScoresOrError = newVideoSlice ? namedScores : '因切片长度小于0.5秒或其他原因导致推理失败'
    setLogContent(prevVal => prevVal + `\n第${count}个结果(${basename}, ${resultSpeaker})：${namedScoresOrError}`)
  }

  function stop() {
    props.scheduler!.stop()
    setStopped(true)
    setLogContent(prevVal => prevVal + '\n筛选中止！')
  }

  return (
    <Dialog
      open={props.isOpen}
      onClose={(e, reason) => reason !== 'backdropClick' && props.onCancel()}
    >
      <DialogTitle>执行自动筛选</DialogTitle>
      <DialogContent style={{ minWidth: 500 }}>
        <div style={{ columnCount: 4 }}>
          {Object.entries(speakerResultCounts).map(([speakerName, count]) =>
            <p key={speakerName} style={{ margin: 0, paddingBottom: 10 }}>
              {speakerName}：{count === -1 ? '无声音样本' : count}
            </p>
          )}
        </div>
        <div className="flex-row flex-cross-center">
          <LinearProgress
            style={{ width: 500 }}
            variant="determinate"
            value={Math.floor(evaluatedCount / (props.scheduler?.sliceList?.length ?? 0) * 100)}
          />
          <div style={{ marginLeft: 10 }}>{evaluatedCount + '/' + props.scheduler?.sliceList?.length}</div>
        </div>
        <TextField multiline fullWidth focused
          value={logContent}
          label="日志"
          style={{ marginTop: 20 }}
          rows={10}
          inputProps={{ readonly: true }}
          ref={logTextFieldRef as any}
        />
      </DialogContent>
      <DialogActions>
        {stopped ?
          <Button onClick={() => { props.onCancel() }}>关闭</Button>
        :
          <Button onClick={stop}>中止</Button>
        }
      </DialogActions>
    </Dialog>
  )
}

export default DialogOfFilterResult
