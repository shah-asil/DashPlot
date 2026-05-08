import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import TrialStatusBar from '../components/TrialStatusBar'
import posthog from '../lib/posthog'

const PLAN_LABELS  = { trial: 'Trial', solo: 'Solo', pro: 'Pro', agency: 'Agency' }
const PLAN_PRICES  = { solo: { monthly: 19, annual: 190 }, pro: { monthly: 29, annual: 290 }, agency: { monthly: 79, annual: 790 } }
const STATUS_STYLE = {
  active:    { bg: '#E1F5EE', color: '#1D9E75', label: 'Active' },
  past_due:  { bg: '#FEF3CD', color: '#EF9F27', label: 'Past due' },
  cancelled: { bg: '#FEE2E2', color: '#E24B4A', label: 'Cancelled' },
}

const CANCEL_REASONS = [
  { id: 'too_expensive',    label: 'Too expensive' },
  { id: 'not_using',        label: 'Not using it enough' },
  { id: 'missing_feature',  label: 'Missing a feature I need' },
  { id: 'switching_tools',  label: 'Switching to another tool' },
  { id: 'just_testing',     label: 'Just testing things out' },
]

const CANCEL_OFFERS = {
  too_expensive: {
    headline: 'Before you go — how about 30% off?',
    body:     "We'll apply 30% off your subscription for the next 3 months. No strings attached.",
    action:   'coupon',
    accept:   'Yes, apply the discount',
  },
  not_using: {
    headline: 'No worries — you can pause instead.',
    body:     "We'll pause your subscription for 2 months. Your account stays active and you can come back whenever you're ready.",
    action:   'pause',
    accept:   'Pause for 2 months',
  },
  missing_feature: {
    headline: "Tell us what's missing.",
    body:     "We're constantly shipping. Tell us what you need and we'll notify you when it's ready.",
    action:   'feedback',
    accept:   'Submit feedback & keep subscription',
    inputLabel: 'What feature are you missing?',
  },
  switching_tools: {
    headline: 'What does the other tool do better?',
    body:     'Your feedback directly shapes our roadmap. Help us improve.',
    action:   'feedback',
    accept:   'Submit & cancel',
    inputLabel: 'What does it do better than DashPlot?',
  },
  just_testing: {
    headline: 'Not ready to commit? Try Solo instead.',
    body:     'Get unlimited reports, full AI insights, and sharing for just $19/month — half the price.',
    action:   'downgrade',
    accept:   'Switch to Solo ($19/mo)',
  },
}

export default function Billing() {
  const { user, profile, fetchProfile } = useAuth()
  const navigate = useNavigate()

  const [sub,     setSub]     = useState(null)
  const [subLoading, setSubLoading] = useState(true)

  const [portalLoading, setPortalLoading] = useState(false)
  const [portalError,   setPortalError]   = useState('')

  const [cancelStep,   setCancelStep]   = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelNote,   setCancelNote]   = useState('')
  const [cancelling,   setCancelling]   = useState(false)
  const [cancelError,  setCancelError]  = useState('')
  const [cancelResult, setCancelResult] = useState(null)
  const [offerResult,  setOfferResult]  = useState(null)

  useEffect(() => {
    if (!user) return
    supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => { setSub(data); setSubLoading(false) })
  }, [user])

  const plan   = profile?.plan ?? 'trial'
  const isPaid = plan !== 'trial'
  const price  = PLAN_PRICES[plan]
  const period = profile?.billing_period ?? 'monthly'

  const isCancelledEoP = sub?.cancelled_at && sub?.status !== 'cancelled'
  const canCancel      = isPaid && sub?.stripe_subscription_id && !isCancelledEoP && sub?.status !== 'cancelled'

  async function openPortal() {
    setPortalError('')
    setPortalLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/create-portal', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      window.location.href = data.url
    } catch (err) {
      console.error('[DashPlot] create-portal error:', err.message)
      setPortalError('Could not open billing portal. Please try again.')
      setPortalLoading(false)
    }
  }

  function startCancel() {
    setCancelStep('reason')
    setCancelReason('')
    setCancelNote('')
    setCancelError('')
  }

  function proceedToOffer() {
    if (!cancelReason) return
    posthog.capture('cancellation_initiated', { cancellation_reason: cancelReason })
    setCancelStep('offer')
  }

  async function acceptOffer() {
    const offer = CANCEL_OFFERS[cancelReason]
    if (!offer) return
    setCancelling(true)
    setCancelError('')

    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    try {
      if (offer.action === 'coupon') {
        const res = await fetch('/api/apply-coupon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ coupon: 'RETENTION30' }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setOfferResult('coupon')
        setCancelStep('stayed')

      } else if (offer.action === 'pause') {
        const res = await fetch('/api/pause-subscription', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setOfferResult({ type: 'pause', resumes_at: data.resumes_at })
        setCancelStep('stayed')

      } else if (offer.action === 'feedback') {
        posthog.capture('cancellation_initiated', { cancellation_reason: cancelReason, feedback: cancelNote })
        if (cancelReason === 'missing_feature') {
          setCancelStep('stayed')
          setOfferResult('feedback')
        } else {
          await doCancel(token)
        }

      } else if (offer.action === 'downgrade') {
        navigate('/upgrade')
      }
    } catch (err) {
      console.error('[DashPlot] offer action error:', err.message)
      setCancelError('Something went wrong. Please try again.')
    }
    setCancelling(false)
  }

  async function proceedWithCancel() {
    const { data: { session } } = await supabase.auth.getSession()
    await doCancel(session?.access_token)
  }

  async function doCancel(token) {
    setCancelling(true)
    setCancelError('')
    try {
      const res = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const monthsActive = sub?.created_at
        ? Math.max(1, Math.round((Date.now() - new Date(sub.created_at)) / (1000 * 60 * 60 * 24 * 30)))
        : 1

      posthog.capture('cancellation_completed', { plan, months_active: monthsActive })

      setSub(s => ({ ...s, cancelled_at: new Date().toISOString() }))
      setCancelResult(data.ends_at)
      setCancelStep('done')
    } catch (err) {
      console.error('[DashPlot] cancel error:', err.message)
      setCancelError('Could not cancel. Please try again or contact support.')
    }
    setCancelling(false)
  }

  return (
    <div className="flex flex-col flex-1">
      <TrialStatusBar />
      <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">

        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm text-subtle">
            <Link to="/dashboard" className="hover:text-navy transition-colors flex items-center gap-1">
              <BackArrow /> Dashboard
            </Link>
            <span>/</span>
            <Link to="/account" className="hover:text-navy transition-colors">Account</Link>
          </div>
          <h1 className="text-2xl font-medium text-navy" style={{ letterSpacing: '-0.2px' }}>Billing</h1>
        </header>

        {/* ── Current plan ─────────────────────────────────────────── */}
        <div className="bg-white border border-mint rounded-card shadow-card p-5 sm:p-6 flex flex-col gap-4">
          <h2 className="text-sm font-medium text-navy">Current plan</h2>

          {subLoading ? (
            <div className="flex flex-col gap-3">
              <div className="h-5 bg-mint rounded-pill animate-pulse w-32" />
              <div className="h-4 bg-mint rounded-pill animate-pulse w-48" />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xl font-medium text-navy" style={{ letterSpacing: '-0.2px' }}>
                    {PLAN_LABELS[plan]}
                  </span>
                  {sub?.status && STATUS_STYLE[sub.status] && (
                    <span
                      className="text-xs font-medium px-2.5 py-0.5 rounded-pill"
                      style={{ background: STATUS_STYLE[sub.status].bg, color: STATUS_STYLE[sub.status].color }}
                    >
                      {isCancelledEoP ? 'Cancels at period end' : STATUS_STYLE[sub.status].label}
                    </span>
                  )}
                </div>
                {price && (
                  <span className="text-sm text-subtle">
                    ${price[period]}/{period === 'monthly' ? 'mo' : 'yr'}
                  </span>
                )}
              </div>

              {sub?.current_period_end && (
                <p className="text-xs text-subtle">
                  {isCancelledEoP ? 'Access until' : 'Next billing date'}:{' '}
                  <span className="font-medium text-navy">{fmtDate(sub.current_period_end)}</span>
                </p>
              )}

              {!isPaid && (
                <p className="text-xs text-subtle">
                  Free trial — <Link to="/upgrade" className="text-teal hover:underline">upgrade to unlock all features</Link>
                </p>
              )}
            </div>
          )}

          {isPaid && (
            <div className="border-t border-mint pt-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <button
                onClick={openPortal}
                disabled={portalLoading}
                className="text-sm border border-teal-light bg-mint px-5 py-2.5 rounded-pill hover:bg-teal-light transition-colors font-medium min-h-[44px] disabled:opacity-60"
                style={{ color: '#0F6E56' }}
              >
                {portalLoading ? 'Opening…' : 'Manage payment methods'}
              </button>
              {plan !== 'agency' && (
                <Link
                  to="/upgrade"
                  className="text-sm text-white bg-teal px-5 py-2.5 rounded-pill hover:bg-opacity-90 transition-colors font-medium min-h-[44px] flex items-center justify-center"
                >
                  Change plan
                </Link>
              )}
              {portalError && <p className="text-xs" style={{ color: '#E24B4A' }}>{portalError}</p>}
            </div>
          )}
        </div>

        {/* ── Cancel subscription ───────────────────────────────────── */}
        {canCancel && (
          <div className="bg-white border border-mint rounded-card shadow-card p-5 sm:p-6 flex flex-col gap-4">
            <h2 className="text-sm font-medium text-navy">Cancel subscription</h2>

            {cancelStep === null && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-subtle max-w-sm">
                  Your subscription will remain active until the end of your current billing period.
                </p>
                <button
                  onClick={startCancel}
                  className="text-xs text-subtle hover:text-error transition-colors underline underline-offset-2 flex-shrink-0 ml-4 min-h-[36px]"
                >
                  Cancel subscription
                </button>
              </div>
            )}

            {cancelStep === 'reason' && (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-subtle">We're sorry to see you go. What's the main reason?</p>
                <div className="flex flex-col gap-2">
                  {CANCEL_REASONS.map(r => (
                    <label key={r.id} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="radio"
                        name="cancel_reason"
                        value={r.id}
                        checked={cancelReason === r.id}
                        onChange={() => setCancelReason(r.id)}
                        className="w-4 h-4 accent-teal"
                      />
                      <span className="text-sm text-navy group-hover:text-teal transition-colors">{r.label}</span>
                    </label>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={proceedToOffer}
                    disabled={!cancelReason}
                    className="text-sm text-white bg-teal px-6 py-2.5 rounded-pill hover:bg-opacity-90 transition-colors font-medium min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue
                  </button>
                  <button
                    onClick={() => setCancelStep(null)}
                    className="text-sm text-subtle hover:text-navy transition-colors min-h-[44px] px-3"
                  >
                    Never mind
                  </button>
                </div>
              </div>
            )}

            {cancelStep === 'offer' && cancelReason && (() => {
              const offer = CANCEL_OFFERS[cancelReason]
              return (
                <div className="flex flex-col gap-4">
                  <div
                    className="rounded-card p-4 flex flex-col gap-2"
                    style={{ background: '#E1F5EE', border: '1px solid #9FE1CB' }}
                  >
                    <p className="text-sm font-medium" style={{ color: '#085041' }}>{offer.headline}</p>
                    <p className="text-sm" style={{ color: '#1D9E75' }}>{offer.body}</p>
                  </div>

                  {offer.inputLabel && (
                    <textarea
                      value={cancelNote}
                      onChange={e => setCancelNote(e.target.value)}
                      placeholder={offer.inputLabel}
                      rows={3}
                      className="w-full px-4 py-3 text-sm border border-mint rounded-card outline-none focus:border-teal focus:ring-1 focus:ring-teal transition-colors resize-none"
                    />
                  )}

                  {cancelError && (
                    <p className="text-xs" style={{ color: '#E24B4A' }}>{cancelError}</p>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={acceptOffer}
                      disabled={cancelling || (offer.inputLabel && !cancelNote.trim())}
                      className="text-sm text-white bg-teal px-6 py-2.5 rounded-pill hover:bg-opacity-90 transition-colors font-medium min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {cancelling ? 'Applying…' : offer.accept}
                    </button>
                    {offer.action !== 'feedback' && offer.action !== 'downgrade' && (
                      <button
                        onClick={proceedWithCancel}
                        disabled={cancelling}
                        className="text-sm text-subtle hover:text-error transition-colors min-h-[44px] px-3 underline underline-offset-2 disabled:opacity-50"
                      >
                        No thanks, cancel anyway
                      </button>
                    )}
                    {offer.action === 'feedback' && cancelReason === 'switching_tools' && (
                      <button
                        onClick={proceedWithCancel}
                        disabled={cancelling}
                        className="text-sm text-subtle hover:text-error transition-colors min-h-[44px] px-3 underline underline-offset-2 disabled:opacity-50"
                      >
                        Cancel without feedback
                      </button>
                    )}
                    <button
                      onClick={() => { setCancelStep('reason'); setCancelError('') }}
                      disabled={cancelling}
                      className="text-sm text-subtle hover:text-navy transition-colors min-h-[44px] px-3 disabled:opacity-50"
                    >
                      ← Back
                    </button>
                  </div>
                </div>
              )
            })()}

            {cancelStep === 'stayed' && (
              <div className="flex flex-col gap-3">
                {offerResult === 'coupon' && (
                  <div className="rounded-card p-4" style={{ background: '#E1F5EE', border: '1px solid #9FE1CB' }}>
                    <p className="text-sm font-medium" style={{ color: '#085041' }}>30% discount applied!</p>
                    <p className="text-sm mt-1" style={{ color: '#1D9E75' }}>
                      Your next 3 invoices will be 30% off. Thanks for sticking around.
                    </p>
                  </div>
                )}
                {offerResult?.type === 'pause' && (
                  <div className="rounded-card p-4" style={{ background: '#E1F5EE', border: '1px solid #9FE1CB' }}>
                    <p className="text-sm font-medium" style={{ color: '#085041' }}>Subscription paused.</p>
                    <p className="text-sm mt-1" style={{ color: '#1D9E75' }}>
                      Your billing is paused until {fmtDate(offerResult.resumes_at)}.
                      Your account stays fully active.
                    </p>
                  </div>
                )}
                {offerResult === 'feedback' && (
                  <div className="rounded-card p-4" style={{ background: '#E1F5EE', border: '1px solid #9FE1CB' }}>
                    <p className="text-sm font-medium" style={{ color: '#085041' }}>Thanks for your feedback!</p>
                    <p className="text-sm mt-1" style={{ color: '#1D9E75' }}>
                      We'll notify you as soon as this feature ships. Your subscription remains active.
                    </p>
                  </div>
                )}
                <button
                  onClick={() => setCancelStep(null)}
                  className="self-start text-xs text-subtle hover:text-navy transition-colors"
                >
                  Close
                </button>
              </div>
            )}

            {cancelStep === 'done' && (
              <div className="flex flex-col gap-3">
                <div className="rounded-card p-4" style={{ background: '#FEF3CD', border: '1px solid #FDE68A' }}>
                  <p className="text-sm font-medium text-amber-800">Cancellation scheduled.</p>
                  <p className="text-sm text-amber-700 mt-1">
                    Your {PLAN_LABELS[plan]} subscription will remain active until
                    {cancelResult ? ` ${fmtDate(cancelResult)}` : ' the end of your current billing period'}.
                    You won't be charged again.
                  </p>
                </div>
                <p className="text-xs text-subtle">
                  Changed your mind?{' '}
                  <a href="mailto:hello@dashplot.com" className="text-teal hover:underline">
                    Contact us
                  </a>{' '}
                  to reactivate before your access ends.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Post-cancellation ─────────────────────────────────────── */}
        {isCancelledEoP && cancelStep === null && (
          <div className="rounded-card p-4" style={{ background: '#FEF3CD', border: '1px solid #FDE68A' }}>
            <p className="text-sm font-medium text-amber-800">Your subscription is set to cancel.</p>
            {sub?.current_period_end && (
              <p className="text-sm text-amber-700 mt-1">
                Access continues until {fmtDate(sub.current_period_end)}.
              </p>
            )}
            <p className="text-xs text-amber-600 mt-2">
              Want to stay?{' '}
              <a href="mailto:hello@dashplot.com" className="underline hover:text-amber-800">
                Email us
              </a>{' '}
              and we'll reactivate your subscription.
            </p>
          </div>
        )}

        {/* ── Trial users ───────────────────────────────────────────── */}
        {!isPaid && !subLoading && (
          <div
            className="rounded-card p-5 flex flex-col sm:flex-row sm:items-center gap-4"
            style={{ background: '#E1F5EE', border: '1px solid #9FE1CB' }}
          >
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: '#085041' }}>Ready to upgrade?</p>
              <p className="text-xs mt-1" style={{ color: '#1D9E75' }}>
                Unlock unlimited reports, full AI insights, sharing, and PDF export.
              </p>
            </div>
            <Link
              to="/upgrade"
              className="self-start sm:self-auto text-sm text-white bg-teal px-6 py-2.5 rounded-pill hover:bg-opacity-90 transition-colors font-medium min-h-[44px] flex items-center"
            >
              View plans →
            </Link>
          </div>
        )}

      </div>
    </div>
  )
}

function fmtDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function BackArrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
