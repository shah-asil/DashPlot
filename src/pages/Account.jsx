import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import TrialStatusBar from '../components/TrialStatusBar'

const PLAN_LABELS = { trial: 'Trial', solo: 'Solo', pro: 'Pro', agency: 'Agency' }
const PLAN_COLORS = { trial: '#B4B2A9', solo: '#1D9E75', pro: '#185FA5', agency: '#EF9F27' }

export default function Account() {
  const { user, profile, fetchProfile } = useAuth()

  const [editing, setEditing]       = useState(false)
  const [draft, setDraft]           = useState('')
  const [savingName, setSavingName] = useState(false)
  const [nameError, setNameError]   = useState('')
  const inputRef = useRef(null)

  const [referralCode, setReferralCode]   = useState(null)
  const [copied, setCopied]               = useState(false)
  const [referralStats, setReferralStats] = useState(null)

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  useEffect(() => {
    if (!user || !profile) return
    initReferral()
    loadReferralStats()
  }, [user, profile?.referral_code])

  async function initReferral() {
    if (profile?.referral_code) {
      setReferralCode(profile.referral_code)
      return
    }
    const code = Math.random().toString(36).slice(2, 8).toUpperCase()
    const { error } = await supabase.from('users').update({ referral_code: code }).eq('id', user.id)
    if (!error) {
      setReferralCode(code)
      fetchProfile(user.id)
    }
  }

  async function loadReferralStats() {
    const { data } = await supabase.from('referrals').select('status, reward_applied_at').eq('referrer_id', user.id)
    if (data) {
      setReferralStats({
        total:     data.length,
        converted: data.filter(r => r.status === 'converted').length,
        rewarded:  data.filter(r => r.reward_applied_at !== null).length,
      })
    }
  }

  async function saveName() {
    const name = draft.trim()
    if (!name) { setNameError('Name cannot be empty.'); return }
    if (name === profile?.display_name) { setEditing(false); return }
    setSavingName(true)
    setNameError('')
    const { error } = await supabase.from('users').update({ display_name: name }).eq('id', user.id)
    if (error) {
      setNameError('Could not save name. Please try again.')
    } else {
      await fetchProfile(user.id)
      setEditing(false)
    }
    setSavingName(false)
  }

  async function copyReferralLink() {
    if (!referralCode) return
    await navigator.clipboard.writeText(`${window.location.origin}/ref/${referralCode}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const plan        = profile?.plan ?? 'trial'
  const displayName = profile?.display_name || user?.email?.split('@')[0] || '—'
  const referralLink = referralCode ? `${window.location.origin}/ref/${referralCode}` : ''

  return (
    <div className="flex flex-col flex-1">
      <TrialStatusBar />
      <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">

        <header className="flex flex-col gap-2">
          <Link to="/dashboard" className="text-sm text-subtle hover:text-navy transition-colors flex items-center gap-1">
            <BackArrow /> Dashboard
          </Link>
          <h1 className="text-2xl font-medium text-navy" style={{ letterSpacing: '-0.2px' }}>Account settings</h1>
        </header>

        {/* ── Profile ──────────────────────────────────────────────── */}
        <Card title="Profile">
          <Field label="Display name">
            {editing ? (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditing(false) }}
                    maxLength={50}
                    className="flex-1 px-4 py-2.5 text-sm border border-teal rounded-pill outline-none"
                  />
                  <button
                    onClick={saveName}
                    disabled={savingName}
                    className="text-sm text-white bg-teal px-4 py-2 rounded-pill hover:bg-opacity-90 disabled:opacity-60 min-h-[40px] transition-colors"
                  >
                    {savingName ? '…' : 'Save'}
                  </button>
                  <button
                    onClick={() => { setEditing(false); setNameError('') }}
                    className="text-sm text-subtle px-3 py-2 rounded-pill hover:bg-mint min-h-[40px] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                {nameError && <p className="text-xs" style={{ color: '#E24B4A' }}>{nameError}</p>}
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm text-navy">{displayName}</span>
                <button
                  onClick={() => { setDraft(profile?.display_name || ''); setEditing(true) }}
                  className="text-xs text-teal hover:underline"
                >
                  Edit
                </button>
              </div>
            )}
          </Field>
          <Divider />
          <Field label="Email">
            <span className="text-sm text-subtle">{user?.email}</span>
          </Field>
        </Card>

        {/* ── Plan ─────────────────────────────────────────────────── */}
        <Card title="Plan">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span
                className="text-xs font-medium px-2.5 py-1 rounded-pill"
                style={{ background: PLAN_COLORS[plan] + '20', color: PLAN_COLORS[plan] }}
              >
                {PLAN_LABELS[plan]}
              </span>
              {profile?.billing_period && (
                <span className="text-xs text-subtle capitalize">{profile.billing_period} billing</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Link to="/account/billing" className="text-xs text-subtle hover:text-navy transition-colors">
                Manage billing →
              </Link>
              {plan !== 'agency' && (
                <Link
                  to="/upgrade"
                  className="text-xs text-white bg-teal px-4 py-2 rounded-pill hover:bg-opacity-90 transition-colors min-h-[32px] flex items-center font-medium"
                >
                  {plan === 'trial' ? 'Upgrade' : 'Change plan'}
                </Link>
              )}
            </div>
          </div>
        </Card>

        {/* ── Referral ─────────────────────────────────────────────── */}
        <Card title="Refer a friend">
          <p className="text-sm text-subtle">
            Share DashPlot and earn <span className="font-medium text-navy">1 free month</span> for every friend who subscribes.
            They get <span className="font-medium text-navy">20% off</span> their first 2 months.
          </p>

          {referralCode ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={referralLink}
                  className="flex-1 min-w-0 text-xs bg-mint border border-teal-light rounded-pill px-3 py-2.5 outline-none truncate"
                  style={{ color: '#185FA5' }}
                />
                <button
                  onClick={copyReferralLink}
                  className="text-xs text-white bg-teal px-4 py-2.5 rounded-pill hover:bg-opacity-90 transition-colors font-medium flex-shrink-0 min-h-[40px] whitespace-nowrap"
                >
                  {copied ? '✓ Copied' : 'Copy link'}
                </button>
              </div>

              {referralStats !== null && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-subtle">
                  <span>
                    <span className="font-medium text-navy">{referralStats.total}</span>{' '}
                    {referralStats.total === 1 ? 'person' : 'people'} referred
                  </span>
                  <span>·</span>
                  <span>
                    <span className="font-medium text-teal">{referralStats.converted}</span>{' '}
                    converted to paid
                  </span>
                  {referralStats.rewarded > 0 && (
                    <>
                      <span>·</span>
                      <span>
                        <span className="font-medium text-navy">{referralStats.rewarded}</span>{' '}
                        {referralStats.rewarded === 1 ? 'reward' : 'rewards'} earned
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="h-10 bg-mint rounded-pill animate-pulse" />
          )}
        </Card>

      </div>
    </div>
  )
}

function Card({ title, children }) {
  return (
    <div className="bg-white border border-mint rounded-card shadow-card p-5 sm:p-6 flex flex-col gap-4">
      <h2 className="text-sm font-medium text-navy">{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs text-subtle">{label}</p>
      {children}
    </div>
  )
}

function Divider() {
  return <div className="border-t border-mint" />
}

function BackArrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
