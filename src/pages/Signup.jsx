import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LogoWordmark } from '../components/Logo'

export default function Signup() {
  const { signUp, signInWithGoogle } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    const result = await signUp(email, password)
    setLoading(false)

    if (!result.success) {
      setError(result.userMessage)
      return
    }

    navigate('/onboarding')
  }

  async function handleGoogle() {
    setError('')
    setGoogleLoading(true)
    const result = await signInWithGoogle()
    if (!result.success) {
      setError(result.userMessage)
      setGoogleLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Create your free account"
      subtitle="14-day trial · No credit card required"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-navy" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full px-4 py-3 text-sm border border-mint rounded-pill outline-none focus:border-teal focus:ring-1 focus:ring-teal transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-navy" htmlFor="password">Password</label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              className="w-full px-4 py-3 pr-11 text-sm border border-mint rounded-pill outline-none focus:border-teal focus:ring-1 focus:ring-teal transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-subtle hover:text-navy transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </button>
          </div>
        </div>

        {error && (
          <p className="text-xs text-error px-1">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-teal text-white py-3 rounded-pill text-sm font-medium hover:bg-opacity-90 transition-colors disabled:opacity-60 min-h-[44px]"
        >
          {loading ? 'Creating account…' : 'Create free account'}
        </button>
      </form>

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-mint" />
        <span className="text-xs text-subtle">or</span>
        <div className="flex-1 h-px bg-mint" />
      </div>

      <button
        onClick={handleGoogle}
        disabled={googleLoading}
        className="w-full flex items-center justify-center gap-3 border border-mint rounded-pill py-3 text-sm text-navy hover:bg-mint transition-colors disabled:opacity-60 min-h-[44px]"
      >
        <GoogleIcon />
        {googleLoading ? 'Redirecting…' : 'Continue with Google'}
      </button>

      <p className="text-xs text-subtle text-center mt-6">
        Already have an account?{' '}
        <Link to="/login" className="text-teal hover:underline">Log in</Link>
      </p>

      <p className="text-xs text-subtle text-center mt-3 leading-relaxed">
        By signing up you agree to our{' '}
        <Link to="/terms" className="hover:underline">Terms</Link> and{' '}
        <Link to="/privacy" className="hover:underline">Privacy Policy</Link>.
      </p>
    </AuthLayout>
  )
}

function AuthLayout({ title, subtitle, children }) {
  return (
    <div
      className="flex-1 flex items-center justify-center px-4 py-16"
      style={{ background: 'linear-gradient(135deg, #E1F5EE 0%, #E6F1FB 100%)' }}
    >
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-8">
          <LogoWordmark size="lg" />
          <h1 className="text-xl font-medium text-navy text-center" style={{ letterSpacing: '-0.2px' }}>{title}</h1>
          <p className="text-sm text-subtle text-center">{subtitle}</p>
        </div>
        <div className="bg-white rounded-card border border-mint shadow-card p-6 sm:p-8">
          {children}
        </div>
      </div>
    </div>
  )
}

function Eye() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}

function EyeOff() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 2l12 12M6.5 6.6A2 2 0 0010.4 9.5M4.2 4.3C2.6 5.4 1 8 1 8s2.5 5 7 5c1.4 0 2.7-.4 3.8-1M7 3.1C7.3 3 7.7 3 8 3c4.5 0 7 5 7 5s-.6 1.2-1.6 2.3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.909-2.259c-.806.54-1.837.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
      <path d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  )
}
