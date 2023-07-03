import { Backdrop, CircularProgress } from '@mui/material'
import React, { MutableRefObject, PropsWithChildren, useEffect, useState } from 'react'

export interface Props {
  getRef?: MutableRefObject<GlobalBackdropRef>
}

export interface GlobalBackdropRef {
  show(): void
  hide(): void
}

export let globalBackdropRef: GlobalBackdropRef = null as any

function GlobalBackdrop(props: PropsWithChildren<Props>) {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    globalBackdropRef = {
      show: () => setIsOpen(true),
      hide: () => setIsOpen(false)
    }
  }, [])

  return (
    <Backdrop
      sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
      open={isOpen}
    >
      <CircularProgress color="inherit" />
    </Backdrop>
  )
}

export default GlobalBackdrop
