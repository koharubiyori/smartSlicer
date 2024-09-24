import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormControlLabel, InputLabel, MenuItem, Select, Slider, Switch, TextField, Typography } from '@mui/material'
import { Observer, useLocalStore } from 'mobx-react-lite'
import { PropsWithChildren, useEffect, useState } from 'react'
import CssVariablesOfTheme from '~/components/cssVariablesOfTheme'
import autoFilterPrefs from '~/prefs/autoFilterPrefs'
import store from '~/store'
import { notify } from '~/utils/notify'
import DialogOfFilterResult from './components/dialogOfFilterResult'
import FilterTasksScheduler from './utils/filterTasksScheduler'

export interface Props {
  isOpen: boolean
  onClose(): void
}

function DialogOfAutoFilter(props: PropsWithChildren<Props>) {
  const localStore = useLocalStore(() => ({ ...autoFilterPrefs, workerNum: autoFilterPrefs.workerNum.toString() }))
  const [isResultDialogOpen, setIsResultDialogOpen] = useState(false)
  const [filterTasksScheduler, setFilterTasksScheduler] = useState<FilterTasksScheduler | null>(null)

  useEffect(() => void(FilterTasksScheduler.cleanCache()), [])

  useEffect(() => {
    if (props.isOpen) { return }
    Object.entries(localStore).forEach(([key, value]) => {
      if (key === 'workerNum') {
        autoFilterPrefs[key] = parseInt(value as string)
      } else {
        (autoFilterPrefs as any)[key] = value
      }
    })
  }, [props.isOpen])

  function execute() {
    if (store.speakers.sliceListOfSelectedSpeaker.length === 0) return notify.warning('当前切片列表为空')
    if (localStore.workerNum === '') return notify.warning('工作进程数不能为空')
    const speakerList = store.speakers.speakerList
      .filter(item => item.enabled)
    const isNoSampledSpeaker = speakerList.every(item => item.voiceSample.length === 0)
    if (isNoSampledSpeaker) return notify.warning('没有已配置声音样本的说话人，如果已经配置请确认是否已启用')

    const scheduler = new FilterTasksScheduler(
      store.speakers.sliceListOfSelectedSpeaker,
      speakerList,
      { ...localStore, workerNum: parseInt(localStore.workerNum) },
      store.main.activeSlicesPath
    )

    scheduler.start()
    setFilterTasksScheduler(scheduler)
    setIsResultDialogOpen(true)
  }

  return (
    <Dialog
      open={props.isOpen}
      onClose={() => {}}
    >
      <CssVariablesOfTheme>
        <DialogTitle>切片自动筛选</DialogTitle>
        <DialogContent style={{ minWidth: 400 }}>
          <Observer>{() => <>
            <div className="flex-row flex-cross-center">
            <FormControl sx={{ m: 1, minWidth: 120 }}>
              <InputLabel>评估模式</InputLabel>
                <Select
                  value={localStore.evaluateMode}
                  color="primary"
                  label="评估模式"
                  onChange={e => localStore.evaluateMode = e.target.value as any}
                >
                  <MenuItem value="quick">快速</MenuItem>
                  <MenuItem value="normal">通常</MenuItem>
                  <MenuItem value="strict">严格</MenuItem>
                </Select>
              </FormControl>

              <FormControl sx={{ m: 1, minWidth: 120 }}>
                <InputLabel>计算方法</InputLabel>
                <Select
                  value={localStore.computeMethod}
                  disabled={localStore.evaluateMode === 'quick'}
                  color="primary"
                  label="计算方法"
                  onChange={e => localStore.computeMethod = e.target.value as any}
                >
                  <MenuItem value="average">平均值</MenuItem>
                  <MenuItem value="max">最大值</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="工作进程数"
                value={localStore.workerNum}
                sx={{ m: 1, width: 120 }}
                onChange={e => {
                  if (/^[1-9][0-9]*$/.test(e.target.value)) localStore.workerNum = e.target.value
                  if (e.target.value === '') localStore.workerNum = ''
                }}
              />

              <FormControlLabel
                style={{ marginLeft: 0 }}
                disabled={localStore.evaluateMode === 'strict'}
                control={<Switch
                  checked={localStore.isForce}
                  onChange={(_, checked) => localStore.isForce = checked}
                />}
                label={<Typography>强制匹配</Typography>}
              />
            </div>
            <div className='flex-row flex-cross-center'>
              <Typography style={{ position: 'relative', top: -3 }}>评估阈值：</Typography>
              <Slider
                className="flex"
                style={{ margin: '0 5px' }}
                value={localStore.threshold}
                valueLabelDisplay="auto"
                max={1}
                step={0.01}
                marks={sliderMarks}
                onChange={(e, value) => localStore.threshold = value as number}
              />
            </div>
          </>}</Observer>
        </DialogContent>
        <DialogActions>
          <Button onClick={execute}>执行</Button>
          <Button onClick={props.onClose}>关闭</Button>
        </DialogActions>
      </CssVariablesOfTheme>
      <DialogOfFilterResult
        isOpen={isResultDialogOpen}
        scheduler={filterTasksScheduler}
        onCancel={() => setIsResultDialogOpen(false)}
      />
    </Dialog>
  )
}

export default DialogOfAutoFilter

export interface AutoFilterSettings {
  evaluateMode: 'quick' | 'normal' | 'strict'
  computeMethod: 'average' | 'max'
  isForce: boolean
  workerNum: number
  threshold: number
}

const sliderMarks = new Array(11).fill(0).map((_, index) => ({ value: 0.1 * index, label: (0.1 * index).toFixed(1) }))
