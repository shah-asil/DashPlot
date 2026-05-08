import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import posthog from '../lib/posthog'

export default function PdfExportButton({ contentRef, reportTitle, plan }) {
  const [exporting,    setExporting]    = useState(false)
  const [exportError,  setExportError]  = useState('')

  const canExport = plan === 'pro' || plan === 'agency'

  useEffect(() => {
    if (!canExport) posthog.capture('upgrade_prompt_seen', { gate_type: 'pdf' })
  }, [])

  async function handleExport() {
    if (!contentRef?.current) return
    setExporting(true)
    document.body.classList.add('pdf-export-mode')
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])

      // Wait for CSS layout changes (grid collapse, control hiding) and
      // Recharts ResizeObserver to re-render charts at new widths.
      await new Promise(r => setTimeout(r, 2000))

      const pdf    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const margin = 12
      const pageW  = pdf.internal.pageSize.getWidth()
      const pageH  = pdf.internal.pageSize.getHeight()
      const usable = pageH - margin * 2

      // Hide stats during main capture so it doesn't appear mid-page
      const statsEl = contentRef.current.querySelector('.pdf-stats-show')
      if (statsEl) statsEl.style.setProperty('display', 'none', 'important')

      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        scrollX: 0,
        scrollY: 0,
      })

      const imgW = pageW - margin * 2
      const imgH = (canvas.height / canvas.width) * imgW

      let page = 0
      while (page * usable < imgH) {
        if (page > 0) pdf.addPage()
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, margin - page * usable, imgW, imgH)
        page++
      }

      // Restore stats and capture on its own clean page
      if (statsEl) {
        statsEl.style.removeProperty('display')
        const statsCanvas = await html2canvas(statsEl, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          scrollX: 0,
          scrollY: 0,
        })
        const sW = pageW - margin * 2
        const sH = (statsCanvas.height / statsCanvas.width) * sW
        pdf.addPage()
        pdf.addImage(statsCanvas.toDataURL('image/png'), 'PNG', margin, margin, sW, sH)
      }

      const safeName = (reportTitle ?? 'report').replace(/[^a-z0-9\s-]/gi, '').trim() || 'report'
      pdf.save(`${safeName}.pdf`)
    } catch (err) {
      console.error('[DashPlot] PDF export failed:', err.message)
      setExportError('Export failed. Please try again.')
      setTimeout(() => setExportError(''), 5000)
    } finally {
      document.body.classList.remove('pdf-export-mode')
      setExporting(false)
    }
  }

  if (!canExport) {
    return (
      <div className="flex flex-col gap-1">
        <button
          disabled
          className="text-sm border border-mint text-subtle rounded-pill px-4 py-2 flex items-center gap-2 min-h-[44px] cursor-not-allowed opacity-60"
        >
          <LockIcon />
          Export PDF
        </button>
        <p className="text-xs text-subtle px-1">
          PDF requires Pro.{' '}
          <Link
            to="/upgrade"
            onClick={() => posthog.capture('upgrade_clicked', { gate_type: 'pdf', plan_shown: 'pro' })}
            className="text-teal hover:underline"
          >
            Upgrade →
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleExport}
        disabled={exporting}
        className="text-sm border border-teal-light rounded-pill px-4 py-2 flex items-center gap-2 min-h-[44px] hover:bg-mint transition-colors disabled:opacity-60"
        style={{ color: '#0F6E56' }}
      >
        <DownloadIcon />
        {exporting ? 'Exporting…' : 'Export PDF'}
      </button>
      {exportError && (
        <p className="text-xs px-1" style={{ color: '#E24B4A' }}>{exportError}</p>
      )}
    </div>
  )
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 2v7M4 6.5l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 11h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="2" y="6" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4.5 6V4a2.5 2.5 0 015 0v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}
