import { Divider, IconButton, Typography, useTheme } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import MinimizeIcon from '@mui/icons-material/Minimize'
import clsx from 'clsx'
import { ReactComponent as MaximizeIcon } from '~/assets/icons/maximize.svg'
import { ReactComponent as ShrinkIcon } from '~/assets/icons/shrink.svg'
import { windowIpcClient } from '~/../ipcHub/modules/window'
import classes from './index.module.scss'
import { useEffect, useState } from 'react'

AppHeader.height = 44

function AppHeader() {
  // const [isWindowMaximized, setIsWindowMaximized] = useState(false)

  // async function toggleMaximize() {
  //   setIsWindowMaximized(await windowIpcClient.toggleMaximize())
  // }

  useEffect(() => {
    document.body.style.setProperty('--app-header-height', AppHeader.height + 'px')
  }, [])

  return (
    <div className={clsx(classes.appHeader)}>
      <div className="contentContainer flex-row flex-between flex-cross-center com-drag">
        <Typography variant="h6" className="title">Smart Slicer</Typography>
        <div className="rightButtons flex-row-inline flex-cross-center com-noDrag">
          {/* <IconButton className="com-noDrag iconButton" onClick={() => showSettingsModal()}>
            <SettingsIcon fontSize="small" style={{ color: 'white' }} />
          </IconButton> */}

          {/* <Divider orientation="vertical" style={{ backgroundColor: 'rgba(255, 255, 255, 0.3)', height: 20, marginLeft: 20, marginRight: 20 }} /> */}

          <IconButton className="com-noDrag iconButton" onClick={() => windowIpcClient.minimize()}>
            <MinimizeIcon fontSize="small" style={{ color: 'white' }} />
          </IconButton>
          {/* <IconButton className="com-noDrag iconButton" onClick={toggleMaximize}>
            {isWindowMaximized
              ? <ShrinkIcon style={{ minWidth: 20, minHeight: 20, fill: 'white' }} />
              : <MaximizeIcon style={{ minWidth: 16, minHeight: 16, fill: 'white' }} />
            }
          </IconButton> */}
          <IconButton className="com-noDrag iconButton" onClick={() => windowIpcClient.close()}>
            <CloseIcon fontSize="small" style={{ color: 'white' }} />
          </IconButton>
        </div>
      </div>
    </div>
  )
}

export default AppHeader
