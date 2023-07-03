import { useRef, Dispatch, SetStateAction, useState } from 'react'

export default function useStateWithRef<S>(initialState: S | (() => S)):
  [S, Dispatch<SetStateAction<S>>, Readonly<{ current: S }>]
{
  const [state, setState] = useState(initialState)
  const stateRef = useRef(state)

  const setStateWithRef: Dispatch<SetStateAction<S>> = newValue => {
    let _newValue = newValue
    if (typeof newValue === 'function') _newValue = (newValue as any)(state)
    setState(_newValue)
    stateRef.current = _newValue as S
  }

  return [state, setStateWithRef, stateRef]
}
