import { useState } from 'react'
import { Link } from 'react-router-dom'

const FAQS = [
  {
    q: 'Do I need a credit card to start?',
    a: 'No. The 14-day free trial requires only an email address. You add billing details only when you choose to upgrade.',
  },
  {
    q: 'What file types does DashPlot support?',
    a: 'CSV (.csv), Excel (.xlsx, .xls) up to 10 MB. You can also connect Google Sheets for live data sync (Pro plan and above). Multi-sheet combining is not yet supported in v1.',
  },
  {
    q: 'How does the AI insight work?',
    a: 'Your data is sent to the Anthropic Claude API, which generates a plain-English narrative summarising trends, peaks, and anomalies. On the free trial, only the first sentence is shown; paid plans unlock the full insight.',
  },
  {
    q: 'Is my data secure?',
    a: 'Yes. All data is stored in Supabase with row-level security enabled. Data in transit is encrypted via TLS. Google Sheets access tokens are encrypted via Supabase Vault. We do not sell your data to third parties.',
  },
  {
    q: 'Can I share a dashboard without requiring a login?',
    a: 'Yes. Solo and above plans can generate a shareable link. Viewers access the dashboard without creating an account. Pro plans support white-label sharing (no DashPlot branding).',
  },
  {
    q: 'What happens when my trial ends?',
    a: 'Your account becomes read-only — you can view existing reports but cannot create or edit. After 37 days from trial expiry, all data is permanently deleted. You will receive reminder emails before deletion.',
  },
  {
    q: 'Can I cancel at any time?',
    a: 'Yes. Cancel from Account → Billing. Your access continues until the end of the current billing period. We do not provide refunds for partial periods, but we offer pauses and discounts if cost is the concern.',
  },
  {
    q: 'What chart types are available?',
    a: 'Bar, line, pie, area, scatter, and funnel charts. Trial plans have access to bar and line only. All chart types are available on Solo and above.',
  },
  {
    q: 'Can I export to PDF?',
    a: 'Yes. PDF export is available on all paid plans (Solo, Pro, Agency). Trial plans see a locked export button.',
  },
  {
    q: 'Do you offer team or agency plans?',
    a: 'Yes. The Agency plan ($79/month) includes 5 seats, unlimited workspaces, and unlimited history retention. Contact shakhunasil@hotmail.com for custom enterprise pricing.',
  },
  {
    q: 'Is there a referral programme?',
    a: 'Yes. Share your referral link and your referred user gets 20% off their first 2 months. When they convert to paid, you get 1 month free credit. No cap on rewards.',
  },
  {
    q: 'Where can I get help preparing my data file?',
    a: <span>See our <Link to="/guide" className="text-teal hover:underline">file preparation guide</Link> for tips on headers, date formats, and how to clean common issues before uploading.</span>,
  },
]

export default function FAQ() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <h1 className="text-3xl font-medium text-navy mb-2" style={{ letterSpacing: '-0.2px' }}>Frequently asked questions</h1>
      <p className="text-sm text-subtle mb-10">Can't find what you need? Email <a href="mailto:shakhunasil@hotmail.com" className="text-teal hover:underline">shakhunasil@hotmail.com</a>.</p>

      <div className="flex flex-col gap-2">
        {FAQS.map((item, i) => (
          <FAQItem key={i} q={item.q} a={item.a} />
        ))}
      </div>
    </div>
  )
}

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-mint rounded-card overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-medium text-navy hover:bg-mint transition-colors min-h-[44px]"
        onClick={() => setOpen(v => !v)}
      >
        <span>{q}</span>
        <svg
          className={`flex-shrink-0 ml-4 transition-transform duration-200 text-teal ${open ? 'rotate-180' : ''}`}
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
        >
          <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-subtle leading-relaxed border-t border-mint bg-white">
          <div className="pt-3">{a}</div>
        </div>
      )}
    </div>
  )
}
