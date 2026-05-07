import { useState, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { callWithRetry } from '../lib/utils'
import { validateFile, parseFile, suggestColumnConfig, suggestChartConfigs, deriveTitle } from '../lib/parseFile'
import TrialStatusBar from '../components/TrialStatusBar'

const STEPS = ['Upload', 'Preview', 'Configure']

const PROGRESS_MSGS = [
  'Saving your report…',
  'Analysing your data…',
  'Generating AI insight…',
  'Almost ready…',
]

// ─── Root page ───────────────────────────────────────────────────────────────

export default function DashboardNew() {
  const { user, profile, fetchProfile } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(0)
  const [file, setFile] = useState(null)
  const [parsed, setParsed] = useState(null)
  const [columnConfig, setColumnConfig] = useState({ xAxis: '', yAxis: [], series: '' })
  const [chartConfigs, setChartConfigs] = useState([])
  const [reportTitle, setReportTitle] = useState('')
  const [mobileOk, setMobileOk] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [progressIdx, setProgressIdx] = useState(0)

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  const trialReportsUsed = profile?.trial_reports_used ?? 0
  const atTrialLimit = profile?.plan === 'trial' && trialReportsUsed >= 3

  if (atTrialLimit) return <TrialLimitGate />

  if (isMobile && !mobileOk) {
    return <MobileNotice onContinue={() => setMobileOk(true)} />
  }

  async function handleFileParsed(f, result) {
    setFile(f)
    setParsed(result)
    setReportTitle(deriveTitle(f.name))
    const suggested = suggestColumnConfig(result.headers, result.columnTypes)
    setColumnConfig(suggested)
    setChartConfigs(suggestChartConfigs(result.headers, result.columnTypes))
    setStep(1)
  }

  async function handleSave() {
    if (!columnConfig.xAxis || columnConfig.yAxis.length === 0) {
      setSaveError('Select at least one X axis column and one Y axis column.')
      return
    }

    setSaving(true)
    setSaveError('')
    setProgressIdx(0)

    const timer = setInterval(() => {
      setProgressIdx(i => Math.min(i + 1, PROGRESS_MSGS.length - 1))
    }, 3000)

    const result = await callWithRetry(
      () => supabase
        .from('reports')
        .insert({
          user_id: user.id,
          title: reportTitle.trim() || 'My Report',
          data_source: parsed.source,
          raw_data: parsed.rows,
          column_config: {
            headers: parsed.headers,
            xAxis: columnConfig.xAxis,
            yAxis: columnConfig.yAxis,
            series: columnConfig.series,
            columnTypes: parsed.columnTypes,
            rowCount: parsed.rowCount,
          },
          chart_config: chartConfigs.map((c, i) =>
            i === 0
              ? { ...c, xAxis: columnConfig.xAxis, yAxis: columnConfig.yAxis, series: columnConfig.series }
              : c
          ),
          is_shared: false,
        })
        .select()
        .single()
        .then(r => { if (r.error) throw r.error; return r.data }),
      'Could not save your report. Please try again.'
    )

    if (!result.success) {
      clearInterval(timer)
      setSaveError(result.userMessage)
      setSaving(false)
      return
    }

    if (profile?.plan === 'trial') {
      await supabase
        .from('users')
        .update({ trial_reports_used: trialReportsUsed + 1 })
        .eq('id', user.id)
      await fetchProfile(user.id)
    }

    clearInterval(timer)
    const isThirdReport = profile?.plan === 'trial' && trialReportsUsed + 1 === 3
    navigate(`/dashboard/${result.data.id}`, {
      state: { celebrateThird: isThirdReport },
    })
  }

  return (
    <div className="flex flex-col flex-1">
      <TrialStatusBar />

      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="text-sm text-subtle hover:text-navy transition-colors flex items-center gap-1">
            <BackArrow /> Dashboard
          </Link>
          <span className="text-subtle">/</span>
          <span className="text-sm text-navy">New report</span>
        </div>

        <StepBar current={step} />

        {step === 0 && <UploadStep onParsed={handleFileParsed} />}
        {step === 1 && parsed && (
          <PreviewStep
            parsed={parsed}
            filename={file?.name}
            onContinue={() => setStep(2)}
            onReset={() => { setStep(0); setFile(null); setParsed(null) }}
          />
        )}
        {step === 2 && parsed && (
          <ColumnStep
            parsed={parsed}
            columnConfig={columnConfig}
            setColumnConfig={setColumnConfig}
            reportTitle={reportTitle}
            setReportTitle={setReportTitle}
            onBack={() => setStep(1)}
            onSave={handleSave}
            saving={saving}
            progressMsg={PROGRESS_MSGS[progressIdx]}
            error={saveError}
          />
        )}
      </div>
    </div>
  )
}

// ─── Step progress bar ────────────────────────────────────────────────────────

function StepBar({ current }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors
              ${i < current ? 'bg-teal text-white' : i === current ? 'bg-teal text-white' : 'bg-mint text-subtle'}`}>
              {i < current ? <CheckMini /> : i + 1}
            </div>
            <span className={`text-sm hidden sm:block ${i === current ? 'text-navy font-medium' : 'text-subtle'}`}>{label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`h-px w-8 sm:w-12 ${i < current ? 'bg-teal' : 'bg-mint'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Step 1: Upload ───────────────────────────────────────────────────────────

function UploadStep({ onParsed }) {
  const [dragging, setDragging] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  const handleFile = useCallback(async file => {
    setError('')
    const validationError = validateFile(file)
    if (validationError) { setError(validationError); return }

    setParsing(true)
    try {
      const result = await parseFile(file)
      onParsed(file, result)
    } catch (err) {
      setError(err.message)
    } finally {
      setParsing(false)
    }
  }, [onParsed])

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  function onInputChange(e) {
    const f = e.target.files[0]
    if (f) handleFile(f)
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-medium text-navy" style={{ letterSpacing: '-0.2px' }}>Upload your data</h1>
        <p className="text-sm text-subtle mt-1">
          CSV or Excel file · Max 10 MB ·{' '}
          <Link to="/guide" className="text-teal hover:underline">File prep guide</Link>
        </p>
      </div>

      <button
        type="button"
        onClick={() => !parsing && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        disabled={parsing}
        className={`w-full border-2 border-dashed rounded-card py-16 px-6 flex flex-col items-center gap-4 transition-colors cursor-pointer
          ${dragging ? 'border-teal bg-mint' : 'border-teal-light bg-mint hover:border-teal hover:bg-mint'}`}
      >
        {parsing ? (
          <>
            <div className="w-8 h-8 rounded-full border-2 border-teal-light border-t-teal animate-spin" />
            <span className="text-sm text-subtle">Parsing your file…</span>
          </>
        ) : (
          <>
            <UploadIcon />
            <div className="text-center">
              <p className="text-sm font-medium text-navy">Drag and drop your file here</p>
              <p className="text-sm text-subtle mt-1">or click to browse</p>
            </div>
            <span className="text-xs text-subtle bg-white border border-mint px-3 py-1 rounded-pill">
              .csv · .xlsx · .xls
            </span>
          </>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={onInputChange}
      />

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-card px-4 py-3">
          <ErrorIcon />
          <div className="text-sm text-error">{error}</div>
        </div>
      )}
    </div>
  )
}

// ─── Step 2: Preview ──────────────────────────────────────────────────────────

function PreviewStep({ parsed, filename, onContinue, onReset }) {
  const { rows, headers, issues, rowCount } = parsed
  const preview = rows.slice(0, 10)
  const hasErrors = issues.some(i => i.type === 'error')

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-medium text-navy" style={{ letterSpacing: '-0.2px' }}>Does this look right?</h1>
        <p className="text-sm text-subtle mt-1">
          <span className="font-medium text-navy">{filename}</span>
          {' · '}{rowCount.toLocaleString()} row{rowCount !== 1 ? 's' : ''}
          {' · '}{headers.length} column{headers.length !== 1 ? 's' : ''}
        </p>
      </div>

      {issues.length > 0 && (
        <div className="flex flex-col gap-2">
          {issues.map((issue, i) => (
            <IssueRow key={i} issue={issue} />
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-card border border-mint">
        <table className="w-full text-left text-xs">
          <thead className="bg-mint">
            <tr>
              {headers.map(h => (
                <th key={h} className="px-3 py-2.5 font-medium text-navy whitespace-nowrap">
                  {h}
                  <span className="ml-1.5 font-normal text-subtle opacity-70">{parsed.columnTypes[h]}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-mint bg-opacity-30'}>
                {headers.map(h => (
                  <td key={h} className="px-3 py-2 text-subtle whitespace-nowrap max-w-xs truncate">
                    {row[h] === null ? <span className="text-subtle opacity-40 italic">—</span> : String(row[h])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rowCount > 10 && (
          <div className="px-3 py-2 bg-mint border-t border-mint text-xs text-subtle">
            Showing first 10 of {rowCount.toLocaleString()} rows
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onContinue}
          disabled={hasErrors}
          className="text-sm text-white bg-teal px-8 py-3 rounded-pill hover:bg-opacity-90 transition-colors font-medium min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Looks good — continue
        </button>
        <button
          onClick={onReset}
          className="text-sm border border-teal-light bg-mint px-6 py-3 rounded-pill hover:bg-teal-light transition-colors min-h-[44px]"
          style={{ color: '#0F6E56' }}
        >
          Upload different file
        </button>
      </div>

      {hasErrors && (
        <p className="text-xs text-error">Fix the errors above before continuing. See the <Link to="/guide" className="underline">file prep guide</Link> for help.</p>
      )}
    </div>
  )
}

function IssueRow({ issue }) {
  const styles = {
    error: 'bg-red-50 border-red-200 text-error',
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
    info: 'bg-mint border-teal-light text-ai-text',
  }
  const icons = { error: <ErrorIcon />, warning: <WarnIcon />, info: <InfoIcon /> }

  return (
    <div className={`flex items-start gap-2 border rounded-card px-4 py-3 text-sm ${styles[issue.type]}`}>
      <span className="flex-shrink-0 mt-0.5">{icons[issue.type]}</span>
      <span>{issue.msg}</span>
    </div>
  )
}

// ─── Step 3: Column selector ──────────────────────────────────────────────────

function ColumnStep({ parsed, columnConfig, setColumnConfig, reportTitle, setReportTitle, onBack, onSave, saving, progressMsg, error }) {
  const { headers, columnTypes } = parsed
  const numericCols = headers.filter(h => columnTypes[h] === 'number')
  const categoryCols = headers.filter(h => columnTypes[h] === 'string' || columnTypes[h] === 'date')

  function toggleYAxis(col) {
    setColumnConfig(prev => ({
      ...prev,
      yAxis: prev.yAxis.includes(col)
        ? prev.yAxis.filter(c => c !== col)
        : [...prev.yAxis, col],
    }))
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-medium text-navy" style={{ letterSpacing: '-0.2px' }}>Configure your chart</h1>
        <p className="text-sm text-subtle mt-1">Choose which columns to display. You can change this later.</p>
      </div>

      <div className="bg-white border border-mint rounded-card shadow-card p-5 sm:p-6 flex flex-col gap-5">
        <Field label="Report title">
          <input
            type="text"
            value={reportTitle}
            onChange={e => setReportTitle(e.target.value)}
            maxLength={80}
            className="w-full px-4 py-3 text-sm border border-mint rounded-pill outline-none focus:border-teal focus:ring-1 focus:ring-teal transition-colors"
          />
        </Field>

        <Field label="X axis" hint="Usually a date or category column">
          <select
            value={columnConfig.xAxis}
            onChange={e => setColumnConfig(p => ({ ...p, xAxis: e.target.value }))}
            className="w-full px-4 py-3 text-sm border border-mint rounded-pill outline-none focus:border-teal focus:ring-1 focus:ring-teal bg-white transition-colors"
          >
            <option value="">— Select column —</option>
            {headers.map(h => (
              <option key={h} value={h}>{h} ({columnTypes[h]})</option>
            ))}
          </select>
        </Field>

        <Field label="Y axis" hint="Select one or more numeric columns to plot">
          {numericCols.length === 0 ? (
            <p className="text-sm text-error">No numeric columns detected. Check your data in the preview step.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {numericCols.map(col => (
                <button
                  key={col}
                  type="button"
                  onClick={() => toggleYAxis(col)}
                  className={`px-4 py-2 rounded-pill text-sm border transition-colors min-h-[44px]
                    ${columnConfig.yAxis.includes(col)
                      ? 'bg-teal text-white border-teal'
                      : 'bg-white text-navy border-mint hover:border-teal hover:bg-mint'}`}
                >
                  {col}
                </button>
              ))}
            </div>
          )}
        </Field>

        <Field label="Group by (series)" hint="Optional — splits the chart by a category">
          <select
            value={columnConfig.series}
            onChange={e => setColumnConfig(p => ({ ...p, series: e.target.value }))}
            className="w-full px-4 py-3 text-sm border border-mint rounded-pill outline-none focus:border-teal focus:ring-1 focus:ring-teal bg-white transition-colors"
          >
            <option value="">— None —</option>
            {categoryCols.filter(h => h !== columnConfig.xAxis).map(h => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </Field>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-card px-4 py-3 text-sm text-error">
          <ErrorIcon />
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onSave}
          disabled={saving || !columnConfig.xAxis || columnConfig.yAxis.length === 0}
          className="text-sm text-white bg-teal px-8 py-3 rounded-pill hover:bg-opacity-90 transition-colors font-medium min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin flex-shrink-0" />
              {progressMsg}
            </>
          ) : 'Generate dashboard'}
        </button>
        <button
          onClick={onBack}
          disabled={saving}
          className="text-sm border border-teal-light bg-mint px-6 py-3 rounded-pill hover:bg-teal-light transition-colors min-h-[44px]"
          style={{ color: '#0F6E56' }}
        >
          ← Back to preview
        </button>
      </div>
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div>
        <label className="text-sm font-medium text-navy">{label}</label>
        {hint && <p className="text-xs text-subtle mt-0.5">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

// ─── Gate + Notice screens ────────────────────────────────────────────────────

function TrialLimitGate() {
  return (
    <div className="flex flex-col flex-1">
      <TrialStatusBar />
      <div className="flex-1 flex items-center justify-center px-4 py-24 text-center"
        style={{ background: 'linear-gradient(135deg, #E1F5EE 0%, #E6F1FB 100%)' }}>
        <div className="flex flex-col items-center gap-4 max-w-sm">
          <div className="w-12 h-12 rounded-card bg-white border border-mint flex items-center justify-center text-teal">
            <LockIcon />
          </div>
          <h2 className="text-xl font-medium text-navy" style={{ letterSpacing: '-0.2px' }}>You've used all 3 trial reports</h2>
          <p className="text-sm text-subtle">Upgrade to Solo or above for unlimited reports, more chart types, and full AI insights.</p>
          <Link
            to="/upgrade"
            className="text-sm text-white bg-teal px-8 py-3 rounded-pill hover:bg-opacity-90 transition-colors font-medium min-h-[44px] flex items-center"
          >
            Unlock reporting →
          </Link>
          <Link to="/dashboard" className="text-xs text-subtle hover:text-navy">Back to dashboard</Link>
        </div>
      </div>
    </div>
  )
}

function MobileNotice({ onContinue }) {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-24 text-center"
      style={{ background: 'linear-gradient(135deg, #E1F5EE 0%, #E6F1FB 100%)' }}>
      <div className="bg-white rounded-card border border-mint shadow-card p-6 max-w-sm flex flex-col items-center gap-4">
        <div className="text-3xl">💻</div>
        <h2 className="text-lg font-medium text-navy" style={{ letterSpacing: '-0.2px' }}>Better on desktop</h2>
        <p className="text-sm text-subtle text-center">
          The dashboard creator works best on a larger screen so you can see your data clearly. You can still continue on mobile.
        </p>
        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={onContinue}
            className="w-full text-sm text-white bg-teal px-6 py-3 rounded-pill hover:bg-opacity-90 transition-colors font-medium min-h-[44px]"
          >
            Continue anyway
          </button>
          <Link
            to="/dashboard"
            className="w-full text-center text-sm border border-teal-light bg-mint px-6 py-3 rounded-pill min-h-[44px] flex items-center justify-center"
            style={{ color: '#0F6E56' }}
          >
            Go back
          </Link>
        </div>
      </div>
    </div>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function UploadIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="20" fill="#E1F5EE" />
      <path d="M20 26V16M15 20l5-5 5 5" stroke="#1D9E75" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 28h14" stroke="#1D9E75" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function BackArrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CheckMini() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ErrorIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 text-error">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M8 5v4M8 10.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function WarnIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 text-amber-600">
      <path d="M8 2L14.5 13.5H1.5L8 2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M8 7v3M8 11.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 text-ai-text">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M8 7v4M8 5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="4" y="9" width="12" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 9V6a3 3 0 016 0v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
