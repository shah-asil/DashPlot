import { useEffect, useState } from 'react'
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  AreaChart, Area,
  PieChart, Pie, Cell,
  ScatterChart, Scatter,
  FunnelChart, Funnel, LabelList,
  CartesianGrid, XAxis, YAxis, Tooltip, Legend,
} from 'recharts'

export const CHART_COLORS = ['#1D9E75', '#9FE1CB', '#185FA5', '#EF9F27']
const MAX_ROWS       = 500
const MAX_PIE_SLICES = 12
const LABEL_MAX_PTS  = 20

// ─── PDF mode detection ───────────────────────────────────────────────────────

function usePdfMode() {
  const [on, setOn] = useState(() => document.body.classList.contains('pdf-export-mode'))
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setOn(document.body.classList.contains('pdf-export-mode'))
    )
    obs.observe(document.body, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  return on
}

// ─── Public API ───────────────────────────────────────────────────────────────

export default function DashboardChart({ chartType = 'bar', report, colConfig: colConfigProp, height = 300 }) {
  const pdfMode = usePdfMode()

  const rows = report?.raw_data
  const colConfig = colConfigProp
    ? { xAxis: colConfigProp.xAxis, yAxis: colConfigProp.yAxis, series: colConfigProp.series }
    : (report?.column_config ?? {})

  if (!rows?.length || !colConfig?.xAxis || !colConfig?.yAxis?.length) {
    return <EmptyChart message="No data configured." height={height} />
  }

  const { data, keys } = prepareData(rows.slice(0, MAX_ROWS), colConfig, chartType)

  if (!data.length) {
    return <EmptyChart message="No plottable data found for this chart type." height={height} />
  }

  const shared = { data, keys, xAxis: colConfig.xAxis, height, pdfMode }

  switch (chartType) {
    case 'line':    return <ChartLine    {...shared} />
    case 'area':    return <ChartArea    {...shared} />
    case 'pie':     return <ChartPie     data={data} height={height} pdfMode={pdfMode} />
    case 'scatter': return <ChartScatter data={data} xLabel={colConfig.xAxis} yLabel={colConfig.yAxis[0]} height={height} pdfMode={pdfMode} />
    case 'funnel':  return <ChartFunnel  data={data} height={height} pdfMode={pdfMode} />
    default:        return <ChartBar     {...shared} />
  }
}

// ─── Data preparation ─────────────────────────────────────────────────────────

function prepareData(rows, colConfig, chartType) {
  const { xAxis, yAxis, series } = colConfig

  if (chartType === 'pie') {
    const data = rows
      .map(r => ({ name: String(r[xAxis] ?? ''), value: Number(r[yAxis[0]] ?? 0) }))
      .filter(d => !isNaN(d.value) && d.name !== '')
      .sort((a, b) => b.value - a.value)
      .slice(0, MAX_PIE_SLICES)
    return { data, keys: [] }
  }

  if (chartType === 'scatter') {
    const data = rows
      .map(r => ({ x: Number(r[xAxis]), y: Number(r[yAxis[0]]) }))
      .filter(d => !isNaN(d.x) && !isNaN(d.y))
    return { data, keys: [] }
  }

  if (chartType === 'funnel') {
    const data = rows
      .map(r => ({ name: String(r[xAxis] ?? ''), value: Number(r[yAxis[0]] ?? 0) }))
      .filter(d => !isNaN(d.value))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12)
    return { data, keys: [] }
  }

  if (series) {
    const seriesValues = [...new Set(rows.map(r => String(r[series] ?? '')))].filter(Boolean).slice(0, 8)
    const grouped = new Map()
    rows.forEach(r => {
      const xKey = String(r[xAxis] ?? '')
      if (!grouped.has(xKey)) grouped.set(xKey, { [xAxis]: r[xAxis] })
      const sv = r[series]
      if (sv != null && seriesValues.includes(String(sv))) {
        grouped.get(xKey)[String(sv)] = Number(r[yAxis[0]] ?? 0)
      }
    })
    return { data: Array.from(grouped.values()), keys: seriesValues }
  }

  const data = rows.map(r => ({
    [xAxis]: r[xAxis],
    ...yAxis.reduce((acc, col) => ({ ...acc, [col]: r[col] }), {}),
  }))
  return { data, keys: yAxis }
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function fmtNum(v) {
  if (typeof v !== 'number') return v
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (Math.abs(v) >= 1_000)     return `${(v / 1_000).toFixed(1)}k`
  return v % 1 === 0 ? v.toLocaleString() : v.toFixed(2)
}

function fmtXTick(value) {
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const d = new Date(value + 'T00:00:00')
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
    return value.length > 12 ? value.slice(0, 11) + '…' : value
  }
  return value
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-mint rounded-card shadow-card px-3 py-2 text-xs">
      <p className="font-medium text-navy mb-1">{fmtXTick(label)}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color ?? p.fill }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  )
}

const AXIS_TICK    = { fontSize: 11, fill: '#B4B2A9' }
const GRID_STYLE   = { stroke: '#E1F5EE', strokeDasharray: '3 3' }
const LEGEND_STYLE = { fontSize: 11, color: '#B4B2A9' }
const LABEL_STYLE  = { fontSize: 9, fill: '#185FA5', fontWeight: 500 }

// ─── Bar chart ────────────────────────────────────────────────────────────────

function ChartBar({ data, keys, xAxis, height, pdfMode }) {
  const showLabels = pdfMode && data.length <= LABEL_MAX_PTS
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: showLabels ? 22 : 4, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid {...GRID_STYLE} vertical={false} />
        <XAxis dataKey={xAxis} tick={AXIS_TICK} tickFormatter={fmtXTick} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis tick={AXIS_TICK} tickFormatter={fmtNum} tickLine={false} axisLine={false} width={48} />
        <Tooltip content={<CustomTooltip />} />
        {keys.length > 1 && <Legend wrapperStyle={LEGEND_STYLE} />}
        {keys.map((k, i) => (
          <Bar key={k} dataKey={k} fill={CHART_COLORS[i % 4]} radius={[3, 3, 0, 0]} maxBarSize={48} isAnimationActive={!pdfMode}>
            {showLabels && (
              <LabelList dataKey={k} position="top" style={LABEL_STYLE} formatter={fmtNum} />
            )}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Line chart ───────────────────────────────────────────────────────────────

function ChartLine({ data, keys, xAxis, height, pdfMode }) {
  const showLabels = pdfMode && data.length <= LABEL_MAX_PTS
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: showLabels ? 22 : 4, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid {...GRID_STYLE} />
        <XAxis dataKey={xAxis} tick={AXIS_TICK} tickFormatter={fmtXTick} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis tick={AXIS_TICK} tickFormatter={fmtNum} tickLine={false} axisLine={false} width={48} />
        <Tooltip content={<CustomTooltip />} />
        {keys.length > 1 && <Legend wrapperStyle={LEGEND_STYLE} />}
        {keys.map((k, i) => (
          <Line
            key={k}
            type="monotone"
            dataKey={k}
            stroke={CHART_COLORS[i % 4]}
            strokeWidth={2}
            dot={pdfMode ? { r: 3, fill: CHART_COLORS[i % 4], strokeWidth: 0 } : false}
            activeDot={{ r: 4 }}
            isAnimationActive={!pdfMode}
          >
            {showLabels && (
              <LabelList dataKey={k} position="top" style={{ ...LABEL_STYLE, fill: CHART_COLORS[i % 4] }} formatter={fmtNum} />
            )}
          </Line>
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

// ─── Area chart ───────────────────────────────────────────────────────────────

function ChartArea({ data, keys, xAxis, height, pdfMode }) {
  const showLabels = pdfMode && data.length <= LABEL_MAX_PTS
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: showLabels ? 22 : 4, right: 8, bottom: 4, left: 0 }}>
        <defs>
          {keys.map((k, i) => (
            <linearGradient key={k} id={`areaGrad${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={CHART_COLORS[i % 4]} stopOpacity={0.25} />
              <stop offset="95%" stopColor={CHART_COLORS[i % 4]} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid {...GRID_STYLE} />
        <XAxis dataKey={xAxis} tick={AXIS_TICK} tickFormatter={fmtXTick} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis tick={AXIS_TICK} tickFormatter={fmtNum} tickLine={false} axisLine={false} width={48} />
        <Tooltip content={<CustomTooltip />} />
        {keys.length > 1 && <Legend wrapperStyle={LEGEND_STYLE} />}
        {keys.map((k, i) => (
          <Area
            key={k}
            type="monotone"
            dataKey={k}
            stroke={CHART_COLORS[i % 4]}
            strokeWidth={2}
            fill={`url(#areaGrad${i})`}
            dot={pdfMode ? { r: 3, fill: CHART_COLORS[i % 4], strokeWidth: 0 } : false}
            isAnimationActive={!pdfMode}
          >
            {showLabels && (
              <LabelList dataKey={k} position="top" style={{ ...LABEL_STYLE, fill: CHART_COLORS[i % 4] }} formatter={fmtNum} />
            )}
          </Area>
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ─── Pie chart ────────────────────────────────────────────────────────────────

function ChartPie({ data, height, pdfMode }) {
  const outerRadius = height < 250 ? 70 : 110
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={outerRadius}
          paddingAngle={2}
          isAnimationActive={!pdfMode}
          label={pdfMode ? ({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%` : false}
          labelLine={pdfMode}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % 4]} stroke="white" strokeWidth={2} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        {!pdfMode && <Legend wrapperStyle={LEGEND_STYLE} />}
      </PieChart>
    </ResponsiveContainer>
  )
}

// ─── Scatter chart ────────────────────────────────────────────────────────────

function ChartScatter({ data, xLabel, yLabel, height, pdfMode }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid {...GRID_STYLE} />
        <XAxis dataKey="x" name={xLabel} tick={AXIS_TICK} tickFormatter={fmtNum} tickLine={false} axisLine={false} type="number" />
        <YAxis dataKey="y" name={yLabel} tick={AXIS_TICK} tickFormatter={fmtNum} tickLine={false} axisLine={false} width={48} type="number" />
        <Tooltip cursor={{ strokeDasharray: '3 3', stroke: '#E1F5EE' }} content={<CustomTooltip />} />
        <Scatter data={data} fill={CHART_COLORS[0]} opacity={0.7} isAnimationActive={!pdfMode} />
      </ScatterChart>
    </ResponsiveContainer>
  )
}

// ─── Funnel chart ─────────────────────────────────────────────────────────────

function ChartFunnel({ data, height, pdfMode }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <FunnelChart>
        <Tooltip content={<CustomTooltip />} />
        <Funnel dataKey="value" data={data} isAnimationActive={!pdfMode}>
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % 4]} />
          ))}
          <LabelList position="right" fill="#B4B2A9" stroke="none" dataKey="name" style={{ fontSize: 11 }} />
        </Funnel>
      </FunnelChart>
    </ResponsiveContainer>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyChart({ message = 'No data to display.', height = 300 }) {
  return (
    <div
      className="w-full flex items-center justify-center border border-dashed border-teal-light rounded-card bg-mint"
      style={{ height }}
    >
      <p className="text-sm text-subtle">{message}</p>
    </div>
  )
}
