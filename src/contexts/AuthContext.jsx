import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { authService } from '@/services/auth/authService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => authService.loadSession())
  const [loading, setLoading] = useState(false)

  const signInWithRole = useCallback(async (role, profile = {}) => {
    setLoading(true)
    try {
      const user = await authService.signInWithRole(role, profile)
      const next = { user, token: user.token, isMock: true }
      authService.saveSession(next)
      setSession(next)
      return next
    } finally {
      setLoading(false)
    }
  }, [])

  const signInWithGoogle = useCallback(async (role) => {
    setLoading(true)
    try {
      const user = await authService.signInWithGoogle(role)
      const next = { user, token: user.token, isMock: true }
      authService.saveSession(next)
      setSession(next)
      return next
    } finally {
      setLoading(false)
    }
  }, [])

  const signOut = useCallback(async () => {
    await authService.signOut()
    authService.saveSession(null)
    setSession(null)
  }, [])

  const updateUser = useCallback((patch) => {
    setSession((current) => {
      if (!current) return current
      const next = { ...current, user: { ...current.user, ...patch } }
      authService.saveSession(next)
      return next
    })
  }, [])

  const value = useMemo(
    () => ({
      user: session?.user || null,
      isAuthenticated: Boolean(session?.user),
      isMock: Boolean(session?.isMock),
      role: session?.user?.role || null,
      profileId: session?.user?.profileId || null,
      loading,
      signInWithRole,
      signInWithGoogle,
      signOut,
      updateUser,
    }),
    [session, loading, signInWithRole, signInWithGoogle, signOut, updateUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}
