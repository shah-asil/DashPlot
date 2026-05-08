import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function ReferralCard({ onDismiss }) {
  const { user, profile, fetchProfile } = useAuth()
  const [referralCode, setReferralCode] = useState(profile?.referral_code ?? null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!user) return
    if (profile?.referral_code) {
      setReferralCode(profile.referral_code)
    } else {
      const code = Math.random().toString(36).slice(2, 8).toUpperCase()
      supabase.from('users').update({ referral_code: code }).eq('id', user.id).then(({ error }) => {
        if (!error) {
          setReferralCode(code)
          fetchProfile(user.id)
        }
      })
    }
  }, [user, profile?.referral_code])

  async function copy() {
    if (!referralCode) return
    await navigator.clipboard.writeText(`${window.location.origin}/ref/${referralCode}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!referralCode) return null

  return (
    <div
      className="rounded-card border p-5 flex flex-col sm:flex-row sm:items-center gap-4"
      style={{ background: '#E1F5EE', borderColor: '#9FE1CB' }}
    >
      <div className="flex-1 flex flex-col gap-1">
        <p className="text-sm font-medium" style={{ color: '#085041' }}>
          Earn a free month — refer a friend
        </p>
        <p className="text-xs" style={{ color: '#1D9E75' }}>
          They get 20% off their first 2 months. You get 1 month free when they subscribe.
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <input
          readOnly
          value={`${window.location.origin}/ref/${referralCode}`}
          className="hidden sm:block text-xs bg-white border border-teal-light rounded-pill px-3 py-2 outline-none w-48 truncate"
          style={{ color: '#185FA5' }}
        />
        <button
          onClick={copy}
          className="text-xs text-white bg-teal px-4 py-2 rounded-pill hover:bg-opacity-90 transition-colors font-medium min-h-[36px] whitespace-nowrap"
        >
          {copied ? '✓ Copied' : 'Copy referral link'}
        </button>
        {onDismiss && (
          <button onClick={onDismiss} className="text-subtle hover:text-navy flex-shrink-0 p-1">
            <XIcon />
          </button>
        )}
      </div>
    </div>
  )
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}
