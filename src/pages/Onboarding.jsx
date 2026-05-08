import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LogoWordmark } from '../components/Logo'
import posthog from '../lib/posthog'

const QUESTIONS = [
  {
    id: 'business_type',
    question: 'What best describes your business?',
    options: ['E-commerce', 'Marketing Agency', 'SaaS / Tech', 'Finance', 'Retail', 'Other'],
  },
  {
    id: 'metric',
    question: "What's your most important metric to track?",
    options: ['Revenue', 'Website Traffic', 'Customer Growth', 'Conversions', 'Social Media', 'Other'],
  },
  {
    id: 'data_source',
    question: 'How do you mainly manage your data today?',
    options: ['CSV files', 'Excel spreadsheets', 'Google Sheets', 'All of them'],
  },
]

export default function Onboarding() {
  const { completeOnboarding } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const current = QUESTIONS[step]
  const isLast = step === QUESTIONS.length - 1

  async function handleSelect(option) {
    const updated = { ...answers, [current.id]: option }
    setAnswers(updated)

    if (!isLast) {
      setStep(s => s + 1)
      return
    }

    setSaving(true)
    setError('')
    const result = await completeOnboarding(updated)
    setSaving(false)

    if (!result.success) {
      setError(result.userMessage)
      return
    }

    posthog.capture('onboarding_completed', {
      business_type: updated.business_type,
      data_preference: updated.data_source,
    })
    navigate('/dashboard')
  }

  function handleBack() {
    if (step > 0) setStep(s => s - 1)
  }

  return (
    <div
      className="flex-1 flex items-center justify-center px-4 py-16"
      style={{ background: 'linear-gradient(135deg, #E1F5EE 0%, #E6F1FB 100%)' }}
    >
      <div className="w-full max-w-lg">
        <div className="flex flex-col items-center gap-3 mb-8">
          <LogoWordmark size="lg" />
          <p className="text-sm text-subtle text-center">Let's personalise your experience</p>
        </div>

        <div className="bg-white rounded-card border border-mint shadow-card p-6 sm:p-8">
          <ProgressDots total={QUESTIONS.length} current={step} />

          <h2 className="text-lg font-medium text-navy mt-6 mb-6 text-center" style={{ letterSpacing: '-0.2px' }}>
            {current.question}
          </h2>

          <div className="grid grid-cols-2 gap-3">
            {current.options.map(option => (
              <button
                key={option}
                onClick={() => handleSelect(option)}
                disabled={saving}
                className={`px-4 py-3 rounded-card border text-sm font-medium transition-all min-h-[44px] text-center
                  ${answers[current.id] === option
                    ? 'bg-teal text-white border-teal'
                    : 'bg-white text-navy border-mint hover:border-teal hover:bg-mint'
                  } disabled:opacity-60`}
              >
                {option}
              </button>
            ))}
          </div>

          {error && (
            <p className="text-xs text-error text-center mt-4">{error}</p>
          )}

          {saving && (
            <div className="flex items-center justify-center gap-2 mt-6 text-sm text-subtle">
              <div className="w-4 h-4 rounded-full border-2 border-mint border-t-teal animate-spin" />
              Setting up your dashboard…
            </div>
          )}

          {step > 0 && !saving && (
            <button
              onClick={handleBack}
              className="mt-6 w-full text-xs text-subtle hover:text-navy transition-colors min-h-[36px]"
            >
              ← Back
            </button>
          )}
        </div>

        <p className="text-xs text-subtle text-center mt-4">
          Step {step + 1} of {QUESTIONS.length}
        </p>
      </div>
    </div>
  )
}

function ProgressDots({ total, current }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all ${
            i === current
              ? 'w-6 h-2 bg-teal'
              : i < current
              ? 'w-2 h-2 bg-teal-light'
              : 'w-2 h-2 bg-mint'
          }`}
        />
      ))}
    </div>
  )
}
