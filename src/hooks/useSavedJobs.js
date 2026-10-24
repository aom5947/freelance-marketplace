import { useCallback, useEffect, useState } from 'react'

const KEY = 'freelink.savedJobs'

function read() {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function useSavedJobs() {
  const [saved, setSaved] = useState(read)

  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(saved))
    } catch {
      // Ignore storage failures — the toggle still works for this session.
    }
  }, [saved])

  const isSaved = useCallback((id) => saved.includes(id), [saved])

  const toggle = useCallback((id) => {
    setSaved((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }, [])

  return { saved, isSaved, toggle }
}
