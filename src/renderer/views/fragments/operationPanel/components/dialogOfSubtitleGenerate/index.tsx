import { Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material'
import { pythonClient } from 'ipcHub/modules/python'
import React, { MutableRefObject, PropsWithChildren, Ref, useRef, useState } from 'react'

export interface Props {
  getRef?: MutableRefObject<any>
}

export interface DialogOfSubtitleGenerateRef {
  show(): void
  hide(): void
}

function DialogOfSubtitleGenerate(props: PropsWithChildren<Props>) {
  const [isOpen, setIsOpen] = useState(false)

  if (props.getRef) props.getRef.current = {
    show: () => setIsOpen(true),
    hide: () => setIsOpen(false)
  }

  function stop() {
    pythonClient.killCurrentWhisperProcess()
    setIsOpen(false)
  }

  return (
    <Dialog
      open={isOpen}
      onClose={(e, reason) => reason !== 'backdropClick' && setIsOpen(false)}
    >
      <DialogTitle>自动生成字幕</DialogTitle>
      <DialogContent style={{ maxWidth: 350 }}>
        <DialogContentText>
          <div className="flex-row flex-cross-center">
            <div>
              <CircularProgress thickness={5} style={{ position: 'relative', top: 5 }} />
            </div>
            <div style={{ marginLeft: 25 }}>正在根据视频内容生成字幕，所需时长受硬件性能及视频长度影响，请耐心等待。</div>
          </div>
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={stop}>中止</Button>
      </DialogActions>
    </Dialog>
  )
}

export default DialogOfSubtitleGenerate
