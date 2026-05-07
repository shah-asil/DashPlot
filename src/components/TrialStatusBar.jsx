import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function TrialStatusBar() {
  const { profile } = useAuth()

  if (!profile || profile.plan !== 'trial') return null

  const daysLeft = profile.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(profile.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24)))
    : 14

  const reportsUsed = profile.trial_reports_used ?? 0
  const urgent = daysLeft <= 3

  return (
    <div className={`w-full py-2 px-4 text-xs flex items-center justify-center gap-3 flex-wrap ${urgent ? 'bg-amber-50 border-b border-amber-200' : 'bg-mint border-b border-teal-light'}`}>
      <span className={`font-medium ${urgent ? 'text-amber-700' : 'text-ai-text'}`}>
        {urgent ? '⚠ ' : ''}Trial
      </span>
      <span className={urgent ? 'text-amber-600' : 'text-ai-text'}>
        {daysLeft === 0 ? 'Expired' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}
      </span>
      <span className="text-subtle">·</span>
      <span className={urgent ? 'text-amber-600' : 'text-ai-text'}>
        {reportsUsed}/3 reports used
      </span>
      <Link
        to="/upgrade"
        className="ml-2 text-white bg-teal px-3 py-1 rounded-pill hover:bg-opacity-90 transition-colors font-medium min-h-[28px] flex items-center"
      >
        Upgrade
      </Link>
    </div>
  )
}
