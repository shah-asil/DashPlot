import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const TYPES = [
  { id: 'bar',     label: 'Bar',     Icon: BarIcon,     minPlan: 'trial' },
  { id: 'line',    label: 'Line',    Icon: LineIcon,    minPlan: 'trial' },
  { id: 'area',    label: 'Area',    Icon: AreaIcon,    minPlan: 'solo'  },
  { id: 'pie',     label: 'Pie',     Icon: PieIcon,     minPlan: 'solo'  },
  { id: 'scatter', label: 'Scatter', Icon: ScatterIcon, minPlan: 'pro'   },
  { id: 'funnel',  label: 'Funnel',  Icon: FunnelIcon,  minPlan: 'pro'   },
]

const PLAN_ORDER = ['trial', 'solo', 'pro', 'agency']

function planAllows(userPlan, minPlan) {
  return PLAN_ORDER.indexOf(userPlan) >= PLAN_ORDER.indexOf(minPlan)
}

export default function ChartTypeSelector({ current, onChange }) {
  const { profile } = useAuth()
  const plan = profile?.plan ?? 'trial'
  const [lockedBanner, setLockedBanner] = useState(false)

  function handleClick(type) {
    if (!planAllows(plan, type.minPlan)) {
      setLockedBanner(true)
      return
    }
    setLockedBanner(false)
    onChange(type.id)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {TYPES.map(type => {
          const locked = !planAllows(plan, type.minPlan)
          const active  = current === type.id
          return (
            <button
              key={type.id}
              onClick={() => handleClick(type)}
              title={locked ? `${type.label} chart requires ${type.minPlan === 'pro' ? 'Pro' : 'Solo'} plan` : type.label}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-card border text-xs font-medium transition-all min-h-[36px]
                ${active  ? 'bg-teal text-white border-teal shadow-sm'
                : locked  ? 'bg-white text-subtle border-mint opacity-60 cursor-not-allowed'
                          : 'bg-white text-navy border-mint hover:border-teal hover:bg-mint'}`}
            >
              <type.Icon active={active} locked={locked} />
              {type.label}
              {locked && <LockIcon />}
            </button>
          )
        })}
      </div>

      {lockedBanner && (
        <div className="flex items-center gap-3 bg-mint border border-teal-light rounded-card px-4 py-2.5 text-sm">
          <span className="text-ai-text flex-1">Scatter and Funnel charts are available on Pro and above.</span>
          <Link
            to="/upgrade"
            className="text-white bg-teal px-4 py-1.5 rounded-pill text-xs font-medium hover:bg-opacity-90 transition-colors whitespace-nowrap"
            onClick={() => setLockedBanner(false)}
          >
            Upgrade →
          </Link>
          <button onClick={() => setLockedBanner(false)} className="text-subtle hover:text-navy ml-1">
            <XIcon />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function BarIcon({ active }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="7" width="3" height="6" rx="1" fill={active ? 'white' : '#9FE1CB'} />
      <rect x="5.5" y="4" width="3" height="9" rx="1" fill={active ? 'white' : '#1D9E75'} />
      <rect x="10" y="1" width="3" height="12" rx="1" fill={active ? 'white' : '#185FA5'} />
    </svg>
  )
}

function LineIcon({ active }) {
  const c = active ? 'white' : '#1D9E75'
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <polyline points="1,11 4,7 7,9 10,4 13,6" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function AreaIcon({ active }) {
  const c = active ? 'white' : '#1D9E75'
  const f = active ? 'rgba(255,255,255,0.3)' : '#E1F5EE'
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M1 11 L4 7 L7 9 L10 4 L13 6 L13 13 L1 13 Z" fill={f} stroke={c} strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}

function PieIcon({ active }) {
  const c = active ? 'white' : '#1D9E75'
  const c2 = active ? 'rgba(255,255,255,0.5)' : '#9FE1CB'
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 7 L7 1 A6 6 0 1 1 1.8 10 Z" fill={c} />
      <path d="M7 7 L1.8 10 A6 6 0 0 1 7 1 Z" fill={c2} />
    </svg>
  )
}

function ScatterIcon({ active, locked }) {
  const c = locked ? '#B4B2A9' : active ? 'white' : '#1D9E75'
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      {[[2,10],[5,5],[8,8],[11,3],[4,12]].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="1.5" fill={c} opacity={i === 0 ? 0.5 : 1} />
      ))}
    </svg>
  )
}

function FunnelIcon({ active, locked }) {
  const c = locked ? '#B4B2A9' : active ? 'white' : '#1D9E75'
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="1" width="12" height="3" rx="1" fill={c} opacity="1" />
      <rect x="2.5" y="5.5" width="9" height="2.5" rx="1" fill={c} opacity="0.7" />
      <rect x="4.5" y="9.5" width="5" height="2.5" rx="1" fill={c} opacity="0.4" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="opacity-60">
      <rect x="2" y="4.5" width="6" height="5" rx="1" stroke="currentColor" strokeWidth="1" />
      <path d="M3.5 4.5V3a1.5 1.5 0 013 0v1.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}
