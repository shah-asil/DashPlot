import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import TrialStatusBar from '../components/TrialStatusBar'
import DashboardChart from '../components/DashboardChart'
import ChartTypeSelector from '../components/ChartTypeSelector'
import MetricSummary from '../components/MetricSummary'
import AIInsightCard from '../components/AIInsightCard'
import ShareButton from '../components/ShareButton'
import PdfExportButton from '../components/PdfExportButton'
import PdfSummaryStats from '../components/PdfSummaryStats'

// ─── Chart config helpers ─────────────────────────────────────────────────────

function padToFour(configs, colConfig) {
  const types = ['bar', 'line', 'area', 'pie']
  const base = {
    xAxis: colConfig?.xAxis ?? '',
    yAxis: colConfig?.yAxis ?? [],
    series: colConfig?.series ?? '',
  }
  const result = [...configs]
  while (result.length < 4) {
    result.push({ ...base, type: types[result.length % 4] })
  }
  return result.slice(0, 4)
}

function getChartConfigs(report) {
  const cfg = report.chart_config
  const colCfg = report.column_config
  if (Array.isArray(cfg) && cfg.length > 0) return padToFour(cfg, colCfg)
  return padToFour([{
    type: cfg?.type ?? 'bar',
    xAxis: colCfg?.xAxis ?? '',
    yAxis: colCfg?.yAxis ?? [],
    series: colCfg?.series ?? '',
  }], colCfg)
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportView() {
  const { id } = useParams()
  const { user, profile } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const [report,   setReport]   = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [notFound, setNotFound] = useState(false)

  const pdfRef = useRef(null)

  const celebrateThird = location.state?.celebrateThird === true

  useEffect(() => {
    if (!user) return
    supabase
      .from('reports')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setNotFound(true); setLoading(false); return }
        setReport(data)
        setLoading(false)
      })
  }, [id, user])

  async function handleChartConfigChange(index, newConfig) {
    const current = getChartConfigs(report)
    const updated = current.map((c, i) => i === index ? { ...c, ...newConfig } : c)
    setReport(r => ({ ...r, chart_config: updated }))
    await supabase.from('reports').update({ chart_config: updated }).eq('id', id)
  }

  async function handleTitleSave(newTitle) {
    if (!newTitle.trim() || newTitle === report.title) return
    setReport(r => ({ ...r, title: newTitle }))
    await supabase.from('reports').update({ title: newTitle.trim() }).eq('id', id)
  }

  if (loading) return <LoadingView />
  if (notFound) return <NotFoundView />

  const chartConfigs = getChartConfigs(report)

  return (
    <div className="flex flex-col flex-1">
      <TrialStatusBar />

      {celebrateThird && (
        <ThirdReportBanner onClose={() => navigate(location.pathname, { replace: true, state: {} })} />
      )}

      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
        <Header
          report={report}
          onTitleSave={handleTitleSave}
          actions={
            <div className="flex items-start gap-2 flex-wrap">
              <PdfExportButton
                contentRef={pdfRef}
                reportTitle={report.title}
                plan={profile?.plan}
              />
              <ShareButton
                report={report}
                profile={profile}
                onUpdate={setReport}
              />
            </div>
          }
        />

        <div ref={pdfRef} className="flex flex-col gap-6">
          <MetricSummary rows={report.raw_data} colConfig={report.column_config} />

          <ChartCard
            report={report}
            config={chartConfigs[0]}
            onChange={c => handleChartConfigChange(0, c)}
            large
          />

          <div className="pdf-small-grid grid grid-cols-1 sm:grid-cols-3 gap-4">
            {chartConfigs.slice(1).map((cfg, i) => (
              <ChartCard
                key={i}
                report={report}
                config={cfg}
                onChange={c => handleChartConfigChange(i + 1, c)}
              />
            ))}
          </div>

          <AIInsightCard />
          <PdfSummaryStats report={report} />
        </div>
      </div>
    </div>
  )
}

// ─── Chart card ───────────────────────────────────────────────────────────────

const SELECT_CLS = 'text-xs text-navy border border-mint rounded-pill px-2.5 py-1 bg-white outline-none focus:border-teal transition-colors cursor-pointer'

function ChartCard({ report, config, onChange, large = false }) {
  const headers     = report.column_config?.headers ?? []
  const colTypes    = report.column_config?.columnTypes ?? {}
  const numCols     = headers.filter(h => colTypes[h] === 'number')
  const yAxisSingle = config.yAxis?.[0] ?? ''

  return (
    <div className="bg-white border border-mint rounded-card shadow-card p-4 sm:p-5 flex flex-col gap-4">
      <div className="pdf-hide flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-subtle">x:</span>
          <select
            value={config.xAxis}
            onChange={e => onChange({ ...config, xAxis: e.target.value })}
            className={SELECT_CLS}
          >
            {headers.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
          <span className="text-xs text-subtle">y:</span>
          <select
            value={yAxisSingle}
            onChange={e => onChange({ ...config, yAxis: [e.target.value] })}
            className={SELECT_CLS}
          >
            {(numCols.length > 0 ? numCols : headers).map(h => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </div>
        <ChartTypeSelector current={config.type} onChange={type => onChange({ ...config, type })} />
      </div>
      <DashboardChart
        chartType={config.type}
        report={report}
        colConfig={config}
        height={large ? 320 : 200}
      />
    </div>
  )
}

// ─── Header with inline title edit ───────────────────────────────────────────

function Header({ report, onTitleSave, actions }) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(report.title)
  const inputRef = useRef(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  function commit() {
    setEditing(false)
    onTitleSave(draft)
  }

  function onKeyDown(e) {
    if (e.key === 'Enter')  commit()
    if (e.key === 'Escape') { setDraft(report.title); setEditing(false) }
  }

  const created = new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const rows    = report.raw_data?.length ?? 0
  const cols    = report.column_config?.headers?.length ?? 0

  return (
    <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div className="flex flex-col gap-2 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link to="/dashboard" className="text-sm text-subtle hover:text-navy transition-colors flex items-center gap-1">
            <BackArrow /> Reports
          </Link>
        </div>

        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={onKeyDown}
            maxLength={80}
            className="text-2xl font-medium text-navy bg-transparent border-b-2 border-teal outline-none w-full"
            style={{ letterSpacing: '-0.2px' }}
          />
        ) : (
          <button
            onClick={() => { setDraft(report.title); setEditing(true) }}
            className="text-left text-2xl font-medium text-navy hover:text-teal transition-colors group flex items-center gap-2"
            style={{ letterSpacing: '-0.2px' }}
          >
            {report.title}
            <PencilIcon />
          </button>
        )}

        <div className="flex flex-wrap items-center gap-2 text-xs text-subtle">
          <span className="bg-mint border border-teal-light text-ai-text px-2 py-0.5 rounded-pill capitalize">
            {report.data_source}
          </span>
          <span>{rows.toLocaleString()} rows · {cols} columns</span>
          <span>Created {created}</span>
        </div>
      </div>

      {actions && (
        <div className="flex-shrink-0">{actions}</div>
      )}
    </header>
  )
}

// ─── Third-report upgrade nudge ───────────────────────────────────────────────

function ThirdReportBanner({ onClose }) {
  return (
    <div className="w-full bg-amber-50 border-b border-amber-200 px-4 py-3">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 text-sm text-amber-800">
          <span className="font-medium">You've created all 3 trial reports!</span>
          {' '}Upgrade to Solo for unlimited reports, all chart types, and full AI insights.
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/upgrade"
            className="text-xs text-white bg-teal px-4 py-2 rounded-pill hover:bg-opacity-90 transition-colors font-medium whitespace-nowrap"
          >
            Upgrade now
          </Link>
          <button onClick={onClose} className="text-amber-600 hover:text-amber-800"><XIcon /></button>
        </div>
      </div>
    </div>
  )
}

// ─── Loading / not-found states ───────────────────────────────────────────────

function LoadingView() {
  return (
    <div className="flex-1 flex flex-col">
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2 flex-1">
            <div className="h-4 w-24 bg-mint rounded-pill animate-pulse" />
            <div className="h-8 w-64 bg-mint rounded-pill animate-pulse" />
            <div className="h-4 w-48 bg-mint rounded-pill animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="h-11 w-28 bg-mint rounded-pill animate-pulse" />
            <div className="h-11 w-24 bg-mint rounded-pill animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-mint rounded-card animate-pulse" />)}
        </div>
        <div className="h-96 bg-mint rounded-card animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-52 bg-mint rounded-card animate-pulse" />)}
        </div>
      </div>
    </div>
  )
}

function NotFoundView() {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-24 text-center"
      style={{ background: 'linear-gradient(135deg, #E1F5EE 0%, #E6F1FB 100%)' }}>
      <div className="flex flex-col items-center gap-4 max-w-sm">
        <div className="text-5xl font-medium text-teal-light" style={{ letterSpacing: '-0.2px' }}>404</div>
        <h1 className="text-xl font-medium text-navy" style={{ letterSpacing: '-0.2px' }}>Report not found</h1>
        <p className="text-sm text-subtle">This report may have been deleted or you may not have access to it.</p>
        <Link
          to="/dashboard"
          className="text-sm text-white bg-teal px-6 py-3 rounded-pill hover:bg-opacity-90 transition-colors font-medium min-h-[44px] flex items-center"
        >
          Back to reports
        </Link>
      </div>
    </div>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function BackArrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="opacity-0 group-hover:opacity-60 transition-opacity flex-shrink-0">
      <path d="M9.5 2.5l2 2-7 7H2.5v-2l7-7z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}
