import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { LogoWordmark } from '../components/Logo'

export default function ReferralLanding() {
  const { code } = useParams()
  const navigate = useNavigate()

  useEffect(() => {
    if (code) localStorage.setItem('dashplot_referral_code', code)
    navigate('/signup', { replace: true })
  }, [code, navigate])

  return (
    <div
      className="flex-1 flex items-center justify-center px-4 py-16"
      style={{ background: 'linear-gradient(135deg, #E1F5EE 0%, #E6F1FB 100%)' }}
    >
      <div className="flex flex-col items-center gap-4">
        <LogoWordmark size="lg" />
        <p className="text-sm text-subtle">Redirecting you to sign up…</p>
        <div className="w-6 h-6 rounded-full border-2 border-mint border-t-teal animate-spin" />
      </div>
    </div>
  )
}
