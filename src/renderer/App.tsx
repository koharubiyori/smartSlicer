import { createTheme, ThemeProvider } from '@mui/material/styles'
import AppView from './views'
import CssVariablesOfTheme from './components/cssVariablesOfTheme'
import { NotifyProvider } from './utils/notify'
import GlobalBackdrop from './utils/globalBackdrop'
import dayjs from 'dayjs'
import durationExtOfDayjs from 'dayjs/plugin/duration'

dayjs.extend(durationExtOfDayjs)

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#DF8AFF',
      light: '#D69DFF',
      dark: '#D65DFF',
    },
    secondary: {
      main: '#bbb',
      light: '#ccc',
      dark: '#999',
    },
    text: {
      primary: '#ccc',
    },
    background: {
      paper: '#2a2a2a'
    },
    action: {
      hover: 'rgba(0, 0, 0, 0.2)'
    },
  },
  typography: {
    fontFamily: 'tahoma, arial, "Hiragino Sans GB", 宋体, sans-serif'
  }
})

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <NotifyProvider maxSnack={3}>
        <CssVariablesOfTheme>
          <AppView />
          <GlobalBackdrop />
        </CssVariablesOfTheme>
      </NotifyProvider>
    </ThemeProvider>
  )
}
