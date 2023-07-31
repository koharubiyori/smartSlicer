import { Paper } from '@mui/material'
import React, { PropsWithChildren, useEffect, useRef } from 'react'
import VideoPlayerBody, { VideoPlayerBodyRef } from './components/videoPlayerBody'
import { Observer } from 'mobx-react-lite'
import store from '~/store'
import { VideoSlice } from '~/store/main'


export interface Props {}

export const videoPlayerBodyRef = React.createRef<VideoPlayerBodyRef>()

function VideoPlayerFragment(props: PropsWithChildren<Props>) {

  function generateKeyBindings() {
    const entries = store.speakers.speakerList
      .filter(item => item.enabled)
      .map(item => [item.boundKey, (videoSlice: VideoSlice) => {
        store.speakers.emitAndNext({ ...videoSlice, speaker: item.name })
      }])

    return Object.fromEntries(entries)
  }

  return (
    <Paper className="flex-row" style={{
      width: 'calc(100% - 10px)',
      height: 'calc(100% - 10px)',
      marginTop: 10,
      marginLeft: 10,
      overflow: 'hidden'
    }}>
      <Observer>{() =>
        <VideoPlayerBody
          videoSliceDirPath={store.main.slicesPath}
          videoSlice={store.speakers.currentSelectedSlice}
          onEmit={newValue => store.speakers.emitAndNext(newValue)}
          onDrop={() => store.speakers.dropAndNext()}
          onBack={() => store.speakers.back()}
          onNext={() => store.speakers.next()}
          keyBindings={generateKeyBindings()}
          getRef={videoPlayerBodyRef}
        />
      }</Observer>
    </Paper>
  )
}

export default VideoPlayerFragment
