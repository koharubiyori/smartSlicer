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
  const notMatchedText = '无匹配'
  const logTextFieldRef = useRef<HTMLDivElement>()

  useEffect(() => {
    if (!props.scheduler) { return }

    setEvaluatedCount(0)
    initSpeakerCounts()
    setLogContent('开始筛选...')
    props.scheduler.onEvaluated = (newVideoSlice, scores, count, originalVideoSlice, failed) => {
      if (newVideoSlice && !failed) {
        store.speakers.emit(newVideoSlice)
        setSpeakerResultCounts(prevVal => ({
          ...prevVal,
          [newVideoSlice.speaker!]: prevVal[newVideoSlice.speaker!] + 1
        }))
      } else {
        setSpeakerResultCounts(prevVal => ({
          ...prevVal,
          [notMatchedText]: prevVal[notMatchedText] + 1
        }))
      }

      generateLogLine(newVideoSlice, scores, count, originalVideoSlice, failed)
      setEvaluatedCount(count)

      if (props.scheduler?.sliceList?.length === count) {
        setLogContent(prevVal => prevVal + '\n筛选结束！')
      }
    }

    props.scheduler.start()
  }, [props.scheduler])

  useEffect(() => {
    logTextFieldRef.current?.querySelector('textarea')?.scrollBy(0, 1e16)
  }, [logContent])

  function initSpeakerCounts() {
    const entries = props.scheduler!.speakerList.map(item => [item.name, 0]).concat([[notMatchedText, 0]])
    setSpeakerResultCounts(Object.fromEntries(entries))
  }

  function generateLogLine(newVideoSlice: VideoSlice | null, scores: InferResult[], count: number, originalVideoSlice: VideoSlice, failed: boolean) {
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

    const resultSpeaker = newVideoSlice ? newVideoSlice.speaker : notMatchedText
    const namedScoresOrError = scores.some(item => item.score !== -1) ? namedScores : '因切片长度小于0.5秒或其他原因导致推理失败'
    setLogContent(prevVal => prevVal + `\n第${count}个结果(${basename}, ${resultSpeaker})：${namedScoresOrError}`)
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
            <p key={speakerName} style={{ margin: 0, paddingBottom: 10 }}>{speakerName}：{count}</p>
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
        <Button onClick={() => { props.scheduler!.stop(); props.onCancel() }}>中止并关闭</Button>
      </DialogActions>
    </Dialog>
  )
}

export default DialogOfFilterResult
