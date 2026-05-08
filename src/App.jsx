import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import posthog from './lib/posthog'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'

import Landing from './pages/Landing'
import Signup from './pages/Signup'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import ReferralLanding from './pages/ReferralLanding'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import FAQ from './pages/FAQ'
import Guide from './pages/Guide'
import NotFound from './pages/NotFound'

const DashboardNew = lazy(() => import('./pages/DashboardNew'))
const ReportView   = lazy(() => import('./pages/ReportView'))
const Upgrade      = lazy(() => import('./pages/Upgrade'))
const ShareView    = lazy(() => import('./pages/ShareView'))
const Account      = lazy(() => import('./pages/Account'))
const Billing      = lazy(() => import('./pages/Billing'))

function LazyFallback() {
  return (
    <div className="flex-1 flex items-center justify-center py-24">
      <div className="w-8 h-8 rounded-full border-2 border-mint border-t-teal animate-spin" />
    </div>
  )
}

function SharePageWrapper() {
  useEffect(() => {
    posthog.capture('page_viewed', { page_name: 'share' })
  }, [])
  return <ShareView />
}

function ShareFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-mint border-t-teal animate-spin" />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/share/:token" element={
          <Suspense fallback={<ShareFallback />}>
            <SharePageWrapper />
          </Suspense>
        } />
        <Route path="*" element={<AppShell />} />
      </Routes>
    </AuthProvider>
  )
}

function PageTracker() {
  const location = useLocation()
  useEffect(() => {
    posthog.capture('page_viewed', { page_name: resolvePageName(location.pathname) })
  }, [location.pathname])
  return null
}

function resolvePageName(pathname) {
  if (pathname === '/')                    return 'landing'
  if (pathname === '/signup')              return 'signup'
  if (pathname === '/login')               return 'login'
  if (pathname === '/onboarding')          return 'onboarding'
  if (pathname === '/dashboard')           return 'dashboard'
  if (pathname === '/dashboard/new')       return 'dashboard_new'
  if (pathname.startsWith('/dashboard/'))  return 'report_view'
  if (pathname === '/upgrade')             return 'upgrade'
  if (pathname.startsWith('/share/'))      return 'share'
  if (pathname === '/account/billing')     return 'billing'
  if (pathname === '/account')             return 'account'
  if (pathname.startsWith('/ref/'))        return 'referral_landing'
  if (pathname === '/privacy')             return 'privacy'
  if (pathname === '/terms')               return 'terms'
  if (pathname === '/faq')                 return 'faq'
  if (pathname === '/guide')               return 'guide'
  return 'unknown'
}

function AppShell() {
  return (
    <div className="min-h-screen flex flex-col">
      <PageTracker />
      <Navbar />
      <main className="flex-1 flex flex-col">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/signup" element={<GuestRoute><Signup /></GuestRoute>} />
          <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
          <Route path="/ref/:code" element={<ReferralLanding />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/guide" element={<Guide />} />

          <Route path="/onboarding" element={
            <ProtectedRoute requireOnboarding={false}>
              <Onboarding />
            </ProtectedRoute>
          } />

          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />

          <Route path="/dashboard/new" element={
            <ProtectedRoute>
              <Suspense fallback={<LazyFallback />}>
                <DashboardNew />
              </Suspense>
            </ProtectedRoute>
          } />

          <Route path="/dashboard/:id" element={
            <ProtectedRoute>
              <Suspense fallback={<LazyFallback />}>
                <ReportView />
              </Suspense>
            </ProtectedRoute>
          } />

          <Route path="/upgrade" element={
            <ProtectedRoute>
              <Suspense fallback={<LazyFallback />}>
                <Upgrade />
              </Suspense>
            </ProtectedRoute>
          } />

          <Route path="/account" element={
            <ProtectedRoute>
              <Suspense fallback={<LazyFallback />}>
                <Account />
              </Suspense>
            </ProtectedRoute>
          } />

          <Route path="/account/billing" element={
            <ProtectedRoute>
              <Suspense fallback={<LazyFallback />}>
                <Billing />
              </Suspense>
            </ProtectedRoute>
          } />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/dashboard" replace />
  return children
}

