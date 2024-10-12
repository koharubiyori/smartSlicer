import SubscriptionsIcon from '@mui/icons-material/Subscriptions'
import LockIcon from '@mui/icons-material/Lock'
import LockOpenIcon from '@mui/icons-material/LockOpen'
import { IconButton, ListItemText, MenuItem, Paper, Select, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import clsx from 'clsx'
import { reaction } from 'mobx'
import { Observer } from 'mobx-react-lite'
import path from 'path'
import { PropsWithChildren, useEffect, useRef, useState } from 'react'
import store from '~/store'
import { VideoSlice } from '~/store/main'
import SpeakersStore, { SpeakerSelects } from '~/store/speakers'
import { isVisibleOnScreen } from '~/utils/utils'
import classes from './index.module.scss'

export interface Props {

}


function SliceListFragment(props: PropsWithChildren<Props>) {
  const flagForAutoScrollIntoViewWhenCurrentSelectedSliceChangedByUserRef = useRef(false)
  const tableContainerEl = useRef<HTMLElement>()
  const tableBodyElRef = useRef<HTMLElement>()

  // 切换说话人筛选时自动滚动到之前保存的选定说话人的可见位置
  useEffect(() => reaction(
    () => store.speakers.selectedSpeakerName,
    () => setTimeout(scrollIntoViewForActiveSlice)
  ), [])

  // 当切片列表中的活动切片在屏幕上不可见时，将滚动条移至其可见位置
  useEffect(() => reaction(
    () => store.speakers.currentSelectedSlice,
    async () => {
      setTimeout(() => {
        const activeItemInSliceList = tableBodyElRef.current?.querySelector('.MuiTableRow-root[data-selected="true"]')
        if (
          activeItemInSliceList &&
          !isVisibleOnScreen(activeItemInSliceList) &&
          !flagForAutoScrollIntoViewWhenCurrentSelectedSliceChangedByUserRef.current
        ) scrollIntoViewForActiveSlice()

        flagForAutoScrollIntoViewWhenCurrentSelectedSliceChangedByUserRef.current = false
      })
    }
  ), [])

  function scrollIntoViewForActiveSlice() {
    const selectedItem = tableBodyElRef.current?.querySelector('.MuiTableRow-root[data-selected="true"]')
    selectedItem?.scrollIntoView({
      block: store.speakers.lastMovement === 'next' ? 'start' : 'end'
    })

    store.speakers.lastMovement === 'next' &&
      tableContainerEl.current?.scrollTo({ top: tableContainerEl.current!.scrollTop - 34 })
  }

  function isItemSelected(item: VideoSlice, index: number) {
    const speakerType = SpeakersStore.getSliceSpeakerType(item)
    const isTypeMatched = store.speakers.selectedSpeakerName === SpeakerSelects.All ||
      speakerType === store.speakers.selectedSpeakerName ||
      item.speaker === store.speakers.selectedSpeakerName ||
      store.speakers.selectedSliceListLocked
    const isIndexMatched = index === store.speakers.currentSelectedPosition
    return isTypeMatched && isIndexMatched
  }

  return (
    <Paper
      className="flex-column flex-center"
      style={{ marginTop: 10, height: 'calc(100% - 10px)' }}
    >
      <Observer>{() => <>
        {store.main.sliceList !== null &&
          <div className="flex-row flex-cross-center" style={{ padding: '5px 10px' }}>
            <Typography>说话人筛选：</Typography>
            <Select fullWidth
              className={clsx(classes.hideUnderline, 'flex')}
              size="small"
              variant="standard"
              value={store.speakers.selectedSpeakerName}
              color="primary"
              placeholder="全部"
              onChange={e => store.speakers.selectedSpeakerName = e.target.value as any}
            >
              <MenuItem value={SpeakerSelects.All}>全部</MenuItem>
              <MenuItem value={SpeakerSelects.Default}>默认说话人</MenuItem>
              <MenuItem value={SpeakerSelects.Marked}>已指定</MenuItem>
              <MenuItem value={SpeakerSelects.Unmarked}>未指定</MenuItem>
              {store.speakers.speakerList.filter(item => item.enabled).map(item =>
                <MenuItem key={item.id} value={item.name}>{item.name}</MenuItem>
              )}
            </Select>
            {store.speakers.selectedSpeakerName !== SpeakerSelects.All &&
              <IconButton
                style={{ marginRight: -5, padding: 3 }}
                onClick={() => store.speakers.toggleSliceListLock(store.speakers.selectedSpeakerName)}
              >
                {store.speakers.isSliceListLocked(store.speakers.selectedSpeakerName) ?
                  <LockIcon sx={{ fontSize: 18 }}></LockIcon>
                :
                  <LockOpenIcon sx={{ fontSize: 18 }}></LockOpenIcon>
                }
              </IconButton>
            }
          </div>
        }

        <TableContainer
          className="flex"
          ref={tableContainerEl as any}
        >
          {store.speakers.lockedOrNotSliceList.length !== 0 ? <>
            <Table stickyHeader size="small" style={{ maxHeight: '100%', tableLayout: 'fixed' }}>
              <TableHead>
                <TableRow>
                  <TableCell align="center" style={{ color: 'var(--text-secondary)', background: 'var(--background-paper)' }}>切片名</TableCell>
                  <TableCell align="center" style={{ color: 'var(--text-secondary)', background: 'var(--background-paper)' }}>说话人</TableCell>
                </TableRow>
              </TableHead>
              <TableBody ref={tableBodyElRef as any}>
                {store.speakers.lockedOrNotSliceList.map((item, index) =>
                  <TableRow
                    key={item.filePath + (item.speaker ?? '')}
                    sx={{ '&:last-child td, &:last-child th': { border: 0 }, cursor: 'pointer' }}
                    className={classes.speakerSelected}
                    data-selected={isItemSelected(item, index)}
                    onClick={() => {
                      store.speakers.positionsOfLockedOrNotSliceList[store.speakers.selectedSpeakerName] = index
                      flagForAutoScrollIntoViewWhenCurrentSelectedSliceChangedByUserRef.current = true
                    }}
                  >
                    <TableCell align="center" style={{ color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      {item.filePath}
                    </TableCell>
                    <TableCell align="center" style={{ color: 'var(--text-secondary)', minWidth: '5em' }}>{
                      item.speaker === SpeakerSelects.Default ? '默认说话人' : item.speaker ?? '未指定'
                    }</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </> :
            <div className="flex-column flex-center" style={{ backgroundColor: store.main.sliceList !== null ? 'var(--background-paper)' : 'transparent' }}>
              <SubscriptionsIcon style={{ width: 60, height: 60, fill: 'var(--text-secondary)' }} />
              <Typography style={{ color: 'var(--text-secondary)', marginTop: 10 }}>还没有视频切片</Typography>
            </div>
          }
        </TableContainer>
      </>
      }</Observer>
    </Paper>

  )
}

export default SliceListFragment
