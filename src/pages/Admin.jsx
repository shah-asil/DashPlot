import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const INACTIVITY_MS = 2 * 60 * 60 * 1000

const PLAN_COLORS = { trial: '#B4B2A9', solo: '#1D9E75', pro: '#185FA5', agency: '#EF9F27' }
const PLAN_LABELS = { trial: 'Trial', solo: 'Solo', pro: 'Pro', agency: 'Agency' }
const VALID_PLANS = ['trial', 'solo', 'pro', 'agency']

const TABS = ['overview', 'users', 'revenue', 'reports', 'referrals']
const TAB_LABELS = {
  overview: 'Overview', users: 'Users', revenue: 'Revenue',
  reports: 'Reports', referrals: 'Referrals',
}

export default function Admin() {
  const { user, profile, loading, signOut } = useAuth()
  const navigate = useNavigate()

  const [tab,         setTab]         = useState('overview')
  const [sectionData, setSectionData] = useState(null)
  const [fetching,    setFetching]    = useState(false)
  const [err,         setErr]         = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search,      setSearch]      = useState('')

  const lastActivityRef = useRef(Date.now())

  // 2-hour inactivity timeout
  useEffect(() => {
    const bump = () => { lastActivityRef.current = Date.now() }
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    events.forEach(ev => window.addEventListener(ev, bump, { passive: true }))

    const iv = setInterval(async () => {
      if (Date.now() - lastActivityRef.current > INACTIVITY_MS) {
        await signOut()
        navigate('/', { replace: true })
      }
    }, 60_000)

    return () => {
      events.forEach(ev => window.removeEventListener(ev, bump))
      clearInterval(iv)
    }
  }, [navigate, signOut])

  // Admin gate — redirect silently if not admin
  useEffect(() => {
    if (loading) return
    if (!user || profile?.is_admin !== true) navigate('/', { replace: true })
  }, [user, profile, loading, navigate])

  const loadSection = useCallback(async (section, searchVal) => {
    if (!user || profile?.is_admin !== true) return
    setFetching(true)
    setErr('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const params = new URLSearchParams({ section })
      if (searchVal) params.set('search', searchVal)
      const res = await fetch(`/api/admin-data?${params}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setSectionData(await res.json())
    } catch (e) {
      console.error('[DashPlot] admin loadSection:', e.message)
      setErr('Failed to load data. Please refresh.')
    } finally {
      setFetching(false)
    }
  }, [user, profile])

  useEffect(() => {
    if (!user || profile?.is_admin !== true) return
    setSectionData(null)
    loadSection(tab, tab === 'users' ? search : '')
  }, [tab, search, user, profile, loadSection])

  async function doAction(payload) {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin-action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    if (json.success) loadSection(tab, tab === 'users' ? search : '')
    return json
  }

  if (loading || !profile?.is_admin) return null

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F5F7F9' }}>
      {/* Header */}
      <header className="bg-white border-b border-mint px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ShieldIcon />
          <span className="text-base font-medium text-navy" style={{ letterSpacing: '-0.2px' }}>
            DashPlot Admin
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:block text-xs text-subtle">{user?.email}</span>
          <button
            onClick={async () => { await signOut(); navigate('/', { replace: true }) }}
            className="text-xs text-subtle hover:text-navy transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-mint">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setSectionData(null) }}
              className={`text-sm px-4 py-3.5 border-b-2 transition-colors whitespace-nowrap ${
                tab === t
                  ? 'border-teal text-teal font-medium'
                  : 'border-transparent text-subtle hover:text-navy'
              }`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8">
        {fetching ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 rounded-full border-2 border-mint border-t-teal animate-spin" />
          </div>
        ) : err ? (
          <p className="text-sm py-4" style={{ color: '#E24B4A' }}>{err}</p>
        ) : sectionData ? (
          <>
            {tab === 'overview'  && <OverviewSection  data={sectionData} />}
            {tab === 'users'     && (
              <UsersSection
                data={sectionData}
                searchInput={searchInput}
                onInputChange={setSearchInput}
                onSearch={() => setSearch(searchInput)}
                onAction={doAction}
              />
            )}
            {tab === 'revenue'   && <RevenueSection   data={sectionData} />}
            {tab === 'reports'   && <ReportsSection   data={sectionData} />}
            {tab === 'referrals' && <ReferralsSection data={sectionData} onAction={doAction} />}
          </>
        ) : null}
      </div>
    </div>
  )
}

// ─── Overview ─────────────────────────────────────────────────────────────────

function OverviewSection({ data }) {
  const { mrr, totalUsers, paidUsers, conversionRate, churnRate, planBreakdown } = data

  const pieData = planBreakdown.filter(p => p.count > 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Monthly Recurring Revenue" value={`$${mrr.toFixed(2)}`} accent="#1D9E75" />
        <StatCard label="Total Users"               value={totalUsers.toLocaleString()} />
        <StatCard label="Trial → Paid Conversion"   value={`${conversionRate}%`} accent="#185FA5" />
        <StatCard label="30-Day Churn Rate"         value={`${churnRate}%`} accent={parseFloat(churnRate) > 5 ? '#E24B4A' : '#1D9E75'} />
      </div>

      <Card title="Plan breakdown">
        <div className="flex flex-col sm:flex-row items-center gap-8">
          <div className="w-full sm:w-48 h-48 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="count"
                  nameKey="plan"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={48}
                  paddingAngle={2}
                >
                  {pieData.map(entry => (
                    <Cell key={entry.plan} fill={PLAN_COLORS[entry.plan]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [v, PLAN_LABELS[n] ?? n]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 w-full">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-mint">
                  <th className="text-left py-2 text-xs text-subtle font-medium">Plan</th>
                  <th className="text-right py-2 text-xs text-subtle font-medium">Users</th>
                  <th className="text-right py-2 text-xs text-subtle font-medium">Share</th>
                </tr>
              </thead>
              <tbody>
                {planBreakdown.map(row => (
                  <tr key={row.plan} className="border-b border-mint last:border-0">
                    <td className="py-2.5">
                      <PlanBadge plan={row.plan} />
                    </td>
                    <td className="py-2.5 text-right text-navy font-medium">{row.count}</td>
                    <td className="py-2.5 text-right text-subtle">
                      {totalUsers > 0 ? ((row.count / totalUsers) * 100).toFixed(1) : '0.0'}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  )
}

// ─── Users ────────────────────────────────────────────────────────────────────

function UsersSection({ data, searchInput, onInputChange, onSearch, onAction }) {
  const { users } = data
  const [changingPlan, setChangingPlan] = useState(null)
  const [extendingTrial, setExtendingTrial] = useState(null)

  async function handleExtendTrial(userId) {
    setExtendingTrial(userId)
    await onAction({ action: 'extend_trial', userId })
    setExtendingTrial(null)
  }

  async function handleChangePlan(userId, plan) {
    setChangingPlan(userId)
    await onAction({ action: 'change_plan', userId, plan })
    setChangingPlan(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <input
          value={searchInput}
          onChange={e => onInputChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onSearch()}
          placeholder="Search by email or name…"
          className="flex-1 px-4 py-2.5 text-sm border border-teal-light rounded-pill outline-none focus:border-teal"
        />
        <button
          onClick={onSearch}
          className="text-sm text-white bg-teal px-5 py-2.5 rounded-pill hover:bg-opacity-90 transition-colors font-medium"
        >
          Search
        </button>
      </div>

      <Card title={`${users.length} user${users.length !== 1 ? 's' : ''}`}>
        <div className="overflow-x-auto -mx-5 sm:-mx-6">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-mint">
                <th className="text-left px-5 sm:px-6 py-2.5 text-xs text-subtle font-medium">User</th>
                <th className="text-left px-3 py-2.5 text-xs text-subtle font-medium">Plan</th>
                <th className="text-left px-3 py-2.5 text-xs text-subtle font-medium">Trial ends</th>
                <th className="text-left px-3 py-2.5 text-xs text-subtle font-medium">Joined</th>
                <th className="text-right px-5 sm:px-6 py-2.5 text-xs text-subtle font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-mint last:border-0 hover:bg-mint transition-colors">
                  <td className="px-5 sm:px-6 py-3">
                    <p className="text-navy font-medium truncate max-w-[180px]">
                      {u.display_name || u.email.split('@')[0]}
                      {u.is_admin && <span className="ml-1.5 text-xs text-teal">(admin)</span>}
                    </p>
                    <p className="text-xs text-subtle truncate max-w-[180px]">{u.email}</p>
                  </td>
                  <td className="px-3 py-3">
                    <select
                      value={u.plan}
                      disabled={changingPlan === u.id}
                      onChange={e => handleChangePlan(u.id, e.target.value)}
                      className="text-xs border border-teal-light rounded-pill px-2.5 py-1.5 outline-none focus:border-teal bg-white disabled:opacity-60"
                    >
                      {VALID_PLANS.map(p => (
                        <option key={p} value={p}>{PLAN_LABELS[p]}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-3 text-xs text-subtle">
                    {u.trial_ends_at
                      ? new Date(u.trial_ends_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '—'
                    }
                  </td>
                  <td className="px-3 py-3 text-xs text-subtle">
                    {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-5 sm:px-6 py-3 text-right">
                    <button
                      onClick={() => handleExtendTrial(u.id)}
                      disabled={extendingTrial === u.id}
                      className="text-xs text-teal hover:underline disabled:opacity-60 min-h-[32px] whitespace-nowrap"
                    >
                      {extendingTrial === u.id ? '…' : '+7 days trial'}
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 sm:px-6 py-8 text-center text-sm text-subtle">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

// ─── Revenue ───────────────────────────────────────────────────────────────────

function RevenueSection({ data }) {
  const { planBreakdown, mrrHistory } = data
  const totalMRR = planBreakdown.reduce((s, p) => s + p.mrr, 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {planBreakdown.map(row => (
          <StatCard
            key={row.plan}
            label={`${PLAN_LABELS[row.plan]} plan`}
            value={`$${row.mrr.toFixed(2)}/mo`}
            sub={`${row.count} subscriber${row.count !== 1 ? 's' : ''}`}
            accent={PLAN_COLORS[row.plan]}
          />
        ))}
      </div>

      <Card title="MRR over time">
        {mrrHistory.length === 0 ? (
          <p className="text-sm text-subtle py-4 text-center">No subscription data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={mrrHistory} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#1D9E75" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#1D9E75" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#B4B2A9' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#B4B2A9' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} width={48} />
              <Tooltip formatter={v => [`$${v.toFixed(2)}`, 'MRR']} labelStyle={{ color: '#185FA5' }} />
              <Area
                type="monotone"
                dataKey="mrr"
                stroke="#1D9E75"
                strokeWidth={2}
                fill="url(#mrrGradient)"
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card title="Total MRR">
        <p className="text-3xl font-medium text-navy" style={{ letterSpacing: '-0.4px' }}>
          ${totalMRR.toFixed(2)}<span className="text-sm text-subtle font-normal">/mo</span>
        </p>
      </Card>
    </div>
  )
}

// ─── Reports ───────────────────────────────────────────────────────────────────

function ReportsSection({ data }) {
  const { totalReports, topUsers, sourceBreakdown } = data

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard label="Total reports created" value={totalReports.toLocaleString()} />
        {sourceBreakdown.map(s => (
          <StatCard
            key={s.source}
            label={`${s.source} reports`}
            value={s.count.toLocaleString()}
          />
        ))}
      </div>

      <Card title="Most active users">
        <div className="overflow-x-auto -mx-5 sm:-mx-6">
          <table className="w-full text-sm min-w-[400px]">
            <thead>
              <tr className="border-b border-mint">
                <th className="text-left px-5 sm:px-6 py-2.5 text-xs text-subtle font-medium">User</th>
                <th className="text-left px-3 py-2.5 text-xs text-subtle font-medium">Plan</th>
                <th className="text-right px-5 sm:px-6 py-2.5 text-xs text-subtle font-medium">Reports</th>
              </tr>
            </thead>
            <tbody>
              {topUsers.map(u => (
                <tr key={u.id} className="border-b border-mint last:border-0">
                  <td className="px-5 sm:px-6 py-3">
                    <p className="text-navy font-medium">{u.display_name || u.email.split('@')[0]}</p>
                    <p className="text-xs text-subtle">{u.email}</p>
                  </td>
                  <td className="px-3 py-3"><PlanBadge plan={u.plan} /></td>
                  <td className="px-5 sm:px-6 py-3 text-right font-medium text-navy">{u.reportCount}</td>
                </tr>
              ))}
              {topUsers.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 sm:px-6 py-8 text-center text-sm text-subtle">No reports yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

// ─── Referrals ─────────────────────────────────────────────────────────────────

function ReferralsSection({ data, onAction }) {
  const { referrals } = data
  const [applying, setApplying] = useState(null)

  async function handleApplyReward(referralId) {
    setApplying(referralId)
    await onAction({ action: 'apply_reward', referralId })
    setApplying(null)
  }

  const total     = referrals.length
  const converted = referrals.filter(r => r.status === 'converted').length
  const rewarded  = referrals.filter(r => r.reward_applied_at).length

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total referrals"  value={total.toString()} />
        <StatCard label="Converted"        value={converted.toString()} accent="#1D9E75" />
        <StatCard label="Rewards applied"  value={rewarded.toString()} accent="#185FA5" />
      </div>

      <Card title="All referral relationships">
        <div className="overflow-x-auto -mx-5 sm:-mx-6">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-mint">
                <th className="text-left px-5 sm:px-6 py-2.5 text-xs text-subtle font-medium">Referrer</th>
                <th className="text-left px-3 py-2.5 text-xs text-subtle font-medium">Referred</th>
                <th className="text-left px-3 py-2.5 text-xs text-subtle font-medium">Status</th>
                <th className="text-left px-3 py-2.5 text-xs text-subtle font-medium">Converted</th>
                <th className="text-right px-5 sm:px-6 py-2.5 text-xs text-subtle font-medium">Reward</th>
              </tr>
            </thead>
            <tbody>
              {referrals.map(r => (
                <tr key={r.id} className="border-b border-mint last:border-0 hover:bg-mint transition-colors">
                  <td className="px-5 sm:px-6 py-3">
                    <p className="text-navy font-medium truncate max-w-[160px]">
                      {r.referrer.display_name || r.referrer.email?.split('@')[0]}
                    </p>
                    <p className="text-xs text-subtle truncate max-w-[160px]">{r.referrer.email}</p>
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-navy truncate max-w-[160px]">
                      {r.referred.display_name || r.referred.email?.split('@')[0]}
                    </p>
                    <p className="text-xs text-subtle truncate max-w-[160px]">{r.referred.email}</p>
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-3 py-3 text-xs text-subtle">
                    {r.converted_at
                      ? new Date(r.converted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '—'
                    }
                  </td>
                  <td className="px-5 sm:px-6 py-3 text-right">
                    {r.reward_applied_at ? (
                      <span className="text-xs text-teal">
                        Applied {new Date(r.reward_applied_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    ) : r.status === 'converted' ? (
                      <button
                        onClick={() => handleApplyReward(r.id)}
                        disabled={applying === r.id}
                        className="text-xs text-white bg-teal px-3 py-1.5 rounded-pill hover:bg-opacity-90 transition-colors disabled:opacity-60"
                      >
                        {applying === r.id ? '…' : 'Apply reward'}
                      </button>
                    ) : (
                      <span className="text-xs text-subtle">Pending</span>
                    )}
                  </td>
                </tr>
              ))}
              {referrals.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 sm:px-6 py-8 text-center text-sm text-subtle">
                    No referrals yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

// ─── Shared components ─────────────────────────────────────────────────────────

function Card({ title, children }) {
  return (
    <div className="bg-white border border-mint rounded-card shadow-card p-5 sm:p-6 flex flex-col gap-4">
      {title && <h2 className="text-sm font-medium text-navy">{title}</h2>}
      {children}
    </div>
  )
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="bg-white border border-mint rounded-card shadow-card p-5 flex flex-col gap-1.5">
      <p className="text-xs text-subtle">{label}</p>
      <p className="text-2xl font-medium" style={{ color: accent ?? '#185FA5', letterSpacing: '-0.3px' }}>
        {value}
      </p>
      {sub && <p className="text-xs text-subtle">{sub}</p>}
    </div>
  )
}

function PlanBadge({ plan }) {
  const color = PLAN_COLORS[plan] ?? '#B4B2A9'
  return (
    <span
      className="text-xs font-medium px-2.5 py-1 rounded-pill"
      style={{ background: color + '20', color }}
    >
      {PLAN_LABELS[plan] ?? plan}
    </span>
  )
}

function StatusBadge({ status }) {
  const styles = {
    pending:   { bg: '#F5F5F4', color: '#B4B2A9' },
    converted: { bg: '#E1F5EE', color: '#1D9E75' },
  }
  const s = styles[status] ?? styles.pending
  return (
    <span
      className="text-xs font-medium px-2.5 py-1 rounded-pill capitalize"
      style={{ background: s.bg, color: s.color }}
    >
      {status}
    </span>
  )
}

function ShieldIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path
        d="M10 2L3 5v5c0 4.418 2.997 8.549 7 9 4.003-.451 7-4.582 7-9V5l-7-3z"
        stroke="#185FA5"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  )
}
