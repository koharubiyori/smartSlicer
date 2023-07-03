import { SnackbarProvider, SnackbarProviderProps } from 'notistack'
import React, { useLayoutEffect, useRef } from 'react'

export type NotifyType = 'default' | 'info' | 'success' | 'warning' | 'error'
export type NotifyPositions = ['top' | 'bottom', 'left' | 'center' | 'right']

export interface Notify {
  (message: string, position?: NotifyPositions): void
  success (message: string, position?: NotifyPositions): void
  info (message: string, position?: NotifyPositions): void
  warning (message: string, position?: NotifyPositions): void
  error (message: string, position?: NotifyPositions): void
}

export let notify: Notify = null!

export interface NotifyProviderProps extends SnackbarProviderProps {}

export function NotifyProvider(props: NotifyProviderProps) {
  const snackbarRef = useRef<any>()

  useLayoutEffect(() => {
    const msg = snackbarRef.current.enqueueSnackbar!

    const createOptions = (
      type: NotifyType = 'default',
      position: NotifyPositions = ['top', 'center']
    ) => ({
      variant: type,
      anchorOrigin: { vertical: position[0], horizontal: position[1] },
      autoHideDuration: 3000
    })

    let notifyClient: any = (message: any, position?: any) => msg(message, createOptions('default', position))
    notifyClient.info = (message: any, position?: any) => msg(message, createOptions('info', position))
    notifyClient.success = (message: any, position?: any) => msg(message, createOptions('success', position))
    notifyClient.warning = (message: any, position?: any) => msg(message, createOptions('warning', position))
    notifyClient.error = (message: any, position?: any) => msg(message, createOptions('error', position))

    notify = notifyClient
  }, [])

  return (
    <SnackbarProvider
      {...props}
      // classes={{ variantWarning: 'snackWarning' }}
      ref={snackbarRef}
    />
  )
}
