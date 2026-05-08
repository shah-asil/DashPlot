import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import posthog from '../lib/posthog'
import { generateReportInsight } from '../lib/generateInsight'

export default function AIInsightCard({ report, plan }) {
  const [summary,    setSummary]    = useState(report?.ai_summary ?? '')
  const [generating, setGenerating] = useState(false)
  const [error,      setError]      = useState('')
  const promptSeenRef = useRef(false)

  const isTrial = !plan || plan === 'trial'

  // Split into sentences — trial users see only the first, rest is blurred
  const sentences     = summary ? (summary.match(/[^.!?]+[.!?]+\s*/g) ?? [summary]) : []
  const firstSentence = sentences[0]?.trim() ?? ''
  const rest          = sentences.slice(1).join(' ').trim()

  // Fire upgrade_prompt_seen once when a trial user encounters the blur gate
  useEffect(() => {
    if (isTrial && summary && rest && !promptSeenRef.current) {
      posthog.capture('upgrade_prompt_seen', { gate_type: 'ai' })
      promptSeenRef.current = true
    }
  }, [isTrial, summary, rest])

  async function handleGenerate() {
    if (!report) return
    setGenerating(true)
    setError('')
    try {
      const text = await generateReportInsight(report)
      setSummary(text)
    } catch (err) {
      console.error('[DashPlot] AI insight generation failed:', err.message)
      setError('Could not generate insight. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div
      className="rounded-card border p-5 flex flex-col gap-3"
      style={{ background: '#E1F5EE', borderColor: '#9FE1CB' }}
    >
      <div className="flex items-center gap-2">
        <SparkleIcon />
        <span className="text-xs font-medium" style={{ color: '#085041' }}>AI Insight</span>
      </div>

      {!summary ? (
        <>
          <p className="text-sm" style={{ color: '#085041' }}>
            Generate an AI-written narrative summary of the trends, peaks, and anomalies in your data.
          </p>
          {error && <p className="text-xs" style={{ color: '#E24B4A' }}>{error}</p>}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="self-start text-sm text-white bg-teal px-4 py-2 rounded-pill hover:bg-opacity-90 transition-colors font-medium min-h-[40px] disabled:opacity-60 flex items-center gap-2"
          >
            {generating && <Spinner />}
            {generating ? 'Analysing data…' : 'Generate AI insight'}
          </button>
        </>
      ) : (
        <>
          <p className="text-sm leading-relaxed" style={{ color: '#085041' }}>
            {firstSentence}
            {rest && (
              isTrial ? (
                <span
                  className="ml-1 select-none pointer-events-none"
                  style={{ filter: 'blur(5px)', color: '#085041' }}
                  aria-hidden="true"
                >
                  {rest}
                </span>
              ) : (
                <span> {rest}</span>
              )
            )}
          </p>

          {isTrial && rest && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <Link
                to="/upgrade"
                onClick={() => posthog.capture('upgrade_clicked', { gate_type: 'ai', plan_shown: 'solo' })}
                className="self-start text-xs text-white bg-teal px-4 py-2 rounded-pill hover:bg-opacity-90 transition-colors font-medium min-h-[36px] flex items-center"
              >
                Read full insight →
              </Link>
              <span className="text-xs" style={{ color: '#1D9E75' }}>Available on Solo and above</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Spinner() {
  return (
    <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin flex-shrink-0" />
  )
}

function SparkleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 1v3M8 12v3M1 8h3M12 8h3M3.05 3.05l2.12 2.12M10.83 10.83l2.12 2.12M3.05 12.95l2.12-2.12M10.83 5.17l2.12-2.12" stroke="#1D9E75" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="8" cy="8" r="2" fill="#1D9E75" />
    </svg>
  )
}
