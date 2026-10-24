import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export function ProtectedRoute({ role }) {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (role && user.role !== role) {
    return (
      <Navigate
        to={user.role === 'client' ? '/client/dashboard' : '/freelancer/dashboard'}
        replace
      />
    )
  }

  return <Outlet />
}
