import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import InfoIcon from '@mui/icons-material/Info'
import VolumeUpIcon from '@mui/icons-material/VolumeUp'
import { Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Input, List, ListItem, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material'
import fsPromise from 'fs/promises'
import { dialogIpcClient } from 'ipcHub/modules/dialog'
import { autorun, makeAutoObservable, observable, toJS } from 'mobx'
import { Observer } from 'mobx-react-lite'
import path from 'path'
import { PropsWithChildren, useEffect, useRef, useState } from 'react'
import { SPEAKER_VOICE_SAMPLES_DIR_PATH } from '~/../constants'
import CssVariablesOfTheme from '~/components/cssVariablesOfTheme'
import speakersPrefs from '~/prefs/speakersPrefs'
import store from '~/store'
import { Speaker } from '~/store/speakers'
import { notify } from '~/utils/notify'
import { showConfirm } from '~/utils/utils'

export interface Props {
  isOpen: boolean
  onCancel: () => void
}

function DialogOfSpeakerManagement(props: PropsWithChildren<Props>) {
  const localSpeakerList = useRef<Speaker[]>([])  // 每次打开dialog时获取speakerList快照用来修改，保存时再将快照提交
  const audioRef = useRef<HTMLAudioElement>()

  useEffect(() => {
    if (!props.isOpen) { return }
    localSpeakerList.current = observable(toJS(store.speakers.speakerList))
    clean()
  }, [props.isOpen])

  function addSpeaker() {
    const id = Date.now().toString()
    localSpeakerList.current.push({
      id,
      enabled: true,
      name: '',
      boundKey: '',
      voiceSample: []
    })
  }

  async function addVideoSample(speakerId: string) {
    const result = await dialogIpcClient.showOpenDialog({
      filters: [{ name: 'wav文件', extensions: ['wav'] }],
      properties: ['openFile', 'multiSelections']
    })

    if (result.canceled) { return }

    await fsPromise.mkdir(path.join(SPEAKER_VOICE_SAMPLES_DIR_PATH, speakerId), { recursive: true }).catch(console.log)

    const sampleFilePaths = result.filePaths
    for (let item of sampleFilePaths) {
      const baseName = path.basename(item)
      const targetPath = path.join(SPEAKER_VOICE_SAMPLES_DIR_PATH, speakerId, baseName)
      await fsPromise.copyFile(item, targetPath)
    }

    const baseNameList = sampleFilePaths.map(item => path.basename(item))
    const targetSpeaker = localSpeakerList.current.find(item => item.id === speakerId)!
    targetSpeaker?.voiceSample.push(...baseNameList)
  }

  async function playVideoSample(speakerId: string, sampleFileName: string) {
    const filePath = path.join(SPEAKER_VOICE_SAMPLES_DIR_PATH, speakerId, sampleFileName)
    await new Promise(resolve => {
      audioRef.current!.oncanplay = resolve
      audioRef.current!.src = filePath.replaceAll('#', '%23')
    })

    audioRef!.current!.play()
  }

  async function removeVideoSample(speakerId: string, sampleFileName: string) {
    if (!await showConfirm({ message: '确定要删除这条样本？' })) { return }

    const filePath = path.join(SPEAKER_VOICE_SAMPLES_DIR_PATH, speakerId, sampleFileName)
    const targetSpeaker = localSpeakerList.current.find(item => item.id === speakerId)!
    targetSpeaker.voiceSample = targetSpeaker.voiceSample.filter(item => item !== sampleFileName)
  }

  async function removeSpeaker(speakerId: string) {
    if (!await showConfirm({ message: '确定要删除这个说话人？' })) { return }

    const foundWillDeleteIndex = localSpeakerList.current.findIndex(item => item.id === speakerId)
    localSpeakerList.current.splice(foundWillDeleteIndex, 1)
  }

  function save() {
    if (localSpeakerList.current.some(item => item.name.trim() === '')) return notify.warning('说话人名称不能为空')

    const nameCount: Record<string, number> = {}
    const keyCount: Record<string, number> = {}
    localSpeakerList.current.forEach(item => {
      nameCount[item.name] = (nameCount[item.name] ?? 0) + 1
      keyCount[item.boundKey] = (keyCount[item.boundKey] ?? 0) + 1
    })

    const duplicatedName = Object.entries(nameCount).filter(([_, count]) => count > 1).map(item => item[0])
    const duplicatedKey = Object.entries(keyCount).filter(([key, count]) => key !== '' && count > 1).map(item => item[0])
    if (duplicatedName.length !== 0) return notify.warning('存在重复的说话人名称：' + duplicatedName.join('、'))
    if (duplicatedKey.length !== 0) return notify.warning('存在重复的快捷键设置：' + duplicatedKey.join(', '))

    store.speakers.speakerList = localSpeakerList.current
    speakersPrefs.speakerList = localSpeakerList.current
    notify.success('已保存说话人配置')
    props.onCancel()
  }

  async function clean() {
    const allDirList = await fsPromise.readdir(SPEAKER_VOICE_SAMPLES_DIR_PATH)
    const validDirList = localSpeakerList.current.map(item => item.id)
    const invalidDirList = allDirList.filter(item => !validDirList.includes(item))

    await Promise.all(
      invalidDirList.map(item => fsPromise.rmdir(path.join(SPEAKER_VOICE_SAMPLES_DIR_PATH, item), { recursive: true }))
    )

    try {
      await Promise.all(
        localSpeakerList.current.map(async item => {
          const allFileList = await fsPromise.readdir(path.join(SPEAKER_VOICE_SAMPLES_DIR_PATH, item.id))
          const validFileList = item.voiceSample
          const invalidFileList = allFileList.filter(item => !validFileList.includes(item))
          return invalidFileList.map(fileName =>
            fsPromise.rm(path.join(SPEAKER_VOICE_SAMPLES_DIR_PATH, item.id, fileName))
          )
        }).flat()
      )
    } catch(e) {
      console.log(e)
    }
  }

  return (
    <Dialog
      maxWidth="lg"
      open={props.isOpen}
    >
      <CssVariablesOfTheme>
        <DialogTitle>说话人管理</DialogTitle>
        <DialogContent style={{ minWidth: 700 }}>
          <div className="flex-row flex-main-end">
            <Button variant="contained" onClick={addSpeaker}>添加说话人</Button>
          </div>
          <TableContainer
            component={Paper}
            style={{ marginTop: 10, maxHeight: 400, overflowY: 'auto' }}
          >
            <Table stickyHeader size="small" style={{ height: '100%' }}>
              <TableHead>
                <TableRow>
                  <TableCell align="center" style={{ color: 'var(--text-secondary)', background: 'var(--background-paper)' }}>启用</TableCell>
                  <TableCell align="center" style={{ color: 'var(--text-secondary)', background: 'var(--background-paper)' }}>名称</TableCell>
                  <TableCell align="center" style={{ color: 'var(--text-secondary)', background: 'var(--background-paper)' }}>
                    <div
                      style={{ cursor: 'help' }}
                      title="只允许使用A到Z单键"
                    >
                      <span style={{ position: 'relative' }}>
                        <span>快捷键</span>
                        <InfoIcon style={{ fontSize: 14, position: 'absolute', top: -3 }} />
                      </span>
                    </div>
                  </TableCell>
                  <TableCell align="center" style={{ color: 'var(--text-secondary)', background: 'var(--background-paper)' }}>声音样本</TableCell>
                  <TableCell align="center" style={{ color: 'var(--text-secondary)', background: 'var(--background-paper)' }}>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <DefaultSpeakerDataRow />
                <Observer>{() => <>
                  {localSpeakerList.current.map(item =>
                    <TableRow
                      key={item.id}
                      sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                    >
                      <TableCell align="center">
                        <Checkbox
                          color="primary"
                          checked={item.enabled}
                          onChange={(_, checked) => item.enabled = checked}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Input
                          value={item.name}
                          size="small"
                          inputProps={{
                            style: { width: '7em', textAlign: 'center' }
                          }}
                          placeholder="说话人名称"
                          onChange={e => item.name = e.target.value}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Input
                          value={item.boundKey}
                          size="small"
                          inputProps={{
                            style: { width: '3em', textAlign: 'center' }
                          }}
                          placeholder="无"
                          onKeyDown={e => {
                            if (/^[A-Za-z]$/.test(e.key)) item.boundKey = e.key.toUpperCase()
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <List dense style={{ maxHeight: 205, overflowY: 'auto' }}>
                          {item.voiceSample.map(fileName =>
                            <ListItem
                              key={fileName}
                              style={{ width: 200, margin: '0 auto', marginBottom: 5, border: '1px var(--text-secondary) solid', borderRadius: 3 }}
                            >
                              <div className="flex-row flex-cross-center flex-between">
                                <div style={{ textOverflow: 'ellipsis', overflow: 'hidden' }}>{fileName}</div>
                                <div className='flex-row-inline' style={{ marginLeft: 10 }}>
                                  <IconButton onClick={() => playVideoSample(item.id, fileName)}>
                                    <VolumeUpIcon style={{ fontSize: 20, fill: 'var(--text-secondary)' }} />
                                  </IconButton>
                                  <IconButton onClick={() => removeVideoSample(item.id, fileName)}>
                                    <DeleteIcon style={{ fontSize: 20, fill: 'var(--text-secondary)' }} />
                                  </IconButton>
                                </div>
                              </div>
                            </ListItem>
                          )}
                          <ListItem style={{ padding: 0, }}>
                            <Button
                              variant="outlined"
                              sx={{ width: 200, margin: '0 auto' }}
                              onClick={() => addVideoSample(item.id)}
                            >
                              <AddIcon />
                            </Button>
                          </ListItem>
                        </List>
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          variant="text"
                          onClick={() => removeSpeaker(item.id)}
                        >删除</Button>
                      </TableCell>
                    </TableRow>
                  )}

                  {/* {localSpeakerList.current.length === 0 &&
                    <TableCell colSpan={4} align="center" height={150}>
                      <PeopleAltIcon style={{ fill: 'var(--text-secondary)', fontSize: 70 }} />
                      <Typography style={{ color: 'var(--text-secondary)' }}>还没有任何说话人</Typography>
                    </TableCell>
                  } */}
                </>}</Observer>
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={save}>保存</Button>
          <Button onClick={props.onCancel}>放弃并关闭</Button>
        </DialogActions>
        <audio ref={audioRef as any} preload="auto" style={{ position: 'absolute', left: -9999 }} />
      </CssVariablesOfTheme>
    </Dialog>
  )
}

export default DialogOfSpeakerManagement

function DefaultSpeakerDataRow() {
  return (
    <TableRow
      sx={{ '&:last-child td, &:last-child th': { border: 0 }, color: 'var(--text-secondary)' }}
    >
      <TableCell align="center">
        <Checkbox checked disabled
          color="primary"
        />
      </TableCell>
      <TableCell align="center">默认说话人</TableCell>
      <TableCell align="center">方向键↑</TableCell>
      <TableCell align="center">不适用</TableCell>
      <TableCell align="center">不适用</TableCell>
    </TableRow>
  )
}
