import { createClient } from '@supabase/supabase-js'

const PLAN_MRR = {
  solo:   { monthly: 19,        annual: 190 / 12 },
  pro:    { monthly: 29,        annual: 290 / 12 },
  agency: { monthly: 79,        annual: 790 / 12 },
}

async function assertAdmin(supabase, token) {
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  const { data: profile } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
  return profile?.is_admin === true ? user : null
}

function mrrForSub(plan, billingPeriod) {
  const rates = PLAN_MRR[plan]
  if (!rates) return 0
  return billingPeriod === 'annual' ? rates.annual : rates.monthly
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    console.error('[DashPlot] admin-data — missing env vars')
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

  const section = req.query.section ?? 'overview'
  const search  = (req.query.search ?? '').trim()

  try {
    // ── Overview ────────────────────────────────────────────────────────────
    if (section === 'overview') {
      const [usersRes, subsRes] = await Promise.all([
        supabase.from('users').select('plan, created_at').is('deleted_at', null),
        supabase.from('subscriptions').select('plan, billing_period, status, cancelled_at'),
      ])

      const users = usersRes.data ?? []
      const subs  = subsRes.data ?? []

      const totalUsers = users.length
      const paidUsers  = users.filter(u => u.plan !== 'trial').length
      const conversionRate = totalUsers > 0
        ? ((paidUsers / totalUsers) * 100).toFixed(1)
        : '0.0'

      const activeSubs = subs.filter(s => s.status === 'active')
      const mrr = activeSubs.reduce((sum, s) => sum + mrrForSub(s.plan, s.billing_period), 0)

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const cancelledRecent = subs.filter(s => s.cancelled_at && s.cancelled_at > thirtyDaysAgo).length
      const denominator = activeSubs.length + cancelledRecent
      const churnRate = denominator > 0
        ? ((cancelledRecent / denominator) * 100).toFixed(1)
        : '0.0'

      const planBreakdown = ['trial', 'solo', 'pro', 'agency'].map(plan => ({
        plan,
        count: users.filter(u => u.plan === plan).length,
      }))

      return res.status(200).json({
        mrr: Math.round(mrr * 100) / 100,
        totalUsers,
        paidUsers,
        conversionRate,
        churnRate,
        planBreakdown,
      })
    }

    // ── Users ────────────────────────────────────────────────────────────────
    if (section === 'users') {
      let query = supabase
        .from('users')
        .select('id, email, display_name, plan, billing_period, trial_ends_at, trial_reports_used, created_at, is_admin')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(200)

      if (search) {
        query = query.or(`email.ilike.%${search}%,display_name.ilike.%${search}%`)
      }

      const { data, error } = await query
      if (error) throw error
      return res.status(200).json({ users: data ?? [] })
    }

    // ── Revenue ───────────────────────────────────────────────────────────────
    if (section === 'revenue') {
      const { data: activeSubs } = await supabase
        .from('subscriptions')
        .select('plan, billing_period, status, created_at')
        .eq('status', 'active')

      const planBreakdown = ['solo', 'pro', 'agency'].map(plan => {
        const planSubs = (activeSubs ?? []).filter(s => s.plan === plan)
        const mrr = planSubs.reduce((sum, s) => sum + mrrForSub(plan, s.billing_period), 0)
        return { plan, count: planSubs.length, mrr: Math.round(mrr * 100) / 100 }
      })

      const { data: allSubs } = await supabase
        .from('subscriptions')
        .select('plan, billing_period, status, created_at')
        .order('created_at', { ascending: true })

      const mrrByMonth = {}
      for (const sub of (allSubs ?? [])) {
        if (sub.status !== 'active') continue
        const month = sub.created_at.slice(0, 7)
        mrrByMonth[month] = (mrrByMonth[month] ?? 0) + mrrForSub(sub.plan, sub.billing_period)
      }

      const mrrHistory = Object.entries(mrrByMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, mrr]) => ({ month, mrr: Math.round(mrr * 100) / 100 }))

      return res.status(200).json({ planBreakdown, mrrHistory })
    }

    // ── Reports ────────────────────────────────────────────────────────────────
    if (section === 'reports') {
      const { data: reports } = await supabase
        .from('reports')
        .select('user_id, data_source, created_at')
        .is('deleted_at', null)

      const totalReports = (reports ?? []).length

      const userCounts = {}
      const sourceCounts = {}
      for (const r of (reports ?? [])) {
        userCounts[r.user_id]  = (userCounts[r.user_id]  ?? 0) + 1
        sourceCounts[r.data_source] = (sourceCounts[r.data_source] ?? 0) + 1
      }

      const topUserIds = Object.entries(userCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([id]) => id)

      let topUsers = []
      if (topUserIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, email, display_name, plan')
          .in('id', topUserIds)
        topUsers = (users ?? [])
          .map(u => ({ ...u, reportCount: userCounts[u.id] ?? 0 }))
          .sort((a, b) => b.reportCount - a.reportCount)
      }

      const sourceBreakdown = Object.entries(sourceCounts).map(([source, count]) => ({ source, count }))

      return res.status(200).json({ totalReports, topUsers, sourceBreakdown })
    }

    // ── Referrals ──────────────────────────────────────────────────────────────
    if (section === 'referrals') {
      const { data: referrals } = await supabase
        .from('referrals')
        .select('id, referrer_id, referred_id, status, converted_at, reward_applied_at, created_at')
        .order('created_at', { ascending: false })

      if (!referrals?.length) return res.status(200).json({ referrals: [] })

      const userIds = [...new Set([
        ...referrals.map(r => r.referrer_id),
        ...referrals.map(r => r.referred_id),
      ])]

      const { data: users } = await supabase
        .from('users')
        .select('id, email, display_name, plan')
        .in('id', userIds)

      const userMap = Object.fromEntries((users ?? []).map(u => [u.id, u]))

      const enriched = referrals.map(r => ({
        ...r,
        referrer: userMap[r.referrer_id] ?? { email: r.referrer_id },
        referred: userMap[r.referred_id] ?? { email: r.referred_id },
      }))

      return res.status(200).json({ referrals: enriched })
    }

    return res.status(400).json({ error: 'Unknown section' })
  } catch (err) {
    console.error('[DashPlot] admin-data — error:', err.message)
    return res.status(500).json({ error: 'Internal error' })
  }
}
