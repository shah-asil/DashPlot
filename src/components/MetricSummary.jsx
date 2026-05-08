export default function MetricSummary({ rows, colConfig }) {
  if (!rows?.length || !colConfig) return null
  const metrics = computeMetrics(rows, colConfig)
  if (!metrics.length) return null

  return (
    <div className="pdf-metric-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {metrics.map(m => (
        <div key={m.label} className="bg-white border border-mint rounded-card p-4 shadow-card overflow-hidden">
          <p className="text-xs text-subtle truncate">{m.label}</p>
          <p className="text-lg font-medium text-navy mt-1 truncate" style={{ letterSpacing: '-0.2px' }}>{m.value}</p>
          {m.sub && <p className="text-xs text-teal mt-0.5">{m.sub}</p>}
        </div>
      ))}
    </div>
  )
}

function computeMetrics(rows, colConfig) {
  const { xAxis, yAxis, columnTypes } = colConfig
  const metrics = []

  metrics.push({ label: 'Data points', value: rows.length.toLocaleString() })

  yAxis.forEach(col => {
    const values = rows.map(r => r[col]).filter(v => typeof v === 'number' && !isNaN(v))
    if (!values.length) return

    const total = values.reduce((s, v) => s + v, 0)
    const avg   = total / values.length
    const min   = Math.min(...values)
    const max   = Math.max(...values)

    metrics.push({
      label: `Total ${col}`,
      value: fmtMetric(total),
      sub: `avg ${fmtMetric(avg)}`,
    })

    if (values.length > 1) {
      const change = values[values.length - 1] - values[0]
      const pct    = values[0] !== 0 ? (change / Math.abs(values[0])) * 100 : 0
      metrics.push({
        label: `${col} range`,
        value: `${fmtMetric(min)} – ${fmtMetric(max)}`,
        sub: change >= 0 ? `+${fmtMetric(Math.abs(change))} overall` : `-${fmtMetric(Math.abs(change))} overall`,
      })
    }
  })

  if (columnTypes?.[xAxis] === 'date') {
    const dates = rows.map(r => r[xAxis]).filter(Boolean).sort()
    if (dates.length >= 2) {
      metrics.push({
        label: 'Date range',
        value: `${fmtDate(dates[0])} – ${fmtDate(dates[dates.length - 1])}`,
      })
    }
  }

  return metrics.slice(0, 4)
}

function fmtMetric(v) {
  if (typeof v !== 'number') return String(v)
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (Math.abs(v) >= 1_000)     return `${(v / 1_000).toFixed(1)}k`
  return v % 1 === 0 ? v.toLocaleString() : v.toFixed(2)
}

function fmtDate(dateStr) {
  if (!dateStr) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
  }
  return dateStr
}
