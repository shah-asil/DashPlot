import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { sleep } from '../lib/utils'
import posthog from '../lib/posthog'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      if (data) {
        setProfile(data)
        setLoading(false)
        posthog.identify(userId, { email: data.email, plan: data.plan })
        return data
      }
      if (i < retries - 1) await sleep(1000)
    }
    setLoading(false)
    return null
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
        if (event === 'SIGNED_IN') {
          const u = session.user
          const isGoogle = u.app_metadata?.provider === 'google'
          const isNew = Math.abs(new Date(u.created_at) - new Date(u.last_sign_in_at)) < 10000
          if (isGoogle && isNew) {
            posthog.capture('signup_completed', { method: 'google' })
          }
        }
      } else {
        setProfile(null)
        setLoading(false)
        posthog.reset()
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  async function signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) return { success: false, userMessage: error.message }

    const referralCode = localStorage.getItem('dashplot_referral_code')
    if (referralCode && data.user) {
      const { data: referrer } = await supabase
        .from('users')
        .select('id')
        .eq('referral_code', referralCode)
        .single()

      if (referrer) {
        await supabase.from('users').update({ referred_by: referrer.id }).eq('id', data.user.id)
        await supabase.from('referrals').insert({
          referrer_id: referrer.id,
          referred_id: data.user.id,
          status: 'pending',
        })
      }
      localStorage.removeItem('dashplot_referral_code')
    }

    return { success: true, data }
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { success: false, userMessage: error.message }
    return { success: true, data }
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
    if (error) return { success: false, userMessage: error.message }
    return { success: true }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function completeOnboarding(answers) {
    const displayName = user.email.split('@')[0]
    const { error } = await supabase
      .from('users')
      .update({ display_name: displayName })
      .eq('id', user.id)

    if (error) return { success: false, userMessage: 'Could not save your preferences. Please try again.' }

    localStorage.setItem('dashplot_onboarding_answers', JSON.stringify(answers))
    await fetchProfile(user.id)
    return { success: true }
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, signIn, signInWithGoogle, signOut, fetchProfile, completeOnboarding }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
