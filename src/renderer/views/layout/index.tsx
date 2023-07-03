import React, { PropsWithChildren } from 'react'

export interface Props {
  header: JSX.Element
  settings: JSX.Element
  sliceList: JSX.Element
  operationPanel: JSX.Element
  videoPlayer: JSX.Element
}

function ViewLayout(props: PropsWithChildren<Props>) {
  return (
    <div
      className="com-rootContainer"
      style={{ backgroundColor: 'var(--background-default)', padding: 10, paddingTop: 'calc(var(--app-header-height) + 10px)' }}>
      {props.header}
      <div className="flex-row" style={{ height: '100%' }}>
        <div className="flex flex-column">
          <div>{props.settings}</div>
          <div className="flex flex-limit">{props.sliceList}</div>
        </div>
        <div className="flex2 flex-column">
          <div>{props.operationPanel}</div>
          <div className="flex">{props.videoPlayer}</div>
        </div>
      </div>
    </div>
  )
}

export default ViewLayout
