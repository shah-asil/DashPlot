export default function AIInsightCard() {
  return (
    <div
      className="rounded-card border p-5 flex flex-col gap-3"
      style={{ background: '#E1F5EE', borderColor: '#9FE1CB' }}
    >
      <div className="flex items-center gap-2">
        <SparkleIcon />
        <span className="text-xs font-medium" style={{ color: '#085041' }}>AI Insight</span>
        <span className="ml-auto text-xs bg-white border border-teal-light px-2 py-0.5 rounded-pill" style={{ color: '#1D9E75' }}>
          Coming soon
        </span>
      </div>
      <p className="text-sm leading-relaxed" style={{ color: '#085041' }}>
        AI-powered narrative summaries are coming soon. Upgrade to Pro to get early access.
      </p>
    </div>
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
