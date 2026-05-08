import { CHART_COLORS } from './DashboardChart'

export default function PdfSummaryStats({ report }) {
  const rows = report?.raw_data
  const colConfig = report?.column_config
  if (!rows?.length || !colConfig?.headers) return null

  const numCols = colConfig.headers.filter(h => colConfig.columnTypes?.[h] === 'number')
  if (!numCols.length) return null

  const stats = numCols.map(col => {
    const vals = rows.map(r => Number(r[col])).filter(v => !isNaN(v))
    if (!vals.length) return null
    const total   = vals.reduce((s, v) => s + v, 0)
    const avg     = total / vals.length
    const min     = Math.min(...vals)
    const max     = Math.max(...vals)
    const first   = vals[0]
    const last    = vals[vals.length - 1]
    const pctChange = first !== 0 ? ((last - first) / Math.abs(first)) * 100 : null
    return { col, total, avg, min, max, pctChange }
  }).filter(Boolean)

  if (!stats.length) return null

  return (
    <div
      className="pdf-stats-show"
      style={{
        display: 'none',
        flexDirection: 'column',
        gap: 12,
        padding: '16px 20px',
        background: '#E1F5EE',
        borderRadius: 12,
        border: '1px solid #9FE1CB',
      }}
    >
      <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#185FA5', letterSpacing: '-0.2px' }}>
        Summary Statistics
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
        <thead>
          <tr>
            {['Column', 'Total', 'Average', 'Min', 'Max', '% Change'].map(h => (
              <th
                key={h}
                style={{
                  textAlign: h === 'Column' ? 'left' : 'right',
                  padding: '4px 8px',
                  color: '#B4B2A9',
                  fontWeight: 500,
                  borderBottom: '1px solid #9FE1CB',
                  whiteSpace: 'nowrap',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stats.map((s, i) => (
            <tr key={s.col} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.5)' }}>
              <td style={{ padding: '5px 8px', color: '#08060d', fontWeight: 500 }}>{s.col}</td>
              <td style={{ padding: '5px 8px', textAlign: 'right', color: '#08060d' }}>{fmt(s.total)}</td>
              <td style={{ padding: '5px 8px', textAlign: 'right', color: '#08060d' }}>{fmt(s.avg)}</td>
              <td style={{ padding: '5px 8px', textAlign: 'right', color: '#08060d' }}>{fmt(s.min)}</td>
              <td style={{ padding: '5px 8px', textAlign: 'right', color: '#08060d' }}>{fmt(s.max)}</td>
              <td style={{ padding: '5px 8px', textAlign: 'right', color: pctColor(s.pctChange), fontWeight: 500 }}>
                {s.pctChange === null ? '—' : `${s.pctChange >= 0 ? '+' : ''}${s.pctChange.toFixed(1)}%`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function fmt(v) {
  if (typeof v !== 'number' || isNaN(v)) return '—'
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (Math.abs(v) >= 1_000)     return `${(v / 1_000).toFixed(1)}k`
  return v % 1 === 0 ? v.toLocaleString() : v.toFixed(2)
}

function pctColor(pct) {
  if (pct === null) return '#B4B2A9'
  return pct >= 0 ? '#1D9E75' : '#EF9F27'
}
