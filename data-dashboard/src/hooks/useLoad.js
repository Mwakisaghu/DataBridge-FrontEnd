import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Loads data with a promise-returning function and tracks loading and errors.
 * Call reload() after a change. The latest call wins if several overlap.
 */
export default function useLoad(fn, deps = []) {
  const [state, setState] = useState({ data: undefined, loading: true, error: null })
  const seq = useRef(0)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(fn, deps)

  const reload = useCallback(() => {
    const mine = ++seq.current
    setState((s) => ({ ...s, loading: true }))
    return Promise.resolve()
      .then(load)
      .then(
        (data) => mine === seq.current && setState({ data, loading: false, error: null }),
        (error) => mine === seq.current && setState((s) => ({ data: s.data, loading: false, error })),
      )
  }, [load])

  useEffect(() => {
    reload()
  }, [reload])

  return { ...state, reload }
}
