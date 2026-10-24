import { useEffect } from 'react'
import { appConfig } from '@/config/appConfig'

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} — ${appConfig.name}` : `${appConfig.name} — ${appConfig.tagline}`
  }, [title])
}
