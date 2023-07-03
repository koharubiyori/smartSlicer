import { useTheme } from '@mui/material'
import { PropsWithChildren } from 'react'

export interface Props {

}

function CssVariablesOfTheme(props: PropsWithChildren<Props>) {
  const theme = useTheme()

  const cssVariables = {
    '--primary': theme.palette.primary.main,

    '--text-primary': theme.palette.text.primary,
    '--text-secondary': theme.palette.text.secondary,
    '--text-disabled': theme.palette.text.disabled,

    '--background-default': theme.palette.background.default,
    '--background-paper': theme.palette.background.paper
  }

  return <div className="cssVariablesOfTheme" style={cssVariables as any}>{props.children}</div>
}

export default CssVariablesOfTheme


