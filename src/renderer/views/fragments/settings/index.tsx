import { FormControl, FormControlLabel, FormGroup, InputLabel, MenuItem, Paper, Select, Switch, Typography } from '@mui/material'
import Grid from '@mui/material/Unstable_Grid2'
import { Observer } from 'mobx-react-lite'
import { PropsWithChildren } from 'react'
import store from '~/store'

export interface Props {

}

function SettingsFragment(props: PropsWithChildren<Props>) {
  return (
    <Paper className="flex-column" style={{ boxSizing: 'border-box', padding: '10px 20px' }}>
      <FormGroup>
        <Observer>{() => <>
          <Grid container spacing={2} alignItems="center">
            <Grid xs={7}>
              <FormControlLabel
                control={<Switch
                  checked={store.main.appSettings.outputAudioOnly}
                  onChange={(_, checked) => store.main.updateAppSetting('outputAudioOnly', checked)}
                />}
                label={<Typography style={{ color: 'var(--text-secondary)' }}>最终只输出音频</Typography>}
              />
            </Grid>

            <Grid xs={5}>
              <FormControl fullWidth>
                <InputLabel>ffmpeg工作进程数</InputLabel>
                <Select
                  value={store.main.appSettings.ffmpegWorkingNum}
                  color="primary"
                  size="small"
                  label="ffmpeg工作进程数"
                  onChange={e => store.main.updateAppSetting('ffmpegWorkingNum', parseInt(e.target.value as string))}
                >
                  {new Array(6).fill(0).map((_, i) => <MenuItem value={i + 1}>{i + 1}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </>}</Observer>
      </FormGroup>
    </Paper>
  )
}

export default SettingsFragment
