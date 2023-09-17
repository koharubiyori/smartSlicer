import FitScreenIcon from '@mui/icons-material/FitScreen'
import LoopIcon from '@mui/icons-material/Loop'
import MovieIcon from '@mui/icons-material/Movie'
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline'
import SlowMotionVideoIcon from '@mui/icons-material/SlowMotionVideo'
import HelpIcon from '@mui/icons-material/Help'
import { IconButton, Menu, MenuItem, Tooltip, Typography } from '@mui/material'
import dayjs from 'dayjs'
import _ from 'lodash'
import path from 'path'
import { MutableRefObject, PropsWithChildren, useEffect, useMemo, useRef, useState } from 'react'
import useStateWithRef from '~/hooks/useStateWithRef'
import { VideoSlice } from '~/store/main'
import { defaultSpeakerShowName } from '~/store/speakers'
import { addEventListener } from '~/utils/utils'
import classes from './index.module.scss'
import CssVariablesOfTheme from '~/components/cssVariablesOfTheme'

export interface Props {
  videoSlice?: VideoSlice
  videoSliceDirPath?: string
  onEmit(videoSlice: VideoSlice): void
  onUpdateCutRange(cutRange: [number, number]): void
  onDrop(): void
  onNext(): void
  onBack(): void
  keyBindings: Record<string, (videoSlice: VideoSlice) => void>
  getRef?: MutableRefObject<any>
}

export interface VideoPlayerBodyRef {
  play(): void
  pause(): void
}

function VideoPlayerBody(props: PropsWithChildren<Props>) {
  const [videoDuration, setVideoDuration, videoDurationRef] = useStateWithRef(0)
  const [videoTime, setVideoTime] = useState(0)
  const [videoLoop, setVideoLoop] = useState(true)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const [isVideoCursorMoving, setIsVideoCursorMoving, isVideoCursorMovingRef] = useStateWithRef(false)
  const [isVideoCutMoving, setIsVideoCutMoving, isVideoCutMovingRef] = useStateWithRef(false)
  const [cutRange, setCutRange, cutRangeRef] = useStateWithRef<[number, number | null]>([0, null])  // 单位：秒
  const [scaleMode, setScaleMode] = useState(0)

  const [anchorElForSpeedBtn, setAnchorElForSpeedBtn] = useState<HTMLElement | null>(null)
  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState(false)
  const [playSpeed, setPlaySpeed] = useState(1)

  const videoElRef = useRef<HTMLVideoElement>()
  const videoProgressBodyElRef = useRef<HTMLDivElement>()
  const videoCursorElRef = useRef<HTMLButtonElement>()
  const videoCutLeftElRef = useRef<HTMLDivElement>()
  const videoCutRightElRef = useRef<HTMLDivElement>()
  const keyEventsBindingElRef = useRef<HTMLDivElement>()

  if (props.getRef) props.getRef.current = {
    play,
    pause: () => videoElRef.current?.pause()
  }

  // --- start --- 这里主要为了解决自动筛选时，videoSlice对象文件位置没变但因实例改变，发生重渲染，触发onCanplay钩子等逻辑，要检测props.videoSlice变化的地方都应该用这个变量代替
  const [isVideoSliceFilePathChanged, setIsVideoSliceFilePathChanged] = useState(false)
  const prevVideoSliceProps = useRef(props.videoSlice)
  useEffect(() => {
    setIsVideoSliceFilePathChanged(props.videoSlice?.filePath !== prevVideoSliceProps.current?.filePath)
    prevVideoSliceProps.current = props.videoSlice
  }, [props.videoSlice])
  // --- end ---

  useEffect(() => {
    const unsubscribers = [
      addEventListener(document.body, 'keydown', (e) => {
        if (document.activeElement?.tagName === 'INPUT' && document.activeElement.getAttribute('type') === 'text') { return }
        e.preventDefault()

        ;({
          ArrowUp: () => props.onEmit({
            ...(props.videoSlice as any),
            cutRange: getTrueCutRange(),
            speaker: defaultSpeakerShowName,
            modified: true
          }),
          ArrowDown: props.onDrop,
          ArrowLeft: props.onBack,
          ArrowRight: props.onNext,
          ' '() {
            videoElRef.current!.currentTime = 0
            play()
          }
        }[e.key] ?? (() => {}))()
      })
    ]

    return () => unsubscribers.forEach(item => item())
  }, [isVideoSliceFilePathChanged])

  useEffect(() => {
    return addEventListener(document.body, 'keydown', e => {
      if (document.activeElement?.tagName === 'INPUT' && document.activeElement.getAttribute('type') === 'text') { return }
      e.preventDefault()

      ;(props.keyBindings[e.key.toUpperCase()] ?? (() => {}))({
        ...(props.videoSlice as any),
        cutRange: getTrueCutRange(),
        modified: true,
      })
    })
  }, [isVideoSliceFilePathChanged, props.keyBindings])

  // 实现滚动条游标拖动
  useEffect(() => {
    const unsubscribers = [
      addEventListener(videoCursorElRef.current!, 'mousedown', e => {
        if (isVideoCutMovingRef.current) { return }
        e.stopPropagation()
        setIsVideoCursorMoving(true)
      }, true),
      addEventListener(document.body, 'mouseup', e => {
        if (!isVideoCursorMovingRef.current) { return }
        setIsVideoCursorMoving(false)
      }),
      addEventListener(document.body, 'mouseleave', e => {
        setIsVideoCursorMoving(false)
      }),
      addEventListener(document.body, 'mousemove', e => {
        if (!isVideoCursorMovingRef.current) { return }

        const maxOffset = videoCursorElRef.current!.offsetParent!.clientWidth
        const movementRate = e.movementX / maxOffset
        const movementTime = videoDurationRef.current * movementRate
        updateVideoTime(prevVal => prevVal + movementTime)
      })

    ]

    // 虽然不清理事件也没问题，但开发时热更新会导致反复绑定事件，要恢复就只能重载页面
    return () => unsubscribers.forEach(item => item())
  }, [])

  // 实现剪辑游标拖动
  useEffect(() => {
    let activeCut: HTMLDivElement | null = null

    const updateCutRange = _.debounce((rawCutRange: [number, number | null]) =>
      props.onUpdateCutRange(getTrueCutRange(rawCutRange)), 300, { trailing: true }
    )

    const unsubscribers = [
      ...[videoCutLeftElRef.current!, videoCutRightElRef.current!].map(el =>
        addEventListener(el, 'mousedown', e => {
          e.stopPropagation()
          activeCut = el
          setIsVideoCutMoving(true)
        }, true)
      ),
      addEventListener(document.body, 'mouseup', e => {
        setIsVideoCutMoving(false)
      }),
      addEventListener(document.body, 'mouseleave', e => {
        setIsVideoCutMoving(false)
      }),
      addEventListener(document.body, 'mousemove', e => {
        if (!isVideoCutMovingRef.current) { return }
        const maxOffset = activeCut!.offsetParent!.clientWidth
        const movementRate = e.movementX / maxOffset
        const movementTime = videoDurationRef.current * movementRate

        setCutRange(() => {
          const prevVal = cutRangeRef.current
          const computeNewTime = (oldTime: number) => _.clamp(oldTime + movementTime, 0, videoDurationRef.current)
          let result: [number, number | null] = [0, null]
          if (activeCut === videoCutLeftElRef.current) {
            result = [computeNewTime(prevVal[0]), prevVal[1]]
          } else {
            result = [prevVal[0], computeNewTime(prevVal[1] ?? videoDurationRef.current)]
          }

          updateCutRange(result)
          return result
        })
      })
    ]

    return () => unsubscribers.forEach(item => item())
  }, [])

  useEffect(updatePlaySpeed)

  useEffect(() => {
    updateVideoTime()
  }, [cutRange, videoDuration])

  useEffect(() => {
    if (props.videoSlice) {
      setVideoTime(0)
      setCutRange(props.videoSlice.cutRange ?? [0, null])
    }
  }, [isVideoSliceFilePathChanged])

  // 使用requestAnimationFrame手动实现video标签的timeUpdate事件，解决其触发频率低的问题
  useEffect(() => {
    if (!isVideoPlaying) { return }
    let cancelFlag = false
    ;(function loop() {
      requestAnimationFrame(() => {
        if (isVideoCursorMovingRef.current) { return }
        handlerOnTimeUpdate()
        if (!cancelFlag) loop()
      })
    })()

    return () => void(cancelFlag = true)
  }, [isVideoPlaying])

  function getTrueCutRange(rawCutRange = cutRangeRef.current): [number, number] {
    let minValue = rawCutRange[0]
    let maxValue = rawCutRange[1] ?? videoDurationRef.current
    if (minValue > maxValue) [minValue, maxValue] = [maxValue, minValue]
    return [minValue, maxValue]
  }

  function play() {
    videoElRef.current?.play()
  }

  function updatePlaySpeed() {
    videoElRef.current!.playbackRate = playSpeed
  }

  function onClickHandlerForProgressBody(e: any) {
    const width = e.target.clientWidth
    const layerX = e.clientX - e.target.getBoundingClientRect().left
    const positionRate = layerX / width
    videoElRef.current!.currentTime = videoDuration * positionRate
    updateVideoTime(videoDuration * positionRate)
  }

  function updateVideoTime(value?: number | ((prevVal: number) => number)) {
    setVideoTime(prevVal => {
      const rawNewTime = (typeof value === 'function' ? value(prevVal) : value) ?? prevVal
      const trueCutRange = getTrueCutRange()
      const clampedNewTime = _.clamp(rawNewTime, trueCutRange[0], trueCutRange[1])
      videoElRef.current!.currentTime = clampedNewTime
      return clampedNewTime
    })
  }

  function handlerOnTimeUpdate(newValue: number = videoElRef.current!.currentTime) {
    const trueCutRange = getTrueCutRange()
    const clampedVideoTime = _.clamp(newValue, trueCutRange[0], trueCutRange[1])
    if (clampedVideoTime === trueCutRange[1]) {
      // 手动实现loop，使用video标签自带的loop会导致进度还没更新到结束的时间点就重播
      if (videoLoop) {
        videoElRef.current!.currentTime = trueCutRange[0]
        play()
      } else {
        setVideoTime(trueCutRange[0])
        videoElRef.current!.pause()
      }
    } else {
      setVideoTime(clampedVideoTime)
    }
  }

  function turnScaleMode() {
    setScaleMode(prevVal => {
      let newValue = prevVal + 1
      if (newValue > scaleModeList.length - 1) newValue = 0
      return newValue
    })
  }

  const formatTime = (seconds: number) => dayjs.duration(Math.round(seconds * 1000)).format('mm:ss:SSS')


  const cssVars = {
    '--progress': (videoTime / videoDuration * 100) + '%',
    '--left-cut': (cutRange[0] / videoDuration * 100) + '%',
    '--right-cut': ((cutRange[1] ?? videoDuration) / videoDuration * 100) + '%'
  }

  const setPlaySpeedAndCloseMenu = (value: number) => () => {
    setPlaySpeed(value)
    setIsSpeedMenuOpen(false)
  }

  const uncut = cutRange[0] === 0 && (cutRange[1] === null || cutRange[1] === videoDuration)
  const trueCutRange = getTrueCutRange()

  const scaleModeList = ['contain', 'cover', 'fill']

  const fullVideoPath = props.videoSliceDirPath && props.videoSlice?.filePath ?
    path.join(props.videoSliceDirPath, props.videoSlice.filePath) : undefined

  return (
    <div className={classes.videoContainer}>
      <div
        ref={keyEventsBindingElRef as any}
        style={{ display: props.videoSlice ? 'block' : 'none' }}
        className={classes.activeHint}
      >
        <video
          src={fullVideoPath}
          preload="auto"
          controls={false}
          onDurationChange={() => {
            setVideoDuration(videoElRef.current!.duration)
          }}
          onEnded={() => setVideoTime(videoDuration)}
          onPlay={() => setIsVideoPlaying(true)}
          onPause={() => setIsVideoPlaying(false)}
          onCanPlay={() => {
            if (!isVideoSliceFilePathChanged) { return }
            play()
            setIsVideoSliceFilePathChanged(false)
          }}
          onClick={() => videoElRef.current!.pause()}
          style={{ objectFit: scaleModeList[scaleMode] as any }}
          ref={videoElRef as any}
        />

        <div className="playMask" onClick={play} data-visible={!isVideoPlaying && !isVideoCursorMoving}>
          <PlayCircleOutlineIcon sx={{ fontSize: 120, fill: '#eee' }} />
        </div>
        <Tooltip placement="left"
          title={
            <CssVariablesOfTheme>
              <div className={classes.helpTip}>
                <ul>
                  <li>【方向键↑】：标记当前切片为“默认说话人”</li>
                  <li>【方向键↓】：移除当前切片标记</li>
                  <li>【方向键←】：切片列表后退</li>
                  <li>【方向键←】：切片列表前进</li>
                  <li>【空格】：重播当前切片</li>
                </ul>
              </div>
            </CssVariablesOfTheme>
          }
        >
          <IconButton
            style={{ position: 'absolute', top: 0, right: 0 }}
            sx={{ marginRight: '5px' }}
          >
            <HelpIcon sx={{ fontSize: 26, color: 'white' }} />
          </IconButton>
        </Tooltip>
        <div className="progressBar">
          <div className="operations flex-row flex-between flex-cross-center">
            <div className="times">{formatTime(videoTime)} / {formatTime(videoDuration)} ({uncut ? '未剪辑' : `${formatTime(trueCutRange[0])} ~ ${formatTime(trueCutRange[1] ?? videoDuration)}`})</div>
            <div className="operation flex-row-inline flex-main-end">
              <IconButton
                sx={{ marginRight: '5px' }}
                onClick={() => setVideoLoop(prevVal => !prevVal)}
              >
                <LoopIcon color={videoLoop ? 'primary' : 'action'} sx={{ fontSize: 26 }} />
              </IconButton>
              <IconButton
                sx={{ marginRight: '5px' }}
                onClick={e => {
                  setAnchorElForSpeedBtn(e.currentTarget)
                  setIsSpeedMenuOpen(true)
                }}
              >
                <SlowMotionVideoIcon sx={{ fontSize: 26 }} />
              </IconButton>
              <Menu
                anchorEl={anchorElForSpeedBtn}
                open={isSpeedMenuOpen}
                anchorOrigin={{ horizontal: -20, vertical: -210 }}
                onClose={() => setIsSpeedMenuOpen(false)}
              >
                {[2, 1.5, 1.25, 1, 0.75, 0.5].map(item =>
                  <MenuItem onClick={setPlaySpeedAndCloseMenu(item)} selected={playSpeed === item}>{item}倍速</MenuItem>
                )}
              </Menu>
              <IconButton onClick={turnScaleMode}>
                <FitScreenIcon sx={{ fontSize: 26 }} />
              </IconButton>
            </div>
          </div>
          <div className="progressContainer" style={cssVars as any}>
            <div className="body" onMouseDown={onClickHandlerForProgressBody as any} ref={videoProgressBodyElRef as any}>
              <div className="leftCut cutCursor" ref={videoCutLeftElRef as any}></div>
              <div className="rightCut cutCursor" ref={videoCutRightElRef as any}></div>
              <IconButton className="cursorPosition" ref={videoCursorElRef as any}>
                <div className="cursor"></div>
              </IconButton>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-column flex-center" style={{ width: '100%', height: '100%', display: props.videoSlice ? 'none' : 'flex' }}>
        <MovieIcon style={{ fontSize: 200 }} />
        {/* <div style={{ fontSize: 26 }}>未加载任何视频切片</div> */}
      </div>
    </div>
  )
}

export default VideoPlayerBody


