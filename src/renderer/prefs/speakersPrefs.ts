import { Speaker } from "~/store/speakers"
import PlainPrefs from "./utils/plainPrefs"

const defaultValue = {
  speakerList: [] as Speaker[],
  locked: {} as Record<string, boolean>
}

const speakersPrefs = new PlainPrefs('speakersPrefs', defaultValue).prefs

export default speakersPrefs
