import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import TrialStatusBar from '../components/TrialStatusBar'

const PLANS = [
  {
    id: 'solo',
    name: 'Solo',
    monthly: 19,
    annual: 190,
    features: [
      'Unlimited reports',
      'All chart types',
      'Full AI insights',
      'Custom dashboard layout',
      'Sharing with DashPlot branding',
      '3 months history',
      '1 workspace · 1 seat',
    ],
    highlight: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    monthly: 29,
    annual: 290,
    features: [
      'Everything in Solo',
      'PDF export',
      'White-label sharing',
      'Google Sheets sync',
      'Password-protected reports',
      '12 months history',
      '3 workspaces · 1 seat',
    ],
    highlight: true,
  },
  {
    id: 'agency',
    name: 'Agency',
    monthly: 79,
    annual: 790,
    features: [
      'Everything in Pro',
      'Unlimited workspaces',
      '5 seats',
      'Unlimited history',
      'Priority support',
    ],
    highlight: false,
  },
]

export default function Upgrade() {
  const { profile } = useAuth()
  const [billing, setBilling] = useState('monthly')
  const [loadingPlan, setLoadingPlan] = useState(null)
  const [error, setError] = useState('')

  const currentPlan = profile?.plan ?? 'trial'

  async function handleUpgrade(plan) {
    setError('')
    setLoadingPlan(plan.id)

    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) { setLoadingPlan(null); return }

    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan: plan.id, billingPeriod: billing }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Checkout failed')
      window.location.href = data.url
    } catch (err) {
      console.error('[DashPlot] upgrade checkout error:', err.message)
      setError('Could not start checkout. Please try again.')
      setLoadingPlan(null)
    }
  }

  return (
    <div className="flex flex-col flex-1">
      <TrialStatusBar />

      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 flex flex-col gap-10">
        <header className="text-center flex flex-col items-center gap-4">
          <h1 className="text-3xl font-medium text-navy" style={{ letterSpacing: '-0.2px' }}>
            Choose your plan
          </h1>
          <p className="text-sm text-subtle max-w-sm">
            Unlock unlimited reports, full AI insights, and sharing. No contracts.
          </p>

          <div className="flex items-center gap-1 bg-mint border border-teal-light rounded-pill p-1 mt-1">
            <button
              onClick={() => setBilling('monthly')}
              className={`text-sm px-4 py-1.5 rounded-pill transition-colors font-medium ${
                billing === 'monthly' ? 'bg-white text-navy shadow-sm' : 'text-subtle'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('annual')}
              className={`text-sm px-4 py-1.5 rounded-pill transition-colors font-medium flex items-center gap-2 ${
                billing === 'annual' ? 'bg-white text-navy shadow-sm' : 'text-subtle'
              }`}
            >
              Annual
              <span className="text-xs text-teal font-medium">2 months free</span>
            </button>
          </div>
        </header>

        {error && (
          <p className="text-sm text-center" style={{ color: '#E24B4A' }}>{error}</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {PLANS.map(plan => {
            const price        = billing === 'monthly' ? plan.monthly : plan.annual
            const monthlyEq    = billing === 'annual' ? Math.round(plan.annual / 12) : null
            const isCurrentPlan = currentPlan === plan.id
            const isBusy       = loadingPlan === plan.id

            return (
              <div
                key={plan.id}
                className={`relative rounded-card p-6 flex flex-col gap-5 transition-shadow ${
                  plan.highlight
                    ? 'bg-white border-2 shadow-card'
                    : 'bg-white border border-mint shadow-card'
                }`}
                style={plan.highlight ? { borderColor: '#1D9E75' } : {}}
              >
                {plan.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="text-xs font-medium text-white bg-teal px-3 py-1 rounded-pill whitespace-nowrap">
                      Most popular
                    </span>
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <h2 className="text-base font-medium text-navy" style={{ letterSpacing: '-0.2px' }}>
                    {plan.name}
                  </h2>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-medium text-navy" style={{ letterSpacing: '-0.2px' }}>
                      ${price}
                    </span>
                    <span className="text-xs text-subtle">/{billing === 'monthly' ? 'mo' : 'yr'}</span>
                  </div>
                  {monthlyEq && (
                    <p className="text-xs" style={{ color: '#1D9E75' }}>${monthlyEq}/month billed annually</p>
                  )}
                </div>

                <ul className="flex flex-col gap-2.5 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-navy">
                      <CheckIcon />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {isCurrentPlan ? (
                  <div className="text-center text-sm font-medium py-2.5 rounded-pill border" style={{ color: '#1D9E75', borderColor: '#9FE1CB' }}>
                    Current plan
                  </div>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan)}
                    disabled={!!loadingPlan}
                    className={`text-sm font-medium py-2.5 px-6 rounded-pill transition-colors min-h-[44px] disabled:opacity-60 ${
                      plan.highlight
                        ? 'bg-teal text-white hover:bg-opacity-90'
                        : 'bg-mint text-navy border border-teal-light hover:bg-teal-light'
                    }`}
                    style={plan.highlight ? {} : { color: '#0F6E56' }}
                  >
                    {isBusy ? 'Redirecting…' : `Get ${plan.name}`}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex flex-col items-center gap-3 text-center text-sm text-subtle">
          <p>All plans include a 14-day free trial. Cancel anytime.</p>
          {currentPlan !== 'trial' && (
            <Link to="/account/billing" className="hover:underline" style={{ color: '#1D9E75' }}>
              Manage billing →
            </Link>
          )}
          <Link to="/dashboard" className="hover:text-navy transition-colors">
            ← Back to reports
          </Link>
        </div>
      </div>
    </div>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-0.5 flex-shrink-0">
      <circle cx="7" cy="7" r="6" fill="#E1F5EE" />
      <path d="M4 7l2 2 4-4" stroke="#1D9E75" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
