import { useState, useRef, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LogoWordmark } from './Logo'

export default function Navbar() {
  const { user, profile, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const navigate = useNavigate()
  const accountRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (accountRef.current && !accountRef.current.contains(e.target)) {
        setAccountOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleSignOut() {
    setAccountOpen(false)
    setMobileOpen(false)
    await signOut()
    navigate('/')
  }

  return (
    <nav className="w-full bg-white border-b border-mint sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <LogoWordmark onClick={() => setMobileOpen(false)} />

          {user ? (
            <div className="hidden md:flex items-center gap-6">
              <NavLink to="/dashboard" className="text-sm text-subtle hover:text-teal transition-colors">Dashboard</NavLink>
              <NavLink to="/faq" className="text-sm text-subtle hover:text-teal transition-colors">FAQ</NavLink>
              <div className="relative" ref={accountRef}>
                <button
                  onClick={() => setAccountOpen(v => !v)}
                  className="flex items-center gap-2 text-sm text-subtle hover:text-navy transition-colors min-h-[44px] px-1"
                >
                  <div className="w-7 h-7 rounded-full bg-mint flex items-center justify-center text-teal text-xs font-medium">
                    {(profile?.display_name || user.email || '?')[0].toUpperCase()}
                  </div>
                  <ChevronDown />
                </button>
                {accountOpen && (
                  <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-mint rounded-card shadow-card py-1 z-50">
                    <Link
                      to="/account"
                      onClick={() => setAccountOpen(false)}
                      className="block px-4 py-2.5 text-sm text-subtle hover:text-navy hover:bg-mint transition-colors"
                    >
                      Account settings
                    </Link>
                    <Link
                      to="/account/billing"
                      onClick={() => setAccountOpen(false)}
                      className="block px-4 py-2.5 text-sm text-subtle hover:text-navy hover:bg-mint transition-colors"
                    >
                      Billing
                    </Link>
                    <div className="my-1 border-t border-mint" />
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2.5 text-sm text-error hover:bg-red-50 transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-8">
              <NavLink to="/faq" className="text-sm text-subtle hover:text-teal transition-colors">FAQ</NavLink>
              <NavLink to="/guide" className="text-sm text-subtle hover:text-teal transition-colors">Guide</NavLink>
              <Link to="/login" className="text-sm text-subtle hover:text-teal transition-colors">Log in</Link>
              <Link
                to="/signup"
                className="text-sm text-white bg-teal px-5 py-2 rounded-pill hover:bg-opacity-90 transition-colors"
              >
                Try free
              </Link>
            </div>
          )}

          <button
            className="md:hidden flex items-center justify-center w-11 h-11 text-subtle hover:text-teal"
            onClick={() => setMobileOpen(v => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <XIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-mint bg-white px-4 pb-4 flex flex-col gap-1">
          {user ? (
            <>
              <NavLink to="/dashboard" className="py-3 text-sm text-subtle hover:text-teal" onClick={() => setMobileOpen(false)}>Dashboard</NavLink>
              <NavLink to="/account" className="py-3 text-sm text-subtle hover:text-teal" onClick={() => setMobileOpen(false)}>Account settings</NavLink>
              <NavLink to="/account/billing" className="py-3 text-sm text-subtle hover:text-teal" onClick={() => setMobileOpen(false)}>Billing</NavLink>
              <NavLink to="/faq" className="py-3 text-sm text-subtle hover:text-teal" onClick={() => setMobileOpen(false)}>FAQ</NavLink>
              <button
                onClick={handleSignOut}
                className="mt-2 text-left py-3 text-sm text-error"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/faq" className="py-3 text-sm text-subtle hover:text-teal" onClick={() => setMobileOpen(false)}>FAQ</NavLink>
              <NavLink to="/guide" className="py-3 text-sm text-subtle hover:text-teal" onClick={() => setMobileOpen(false)}>Guide</NavLink>
              <NavLink to="/login" className="py-3 text-sm text-subtle hover:text-teal" onClick={() => setMobileOpen(false)}>Log in</NavLink>
              <Link
                to="/signup"
                className="mt-2 text-center text-sm text-white bg-teal px-5 py-3 rounded-pill hover:bg-opacity-90 transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                Try free
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}

function ChevronDown() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
