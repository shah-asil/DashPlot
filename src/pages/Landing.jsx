import { Link } from 'react-router-dom'

const CHART_COLORS = ['#1D9E75', '#9FE1CB', '#185FA5', '#EF9F27']

export default function Landing() {
  return (
    <div className="flex flex-col">
      <Hero />
      <Features />
      <HowItWorks />
      <Pricing />
      <CTA />
    </div>
  )
}

function Hero() {
  return (
    <section
      className="w-full py-20 md:py-32 px-4 text-center"
      style={{ background: 'linear-gradient(135deg, #E1F5EE 0%, #E6F1FB 100%)' }}
    >
      <div className="max-w-3xl mx-auto flex flex-col items-center gap-6">
        <span className="text-xs font-medium text-teal uppercase tracking-widest bg-white border border-teal-light px-4 py-1.5 rounded-pill">
          Free 14-day trial · No credit card
        </span>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-medium text-navy" style={{ letterSpacing: '-0.2px', lineHeight: '1.1' }}>
          Your data deserves better<br className="hidden sm:block" /> than a spreadsheet.
        </h1>

        <p className="text-base sm:text-lg text-subtle max-w-xl">
          Upload a CSV or connect Google Sheets. DashPlot builds a beautiful dashboard in seconds and writes an AI narrative that tells the story behind your numbers.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <Link
            to="/signup"
            className="text-sm text-white bg-teal px-8 py-3 rounded-pill hover:bg-opacity-90 transition-colors font-medium min-h-[44px] flex items-center justify-center"
          >
            Start free – no card needed
          </Link>
          <Link
            to="/guide"
            className="text-sm text-teal border border-teal bg-mint px-8 py-3 rounded-pill hover:bg-teal-light transition-colors font-medium min-h-[44px] flex items-center justify-center"
            style={{ color: '#0F6E56' }}
          >
            See how it works
          </Link>
        </div>

        <div className="mt-8 w-full max-w-2xl">
          <DashboardMockup />
        </div>
      </div>
    </section>
  )
}

function DashboardMockup() {
  const bars = [65, 80, 45, 90, 55, 75, 60]
  const line = [40, 55, 48, 70, 62, 78, 72]

  return (
    <div className="bg-white rounded-card border border-mint shadow-card p-4 sm:p-6 text-left">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm font-medium text-navy">Q1 Revenue Overview</div>
          <div className="text-xs text-subtle mt-0.5">January – March 2024</div>
        </div>
        <span className="text-xs bg-mint border border-teal-light text-ai-text px-3 py-1 rounded-pill">AI insight ready</span>
      </div>

      <div className="flex gap-3 mb-4">
        {[{ label: 'Total Revenue', value: '$84,200', delta: '+12%' }, { label: 'Avg. Order', value: '$142', delta: '+5%' }, { label: 'New Customers', value: '593', delta: '+23%' }].map(m => (
          <div key={m.label} className="flex-1 bg-mint rounded-card p-3">
            <div className="text-xs text-subtle">{m.label}</div>
            <div className="text-base font-medium text-navy mt-0.5">{m.value}</div>
            <div className="text-xs text-teal mt-0.5">{m.delta}</div>
          </div>
        ))}
      </div>

      <div className="h-32 flex items-end gap-1">
        {bars.map((h, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-sm"
              style={{ height: `${h}%`, backgroundColor: i === 3 ? '#1D9E75' : '#9FE1CB' }}
            />
          </div>
        ))}
      </div>

      <div className="mt-4 bg-mint border border-teal-light rounded-card p-3">
        <div className="text-xs font-medium text-ai-text mb-1">AI Insight</div>
        <p className="text-xs text-ai-text leading-relaxed">
          Revenue peaked in Week 4 at $28k, driven by a 23% surge in new customer acquisitions. The average order value remained steady, suggesting growth is volume-led rather than price-led.
        </p>
      </div>
    </div>
  )
}

function Features() {
  const features = [
    {
      icon: <UploadIcon />,
      title: 'Upload in seconds',
      desc: 'Drag and drop a CSV or Excel file. DashPlot auto-detects headers, cleans messy data, and is ready to chart in under 5 seconds.',
    },
    {
      icon: <ChartIcon />,
      title: 'Beautiful charts, automatically',
      desc: 'Bar, line, pie, area, scatter, funnel — DashPlot picks the right chart for your data and lets you customise every detail.',
    },
    {
      icon: <AIIcon />,
      title: 'AI narrative insights',
      desc: 'Claude reads your data and writes a plain-English summary of what\'s happening — peaks, trends, anomalies, and what to do next.',
    },
    {
      icon: <ShareIcon />,
      title: 'Share with one click',
      desc: 'Generate a shareable link for your dashboard. No login required for viewers. White-label on Pro.',
    },
  ]

  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-medium text-navy" style={{ letterSpacing: '-0.2px' }}>Everything your team needs</h2>
          <p className="text-subtle mt-3 max-w-xl mx-auto">From upload to shareable dashboard in under a minute. No SQL, no pivot tables, no frustration.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map(f => (
            <div key={f.title} className="bg-white border border-mint rounded-card p-6 shadow-card flex flex-col gap-3">
              <div className="w-10 h-10 rounded-card bg-mint flex items-center justify-center text-teal">
                {f.icon}
              </div>
              <h3 className="text-sm font-medium text-navy">{f.title}</h3>
              <p className="text-sm text-subtle leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    { num: '01', title: 'Upload your data', desc: 'CSV, Excel, or connect Google Sheets. We handle the rest.' },
    { num: '02', title: 'Review the preview', desc: 'Confirm columns, pick chart axes, fix any data issues in one step.' },
    { num: '03', title: 'Get your dashboard', desc: 'Charts and AI insights generated instantly. Customise to taste.' },
    { num: '04', title: 'Share the link', desc: 'One click to share. Viewers see a live, beautiful dashboard — no account needed.' },
  ]

  return (
    <section className="py-20 px-4" style={{ background: 'linear-gradient(135deg, #E1F5EE 0%, #E6F1FB 100%)' }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-medium text-navy" style={{ letterSpacing: '-0.2px' }}>From file to insight in 60 seconds</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s, i) => (
            <div key={s.num} className="relative flex flex-col gap-3">
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-5 left-full w-full h-px bg-teal-light" style={{ width: 'calc(100% - 2rem)', left: '50%' }} />
              )}
              <div className="w-10 h-10 rounded-full bg-teal flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                {s.num}
              </div>
              <h3 className="text-sm font-medium text-navy">{s.title}</h3>
              <p className="text-sm text-subtle leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Pricing() {
  const plans = [
    {
      name: 'Trial',
      price: 'Free',
      sub: '14 days, no card',
      features: ['3 reports', 'Bar & line charts', 'First AI sentence', 'DashPlot branding'],
      cta: 'Start free trial',
      to: '/signup',
      highlight: false,
    },
    {
      name: 'Solo',
      price: '$19',
      sub: '/month',
      annual: '$190/year',
      features: ['Unlimited reports', 'All chart types', 'Full AI insights', 'Sharing (with branding)', 'PDF export'],
      cta: 'Get Solo',
      to: '/signup',
      highlight: false,
    },
    {
      name: 'Pro',
      price: '$29',
      sub: '/month',
      annual: '$290/year',
      features: ['Everything in Solo', 'White-label sharing', 'Google Sheets sync', 'Password protection', '3 workspaces', '12 months history'],
      cta: 'Get Pro',
      to: '/signup',
      highlight: true,
    },
    {
      name: 'Agency',
      price: '$79',
      sub: '/month',
      annual: '$790/year',
      features: ['Everything in Pro', 'Unlimited workspaces', '5 seats', 'Unlimited history'],
      cta: 'Get Agency',
      to: '/signup',
      highlight: false,
    },
  ]

  return (
    <section id="pricing" className="py-20 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-medium text-navy" style={{ letterSpacing: '-0.2px' }}>Simple, transparent pricing</h2>
          <p className="text-subtle mt-3">Annual billing saves 2 months. No hidden fees.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map(p => (
            <div
              key={p.name}
              className={`rounded-card border p-6 flex flex-col gap-4 ${p.highlight ? 'border-teal shadow-card bg-mint' : 'border-mint bg-white shadow-card'}`}
            >
              {p.highlight && (
                <span className="self-start text-xs text-white bg-teal px-3 py-1 rounded-pill">Most popular</span>
              )}
              <div>
                <div className="text-xs font-medium text-subtle uppercase tracking-wide">{p.name}</div>
                <div className="text-3xl font-medium text-navy mt-1" style={{ letterSpacing: '-0.2px' }}>{p.price}</div>
                <div className="text-xs text-subtle mt-0.5">{p.sub}</div>
                {p.annual && <div className="text-xs text-teal mt-0.5">{p.annual} billed annually</div>}
              </div>
              <ul className="flex flex-col gap-2 flex-1">
                {p.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-subtle">
                    <svg className="w-4 h-4 text-teal flex-shrink-0 mt-0.5" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to={p.to}
                className={`text-sm text-center py-2.5 rounded-pill transition-colors min-h-[44px] flex items-center justify-center ${p.highlight ? 'bg-teal text-white hover:bg-opacity-90' : 'bg-mint text-teal border border-teal-light hover:bg-teal-light'}`}
                style={p.highlight ? {} : { color: '#0F6E56' }}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CTA() {
  return (
    <section className="py-20 px-4" style={{ background: 'linear-gradient(135deg, #E1F5EE 0%, #E6F1FB 100%)' }}>
      <div className="max-w-xl mx-auto text-center flex flex-col items-center gap-6">
        <h2 className="text-3xl font-medium text-navy" style={{ letterSpacing: '-0.2px' }}>
          Ready to see your data differently?
        </h2>
        <p className="text-subtle">
          Join teams who have replaced clunky spreadsheets with live, AI-powered dashboards. Free for 14 days.
        </p>
        <Link
          to="/signup"
          className="text-sm text-white bg-teal px-10 py-3 rounded-pill hover:bg-opacity-90 transition-colors font-medium min-h-[44px] flex items-center"
        >
          Start your free trial
        </Link>
        <p className="text-xs text-subtle">No credit card required · Cancel any time</p>
      </div>
    </section>
  )
}

function UploadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 13V4M6 7l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 14v1a2 2 0 002 2h10a2 2 0 002-2v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function ChartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="10" width="3" height="8" rx="1" fill="currentColor" opacity="0.4" />
      <rect x="7" y="6" width="3" height="12" rx="1" fill="currentColor" opacity="0.7" />
      <rect x="12" y="3" width="3" height="15" rx="1" fill="currentColor" />
      <rect x="17" y="8" width="3" height="10" rx="1" fill="currentColor" opacity="0.5" />
    </svg>
  )
}

function AIIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 10h6M10 7v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="10" cy="10" r="2" fill="currentColor" opacity="0.2" />
    </svg>
  )
}

function ShareIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="15" cy="5" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="5" cy="10" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="15" cy="15" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 9l6-3M7 11l6 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
