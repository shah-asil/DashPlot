import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
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

function LazyFallback() {
  return (
    <div className="flex-1 flex items-center justify-center py-24">
      <div className="w-8 h-8 rounded-full border-2 border-mint border-t-teal animate-spin" />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}

function AppShell() {
  return (
    <div className="min-h-screen flex flex-col">
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
              <PlaceholderPage title="Account Settings" phase={10} />
            </ProtectedRoute>
          } />

          <Route path="/account/billing" element={
            <ProtectedRoute>
              <PlaceholderPage title="Billing" phase={10} />
            </ProtectedRoute>
          } />

          <Route path="/share/:token" element={<PlaceholderPage title="Shared Report" phase={7} />} />

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

function PlaceholderPage({ title, phase }) {
  return (
    <div
      className="flex-1 flex items-center justify-center px-4 py-24 text-center"
      style={{ background: 'linear-gradient(135deg, #E1F5EE 0%, #E6F1FB 100%)' }}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="text-xs font-medium text-teal uppercase tracking-widest bg-white border border-teal-light px-3 py-1 rounded-pill">
          Coming in Phase {phase}
        </div>
        <h1 className="text-2xl font-medium text-navy" style={{ letterSpacing: '-0.2px' }}>{title}</h1>
        <p className="text-sm text-subtle max-w-xs">This section is being built. Check back soon.</p>
      </div>
    </div>
  )
}
