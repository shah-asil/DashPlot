import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Spinner() {
  return (
    <div className="flex-1 flex items-center justify-center py-24">
      <div className="w-8 h-8 rounded-full border-2 border-mint border-t-teal animate-spin" />
    </div>
  )
}

export default function ProtectedRoute({ children, requireOnboarding = true }) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />

  if (requireOnboarding && profile && !profile.display_name && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  return children
}
