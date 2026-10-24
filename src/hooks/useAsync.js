import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Small data-fetching hook for the service layer.
 * Keeps loading / error state in one place so pages render consistent states.
 */
export function useAsync(fn, deps = [], { immediate = true } = {}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(immediate)
  const [error, setError] = useState(null)
  const fnRef = useRef(fn)
  fnRef.current = fn
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const execute = useCallback(async (...args) => {
    setLoading(true)
    setError(null)
    try {
      const result = await fnRef.current(...args)
      if (mountedRef.current) {
        setData(result)
        setLoading(false)
      }
      return result
    } catch (err) {
      if (mountedRef.current) {
        setError(err)
        setLoading(false)
      }
      return undefined
    }
  }, [])

  useEffect(() => {
    if (immediate) execute()
    // The caller supplies the dependency list for its own fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, loading, error, refresh: execute, setData }
}
