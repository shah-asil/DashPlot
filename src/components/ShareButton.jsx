import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ShareButton({ report, profile, onUpdate }) {
  const [open, setOpen]       = useState(false)
  const [copying, setCopying] = useState(false)
  const [saving, setSaving]   = useState(false)
  const panelRef = useRef(null)

  const plan          = profile?.plan ?? 'trial'
  const canShare      = plan !== 'trial'
  const canWhiteLabel = plan === 'pro' || plan === 'agency'

  const isShared   = report.is_shared ?? false
  const shareToken = report.share_token
  const shareUrl   = isShared && shareToken
    ? `${window.location.origin}/share/${shareToken}`
    : null
  const whiteLabel = report.column_config?.shareSettings?.whiteLabel ?? false

  useEffect(() => {
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  async function toggleSharing() {
    setSaving(true)
    if (isShared) {
      const { error } = await supabase.from('reports').update({ is_shared: false }).eq('id', report.id)
      if (!error) onUpdate(r => ({ ...r, is_shared: false }))
    } else {
      const token = shareToken ?? crypto.randomUUID()
      const { error } = await supabase
        .from('reports')
        .update({ is_shared: true, share_token: token })
        .eq('id', report.id)
      if (!error) onUpdate(r => ({ ...r, is_shared: true, share_token: token }))
    }
    setSaving(false)
  }

  async function toggleWhiteLabel() {
    const newValue = !whiteLabel
    const newColConfig = {
      ...report.column_config,
      shareSettings: { ...(report.column_config?.shareSettings ?? {}), whiteLabel: newValue },
    }
    const { error } = await supabase
      .from('reports')
      .update({ column_config: newColConfig })
      .eq('id', report.id)
    if (!error) onUpdate(r => ({ ...r, column_config: newColConfig }))
  }

  async function copyLink() {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopying(true)
    setTimeout(() => setCopying(false), 2000)
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className="text-sm border border-teal-light bg-mint rounded-pill px-4 py-2 flex items-center gap-2 min-h-[44px] hover:bg-teal-light transition-colors font-medium"
        style={{ color: '#0F6E56' }}
      >
        <ShareIcon />
        Share
        {isShared && <span className="w-2 h-2 rounded-full bg-teal flex-shrink-0" />}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-30 w-72 bg-white border border-mint rounded-card shadow-card p-4 flex flex-col gap-3">
          {!canShare ? (
            <>
              <div className="flex items-center gap-2">
                <LockIcon />
                <span className="text-sm font-medium text-navy">Share report</span>
              </div>
              <p className="text-xs text-subtle">Sharing is available on Solo plan and above.</p>
              <Link
                to="/upgrade"
                onClick={() => setOpen(false)}
                className="self-start text-xs text-white bg-teal px-4 py-2 rounded-pill hover:bg-opacity-90 transition-colors font-medium min-h-[36px] flex items-center"
              >
                Unlock sharing →
              </Link>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-navy">Shareable link</span>
                <button
                  onClick={toggleSharing}
                  disabled={saving}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
                    isShared ? 'bg-teal' : 'bg-subtle'
                  }`}
                  aria-label={isShared ? 'Disable sharing' : 'Enable sharing'}
                >
                  <span
                    className="inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform"
                    style={{ transform: isShared ? 'translateX(18px)' : 'translateX(2px)' }}
                  />
                </button>
              </div>

              {isShared && shareUrl ? (
                <>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={shareUrl}
                      className="flex-1 min-w-0 text-xs bg-mint border border-teal-light rounded-pill px-3 py-1.5 text-navy outline-none truncate"
                    />
                    <button
                      onClick={copyLink}
                      className="text-xs text-white bg-teal px-3 py-1.5 rounded-pill hover:bg-opacity-90 transition-colors font-medium flex-shrink-0 min-h-[32px]"
                    >
                      {copying ? '✓' : 'Copy'}
                    </button>
                  </div>

                  {canWhiteLabel ? (
                    <button
                      onClick={toggleWhiteLabel}
                      className="flex items-center gap-2 cursor-pointer text-left"
                    >
                      <div
                        className={`relative inline-flex h-4 w-7 flex-shrink-0 items-center rounded-full transition-colors ${
                          whiteLabel ? 'bg-teal' : 'bg-subtle'
                        }`}
                      >
                        <span
                          className="inline-block h-3 w-3 rounded-full bg-white shadow transition-transform"
                          style={{ transform: whiteLabel ? 'translateX(14px)' : 'translateX(2px)' }}
                        />
                      </div>
                      <span className="text-xs text-subtle">Remove DashPlot branding</span>
                    </button>
                  ) : (
                    <p className="text-xs text-subtle">
                      Shared with DashPlot branding.{' '}
                      <Link to="/upgrade" className="text-teal hover:underline" onClick={() => setOpen(false)}>
                        Upgrade to Pro
                      </Link>{' '}
                      to white-label.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-subtle">Turn on the toggle to create a public link.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function ShareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="11" cy="2.5" r="1.5" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="11" cy="11.5" r="1.5" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="3" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4.4 6.2l5.1-2.8M4.4 7.8l5.1 2.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="2" y="6" width="10" height="7" rx="1.5" stroke="#B4B2A9" strokeWidth="1.2" />
      <path d="M4.5 6V4a2.5 2.5 0 015 0v2" stroke="#B4B2A9" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}
