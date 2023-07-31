import path from 'path'
import fsPromise from 'fs/promises'
import { VideoSlice } from '~/store/main'
import { supportedAudioExtList, supportedVideoExtList } from '~/../constants'
import { glob } from 'glob'

export const projectFileName = 'smartSlicerProject.json'

export async function loadSlices(slicesPath: string): Promise<LoadSlicesResult> {
  try {
    const rawFilePaths = await fsPromise.readFile(path.join(slicesPath, projectFileName), 'utf8')
    return {
      slices: JSON.parse(rawFilePaths).map((item: SliceJsonObject) => new VideoSlice(item.filePath, item.speaker)),
      source: 'json'
    }
  } catch(e) {
    const allExts = supportedVideoExtList.concat(supportedAudioExtList)
    const globPattern = `**/*.{${allExts.join(',')}}`
    const filePaths = await glob(globPattern, { cwd: slicesPath })

    filePaths.sort((a, b) => {
      const parsedA = parseInt(a)
      const parsedB = parseInt(b)
      if (isNaN(parsedA) && isNaN(parsedB)) return 0
      if (isNaN(parsedA) && !isNaN(parsedB)) return -1
      if (!isNaN(parsedA) && isNaN(parsedB)) return 1
      return parsedA - parsedB
    })

    return {
      slices: filePaths.map(item => new VideoSlice(item)),
      source: 'files'
    }
  }
}

export function saveProjectFile(slicesPath: string, slices: VideoSlice[]) {
  const projectFileContent = JSON.stringify(slices.map<SliceJsonObject>(item => ({ filePath: item.filePath, speaker: item.speaker })))
  return fsPromise.writeFile(path.join(slicesPath, projectFileName), projectFileContent)
}

export interface LoadSlicesResult {
  slices: VideoSlice[]
  source: 'files' | 'json'
}

interface SliceJsonObject {
  filePath: string
  speaker: string | null
}
