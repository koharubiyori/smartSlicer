import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, LinearProgress } from '@mui/material'
import { MutableRefObject, PropsWithChildren, useState } from 'react'

export interface Props {
  isOpen: boolean
  completedNumber: number
  totalNumber: number
  onCancel(): void

  getRef?: MutableRefObject<any>
}

function DialogOfVideoSlice(props: PropsWithChildren<Props>) {
  return (
    <Dialog
      open={props.isOpen}
      onClose={() => {}}
    >
      <DialogTitle>正在切片</DialogTitle>
      <DialogContent>
        <DialogContentText>
          <div className="flex-row flex-cross-center">
            <LinearProgress
              style={{ width: 500 }}
              variant="determinate"
              value={Math.floor(props.completedNumber / props.totalNumber * 100)}
            />
            <div style={{ marginLeft: 10 }}>{props.completedNumber + '/' + props.totalNumber}</div>
          </div>
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onCancel}>中止</Button>
      </DialogActions>
    </Dialog>
  )
}

export default DialogOfVideoSlice
