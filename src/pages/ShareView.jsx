import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import DashboardChart from '../components/DashboardChart'
import MetricSummary from '../components/MetricSummary'

function getChartConfigs(report) {
  const cfg    = report.chart_config
  const colCfg = report.column_config
  if (Array.isArray(cfg) && cfg.length > 0) return cfg.slice(0, 4)
  return [{
    type:  cfg?.type  ?? 'bar',
    xAxis: colCfg?.xAxis ?? '',
    yAxis: colCfg?.yAxis ?? [],
    series: colCfg?.series ?? '',
  }]
}

export default function ShareView() {
  const { token } = useParams()
  const [report,   setReport]   = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    supabase
      .from('reports')
      .select('id, title, data_source, raw_data, column_config, chart_config, ai_summary, created_at')
      .eq('share_token', token)
      .eq('is_shared', true)
      .is('deleted_at', null)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setNotFound(true); setLoading(false); return }
        setReport(data)
        setLoading(false)
      })
  }, [token])

  if (loading) return <LoadingView />
  if (notFound) return <NotFoundView />

  const whiteLabel   = report.column_config?.shareSettings?.whiteLabel ?? false
  const chartConfigs = getChartConfigs(report)
  const created      = new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const rows         = report.raw_data?.length ?? 0
  const cols         = report.column_config?.headers?.length ?? 0

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="sticky top-0 z-10 bg-white border-b border-mint">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          {whiteLabel ? (
            <div />
          ) : (
            <Link to="/" className="flex items-center gap-1.5 flex-shrink-0">
              <HexLogo />
              <span className="text-sm" style={{ letterSpacing: '-0.2px' }}>
                <span className="font-medium" style={{ color: '#185FA5' }}>Dash</span>
                <span style={{ color: '#1D9E75' }}>Plot</span>
              </span>
            </Link>
          )}
          <Link
            to="/signup"
            className="text-xs text-white bg-teal px-4 py-2 rounded-pill hover:bg-opacity-90 transition-colors font-medium min-h-[36px] flex items-center"
          >
            Try DashPlot free
          </Link>
        </div>
      </header>

      <main className="flex-1" style={{ background: 'linear-gradient(135deg, #E1F5EE 0%, #E6F1FB 100%)' }}>
        <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-medium text-navy" style={{ letterSpacing: '-0.2px' }}>
              {report.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-subtle">
              <span className="bg-white border border-teal-light px-2 py-0.5 rounded-pill capitalize" style={{ color: '#085041' }}>
                {report.data_source}
              </span>
              <span>{rows.toLocaleString()} rows · {cols} columns</span>
              <span>Created {created}</span>
            </div>
          </div>

          <MetricSummary rows={report.raw_data} colConfig={report.column_config} />

          <div className="bg-white border border-mint rounded-card shadow-card p-4 sm:p-5">
            <DashboardChart
              chartType={chartConfigs[0]?.type ?? 'bar'}
              report={report}
              colConfig={chartConfigs[0]}
              height={320}
            />
          </div>

          {chartConfigs.length > 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {chartConfigs.slice(1).map((cfg, i) => (
                <div key={i} className="bg-white border border-mint rounded-card shadow-card p-4">
                  <DashboardChart
                    chartType={cfg.type ?? 'bar'}
                    report={report}
                    colConfig={cfg}
                    height={200}
                  />
                </div>
              ))}
            </div>
          )}

          {!whiteLabel && (
            <div className="flex justify-center pt-2">
              <Link
                to="/"
                className="text-xs text-subtle hover:text-navy transition-colors flex items-center gap-1"
              >
                Made with{' '}
                <span className="font-medium" style={{ color: '#185FA5' }}>Dash</span>
                <span style={{ color: '#1D9E75' }}>Plot</span>
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function LoadingView() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="h-14 bg-white border-b border-mint" />
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
        <div className="h-7 w-56 bg-mint rounded-pill animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-mint rounded-card animate-pulse" />)}
        </div>
        <div className="h-80 bg-mint rounded-card animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-52 bg-mint rounded-card animate-pulse" />)}
        </div>
      </div>
    </div>
  )
}

function NotFoundView() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-24 text-center"
      style={{ background: 'linear-gradient(135deg, #E1F5EE 0%, #E6F1FB 100%)' }}>
      <div className="flex flex-col items-center gap-5 max-w-sm">
        <HexLogo size={48} />
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-medium text-navy" style={{ letterSpacing: '-0.2px' }}>
            Report not found
          </h1>
          <p className="text-sm text-subtle">
            This report may have been unshared or deleted by its owner.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <Link
            to="/signup"
            className="text-sm text-white bg-teal px-6 py-3 rounded-pill hover:bg-opacity-90 transition-colors font-medium min-h-[44px] flex items-center justify-center"
          >
            Try DashPlot free
          </Link>
          <Link
            to="/"
            className="text-sm border border-teal-light bg-white px-6 py-3 rounded-pill hover:bg-mint transition-colors min-h-[44px] flex items-center justify-center"
            style={{ color: '#0F6E56' }}
          >
            Learn more
          </Link>
        </div>
      </div>
    </div>
  )
}

function HexLogo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path d="M16 2L28 9v14L16 30 4 23V9L16 2z" fill="url(#hg)" />
      <defs>
        <linearGradient id="hg" x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1D9E75" />
          <stop offset="1" stopColor="#185FA5" />
        </linearGradient>
      </defs>
      <path d="M8 17l4-5 3 3 4-6 5 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24" cy="12" r="2" fill="#EF9F27" />
    </svg>
  )
}
