import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import TrialStatusBar from '../components/TrialStatusBar'

const CHART_TYPE_LABELS = {
  bar: 'Bar', line: 'Line', area: 'Area',
  pie: 'Pie', scatter: 'Scatter', funnel: 'Funnel',
}

export default function Dashboard() {
  const { user, profile, fetchProfile } = useAuth()
  const location  = useLocation()
  const navigate  = useNavigate()
  const [reports,       setReports]       = useState([])
  const [loading,       setLoading]       = useState(true)
  const [deleting,      setDeleting]      = useState(null)
  const [upgradedPlan,  setUpgradedPlan]  = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('upgraded') === '1') {
      navigate('/dashboard', { replace: true })
      if (user) {
        fetchProfile(user.id).then(p => {
          if (p?.plan && p.plan !== 'trial') setUpgradedPlan(p.plan)
        })
      }
    }
  }, [])

  useEffect(() => {
    if (!user) return
    supabase
      .from('reports')
      .select('id, title, data_source, chart_config, column_config, created_at')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setReports(data ?? [])
        setLoading(false)
      })
  }, [user])

  async function handleDelete(reportId) {
    if (!window.confirm('Delete this report? This cannot be undone.')) return
    setDeleting(reportId)
    await supabase
      .from('reports')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', reportId)
    setReports(rs => rs.filter(r => r.id !== reportId))
    setDeleting(null)
  }

  const displayName  = profile?.display_name || 'there'
  const trialUsed    = profile?.trial_reports_used ?? 0
  const atLimit      = profile?.plan === 'trial' && trialUsed >= 3

  return (
    <div className="flex flex-col flex-1">
      <TrialStatusBar />

      {upgradedPlan && (
        <div className="w-full px-4 py-3 border-b" style={{ background: '#E1F5EE', borderColor: '#9FE1CB' }}>
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <p className="text-sm font-medium" style={{ color: '#085041' }}>
              Welcome to {upgradedPlan.charAt(0).toUpperCase() + upgradedPlan.slice(1)}! Your plan is now active.
            </p>
            <button
              onClick={() => setUpgradedPlan(null)}
              className="text-sm flex-shrink-0"
              style={{ color: '#1D9E75' }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 flex flex-col gap-8">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-medium text-navy" style={{ letterSpacing: '-0.2px' }}>
              {reports.length === 0 && !loading ? `Welcome, ${displayName}` : 'My reports'}
            </h1>
            {reports.length > 0 && (
              <p className="text-sm text-subtle mt-1">{reports.length} report{reports.length !== 1 ? 's' : ''}</p>
            )}
          </div>

          {atLimit ? (
            <Link
              to="/upgrade"
              className="self-start sm:self-auto text-sm border border-teal bg-mint px-5 py-3 rounded-pill hover:bg-teal-light transition-colors font-medium min-h-[44px] flex items-center gap-2"
              style={{ color: '#0F6E56' }}
            >
              <LockIcon /> Upgrade for more reports
            </Link>
          ) : (
            <Link
              to="/dashboard/new"
              className="self-start sm:self-auto text-sm text-white bg-teal px-6 py-3 rounded-pill hover:bg-opacity-90 transition-colors font-medium min-h-[44px] flex items-center gap-2"
            >
              <PlusIcon /> New report
            </Link>
          )}
        </header>

        {loading ? (
          <ReportsSkeleton />
        ) : reports.length === 0 ? (
          <EmptyState displayName={displayName} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {reports.map(r => (
              <ReportCard
                key={r.id}
                report={r}
                deleting={deleting === r.id}
                onDelete={() => handleDelete(r.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Report card ──────────────────────────────────────────────────────────────

function ReportCard({ report, deleting, onDelete }) {
  const chartType = report.chart_config?.type ?? 'bar'
  const rows      = report.column_config?.rowCount ?? '—'
  const cols      = report.column_config?.headers?.length ?? 0
  const created   = new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="group bg-white border border-mint rounded-card shadow-card p-5 flex flex-col gap-3 hover:border-teal transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="w-10 h-10 rounded-card bg-mint flex items-center justify-center flex-shrink-0">
          <ChartTypeIcon type={chartType} />
        </div>
        <button
          onClick={onDelete}
          disabled={deleting}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-subtle hover:text-error p-1 rounded disabled:opacity-40 min-h-[32px] min-w-[32px] flex items-center justify-center"
          title="Delete report"
        >
          {deleting ? <Spinner /> : <TrashIcon />}
        </button>
      </div>

      <div className="flex flex-col gap-1 flex-1">
        <h2 className="text-sm font-medium text-navy leading-snug line-clamp-2">{report.title}</h2>
        <div className="flex flex-wrap items-center gap-2 text-xs text-subtle mt-1">
          <span className="bg-mint border border-teal-light text-ai-text px-2 py-0.5 rounded-pill capitalize">{report.data_source}</span>
          <span>{CHART_TYPE_LABELS[chartType] ?? chartType} chart</span>
          {typeof rows === 'number' && <span>{rows.toLocaleString()} rows</span>}
          <span>{cols} cols</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-mint">
        <span className="text-xs text-subtle">{created}</span>
        <Link
          to={`/dashboard/${report.id}`}
          className="text-xs text-teal font-medium hover:underline flex items-center gap-1"
        >
          Open <ArrowRight />
        </Link>
      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ displayName }) {
  const onboardingAnswers = (() => {
    try { return JSON.parse(localStorage.getItem('dashplot_onboarding_answers') || 'null') }
    catch { return null }
  })()

  const hint = onboardingAnswers
    ? `Based on your profile, a ${onboardingAnswers.business_type?.toLowerCase() ?? 'sample'} dashboard is ready when you upload your data.`
    : null

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-card bg-mint flex items-center justify-center mb-6">
        <ChartBarsIcon />
      </div>
      <h2 className="text-xl font-medium text-navy mb-2" style={{ letterSpacing: '-0.2px' }}>
        Your first dashboard awaits
      </h2>
      <p className="text-sm text-subtle max-w-sm">
        Upload a CSV or Excel file and DashPlot builds a beautiful, AI-powered dashboard in seconds.
      </p>
      {hint && (
        <p className="text-xs text-ai-text bg-mint border border-teal-light rounded-card px-4 py-2 mt-3 max-w-sm">
          {hint}
        </p>
      )}
      <div className="flex flex-col sm:flex-row gap-3 mt-8">
        <Link
          to="/dashboard/new"
          className="text-sm text-white bg-teal px-8 py-3 rounded-pill hover:bg-opacity-90 transition-colors font-medium min-h-[44px] flex items-center justify-center"
        >
          Upload your data
        </Link>
        <Link
          to="/guide"
          className="text-sm border border-teal-light bg-mint px-8 py-3 rounded-pill hover:bg-teal-light transition-colors min-h-[44px] flex items-center justify-center"
          style={{ color: '#0F6E56' }}
        >
          File prep guide
        </Link>
      </div>
    </div>
  )
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function ReportsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white border border-mint rounded-card p-5 flex flex-col gap-3 animate-pulse">
          <div className="w-10 h-10 bg-mint rounded-card" />
          <div className="h-4 bg-mint rounded-pill w-3/4" />
          <div className="h-3 bg-mint rounded-pill w-1/2" />
          <div className="h-px bg-mint mt-2" />
          <div className="h-3 bg-mint rounded-pill w-1/3" />
        </div>
      ))}
    </div>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function ChartTypeIcon({ type }) {
  const colors = { bar: '#1D9E75', line: '#185FA5', area: '#9FE1CB', pie: '#EF9F27', scatter: '#1D9E75', funnel: '#185FA5' }
  const c = colors[type] ?? '#1D9E75'
  if (type === 'pie') return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 10 L10 2 A8 8 0 1 1 2.9 14Z" fill={c} opacity="0.8" />
      <path d="M10 10 L2.9 14 A8 8 0 0 1 10 2Z" fill={c} opacity="0.4" />
    </svg>
  )
  if (type === 'line' || type === 'area') return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <polyline points="2,15 6,9 10,12 14,5 18,8" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="12" width="4" height="6" rx="1" fill={c} opacity="0.4" />
      <rect x="8" y="8" width="4" height="10" rx="1" fill={c} opacity="0.7" />
      <rect x="14" y="4" width="4" height="14" rx="1" fill={c} />
    </svg>
  )
}

function PlusIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
}

function LockIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="6" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2" /><path d="M4.5 6V4a2.5 2.5 0 015 0v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
}

function TrashIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 4h10M5 4V2.5h4V4M5.5 6.5v4M8.5 6.5v4M3 4l.7 7.5h6.6L11 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function ArrowRight() {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function ChartBarsIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect x="4" y="18" width="5" height="10" rx="2" fill="#9FE1CB" />
      <rect x="12" y="12" width="5" height="16" rx="2" fill="#1D9E75" />
      <rect x="20" y="6" width="5" height="22" rx="2" fill="#185FA5" />
    </svg>
  )
}

function Spinner() {
  return <div className="w-3 h-3 rounded-full border-2 border-mint border-t-subtle animate-spin" />
}
