import { createClient } from '@supabase/supabase-js'

const VALID_PLANS = ['trial', 'solo', 'pro', 'agency']

async function assertAdmin(supabase, token) {
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  const { data: profile } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
  return profile?.is_admin === true ? user : null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    console.error('[DashPlot] admin-action — missing env vars')
    return res.status(500).json({ error: 'Server misconfiguration' })
  }

  const authHeader = req.headers.authorization ?? ''
  if (!authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
  const token = authHeader.slice(7)

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const admin = await assertAdmin(supabase, token)
  if (!admin) return res.status(403).json({ error: 'Forbidden' })

  const { action, userId, referralId, plan, days } = req.body ?? {}

  try {
    // ── Extend trial ──────────────────────────────────────────────────────────
    if (action === 'extend_trial') {
      if (!userId) return res.status(400).json({ error: 'userId required' })

      const { data: userData } = await supabase
        .from('users')
        .select('trial_ends_at')
        .eq('id', userId)
        .single()

      const base = userData?.trial_ends_at ? new Date(userData.trial_ends_at) : new Date()
      if (base < new Date()) base.setTime(Date.now())
      base.setDate(base.getDate() + (Number(days) || 7))

      const { error } = await supabase
        .from('users')
        .update({ trial_ends_at: base.toISOString() })
        .eq('id', userId)

      if (error) throw error
      return res.status(200).json({ success: true, trial_ends_at: base.toISOString() })
    }

    // ── Change plan ───────────────────────────────────────────────────────────
    if (action === 'change_plan') {
      if (!userId) return res.status(400).json({ error: 'userId required' })
      if (!VALID_PLANS.includes(plan)) return res.status(400).json({ error: 'Invalid plan' })

      const { error } = await supabase
        .from('users')
        .update({ plan })
        .eq('id', userId)

      if (error) throw error
      return res.status(200).json({ success: true })
    }

    // ── Apply referral reward ─────────────────────────────────────────────────
    if (action === 'apply_reward') {
      if (!referralId) return res.status(400).json({ error: 'referralId required' })

      const { error } = await supabase
        .from('referrals')
        .update({ reward_applied_at: new Date().toISOString() })
        .eq('id', referralId)

      if (error) throw error
      return res.status(200).json({ success: true })
    }

    return res.status(400).json({ error: 'Unknown action' })
  } catch (err) {
    console.error('[DashPlot] admin-action — error:', err.message)
    return res.status(500).json({ error: 'Internal error' })
  }
}
