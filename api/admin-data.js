import { createClient } from '@supabase/supabase-js'

const PLAN_MRR = {
  solo:   { monthly: 19,        annual: 190 / 12 },
  pro:    { monthly: 29,        annual: 290 / 12 },
  agency: { monthly: 79,        annual: 790 / 12 },
}

async function assertAdmin(supabase, token) {
  console.error('[DashPlot] admin-data assertAdmin — calling supabase.auth.getUser')
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error) {
    console.error('[DashPlot] admin-data assertAdmin — getUser error:', error.message, '| status:', error.status)
    return null
  }
  if (!user) {
    console.error('[DashPlot] admin-data assertAdmin — getUser returned no user (token may be expired or invalid)')
    return null
  }
  console.error('[DashPlot] admin-data assertAdmin — user authenticated, id:', user.id)

  console.error('[DashPlot] admin-data assertAdmin — querying users.is_admin for id:', user.id)
  const { data: profile, error: profileErr } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (profileErr) {
    console.error('[DashPlot] admin-data assertAdmin — profile query error:', profileErr.message, '| code:', profileErr.code)
    return null
  }
  console.error('[DashPlot] admin-data assertAdmin — profile.is_admin:', profile?.is_admin)

  return profile?.is_admin === true ? user : null
}

function mrrForSub(plan, billingPeriod) {
  const rates = PLAN_MRR[plan]
  if (!rates) return 0
  return billingPeriod === 'annual' ? rates.annual : rates.monthly
}

export default async function handler(req, res) {
  console.error('[DashPlot] admin-data — request received, method:', req.method, '| section:', req.query.section)

  if (req.method !== 'GET') return res.status(405).end()

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

  console.error('[DashPlot] admin-data — SUPABASE_URL present:', !!supabaseUrl)
  console.error('[DashPlot] admin-data — SUPABASE_SERVICE_ROLE_KEY present:', !!serviceKey)
  if (serviceKey) {
    console.error('[DashPlot] admin-data — SUPABASE_SERVICE_ROLE_KEY first 10 chars:', serviceKey.slice(0, 10))
  }

  if (!supabaseUrl || !serviceKey) {
    console.error('[DashPlot] admin-data — FATAL: missing env vars. supabaseUrl:', !!supabaseUrl, '| serviceKey:', !!serviceKey)
    return res.status(500).json({ error: 'Server misconfiguration' })
  }

  const authHeader = req.headers.authorization ?? ''
  console.error('[DashPlot] admin-data — Authorization header present:', authHeader.startsWith('Bearer '), '| length:', authHeader.length)

  if (!authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
  const token = authHeader.slice(7)
  console.error('[DashPlot] admin-data — token length:', token.length, '| first 10 chars:', token.slice(0, 10))

  console.error('[DashPlot] admin-data — creating Supabase client with service role key')
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.error('[DashPlot] admin-data — calling assertAdmin')
  const admin = await assertAdmin(supabase, token)
  if (!admin) {
    console.error('[DashPlot] admin-data — assertAdmin returned null, responding 403')
    return res.status(403).json({ error: 'Forbidden' })
  }
  console.error('[DashPlot] admin-data — admin verified, user id:', admin.id)

  const section = req.query.section ?? 'overview'
  const search  = (req.query.search ?? '').trim()
  console.error('[DashPlot] admin-data — section:', section, '| search:', search || '(none)')

  try {
    // ── Overview ────────────────────────────────────────────────────────────
    if (section === 'overview') {
      console.error('[DashPlot] admin-data — querying users and subscriptions for overview')
      const [usersRes, subsRes] = await Promise.all([
        supabase.from('users').select('plan, created_at').is('deleted_at', null),
        supabase.from('subscriptions').select('plan, billing_period, status, cancelled_at'),
      ])

      if (usersRes.error) console.error('[DashPlot] admin-data — users query error:', usersRes.error.message, '| code:', usersRes.error.code)
      if (subsRes.error)  console.error('[DashPlot] admin-data — subscriptions query error:', subsRes.error.message, '| code:', subsRes.error.code)

      console.error('[DashPlot] admin-data — overview users count:', usersRes.data?.length ?? 'null', '| subs count:', subsRes.data?.length ?? 'null')

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

      console.error('[DashPlot] admin-data — overview computed, mrr:', mrr, '| totalUsers:', totalUsers)
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
      console.error('[DashPlot] admin-data — querying users table, search:', search || '(none)')
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
      if (error) {
        console.error('[DashPlot] admin-data — users section query error:', error.message, '| code:', error.code)
        throw error
      }
      console.error('[DashPlot] admin-data — users section returned:', data?.length ?? 0, 'rows')
      return res.status(200).json({ users: data ?? [] })
    }

    // ── Revenue ───────────────────────────────────────────────────────────────
    if (section === 'revenue') {
      console.error('[DashPlot] admin-data — querying subscriptions for revenue section')
      const { data: activeSubs, error: activeErr } = await supabase
        .from('subscriptions')
        .select('plan, billing_period, status, created_at')
        .eq('status', 'active')

      if (activeErr) console.error('[DashPlot] admin-data — activeSubs query error:', activeErr.message)
      console.error('[DashPlot] admin-data — activeSubs count:', activeSubs?.length ?? 'null')

      const planBreakdown = ['solo', 'pro', 'agency'].map(plan => {
        const planSubs = (activeSubs ?? []).filter(s => s.plan === plan)
        const mrr = planSubs.reduce((sum, s) => sum + mrrForSub(plan, s.billing_period), 0)
        return { plan, count: planSubs.length, mrr: Math.round(mrr * 100) / 100 }
      })

      const { data: allSubs, error: allSubsErr } = await supabase
        .from('subscriptions')
        .select('plan, billing_period, status, created_at')
        .order('created_at', { ascending: true })

      if (allSubsErr) console.error('[DashPlot] admin-data — allSubs query error:', allSubsErr.message)

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
      console.error('[DashPlot] admin-data — querying reports table')
      const { data: reports, error: reportsErr } = await supabase
        .from('reports')
        .select('user_id, data_source, created_at')
        .is('deleted_at', null)

      if (reportsErr) console.error('[DashPlot] admin-data — reports query error:', reportsErr.message)
      console.error('[DashPlot] admin-data — reports count:', reports?.length ?? 'null')

      const totalReports = (reports ?? []).length

      const userCounts = {}
      const sourceCounts = {}
      for (const r of (reports ?? [])) {
        userCounts[r.user_id]       = (userCounts[r.user_id]       ?? 0) + 1
        sourceCounts[r.data_source] = (sourceCounts[r.data_source] ?? 0) + 1
      }

      const topUserIds = Object.entries(userCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([id]) => id)

      let topUsers = []
      if (topUserIds.length > 0) {
        const { data: users, error: usersErr } = await supabase
          .from('users')
          .select('id, email, display_name, plan')
          .in('id', topUserIds)
        if (usersErr) console.error('[DashPlot] admin-data — topUsers query error:', usersErr.message)
        topUsers = (users ?? [])
          .map(u => ({ ...u, reportCount: userCounts[u.id] ?? 0 }))
          .sort((a, b) => b.reportCount - a.reportCount)
      }

      const sourceBreakdown = Object.entries(sourceCounts).map(([source, count]) => ({ source, count }))

      return res.status(200).json({ totalReports, topUsers, sourceBreakdown })
    }

    // ── Referrals ──────────────────────────────────────────────────────────────
    if (section === 'referrals') {
      console.error('[DashPlot] admin-data — querying referrals table')
      const { data: referrals, error: referralsErr } = await supabase
        .from('referrals')
        .select('id, referrer_id, referred_id, status, converted_at, reward_applied_at, created_at')
        .order('created_at', { ascending: false })

      if (referralsErr) console.error('[DashPlot] admin-data — referrals query error:', referralsErr.message)
      console.error('[DashPlot] admin-data — referrals count:', referrals?.length ?? 'null')

      if (!referrals?.length) return res.status(200).json({ referrals: [] })

      const userIds = [...new Set([
        ...referrals.map(r => r.referrer_id),
        ...referrals.map(r => r.referred_id),
      ])]

      const { data: users, error: usersErr } = await supabase
        .from('users')
        .select('id, email, display_name, plan')
        .in('id', userIds)

      if (usersErr) console.error('[DashPlot] admin-data — referrals users enrichment error:', usersErr.message)

      const userMap = Object.fromEntries((users ?? []).map(u => [u.id, u]))

      const enriched = referrals.map(r => ({
        ...r,
        referrer: userMap[r.referrer_id] ?? { email: r.referrer_id },
        referred: userMap[r.referred_id] ?? { email: r.referred_id },
      }))

      return res.status(200).json({ referrals: enriched })
    }

    console.error('[DashPlot] admin-data — unknown section:', section)
    return res.status(400).json({ error: 'Unknown section' })
  } catch (err) {
    console.error('[DashPlot] admin-data — unhandled error in section', section, ':', err.message)
    console.error('[DashPlot] admin-data — stack:', err.stack)
    return res.status(500).json({ error: 'Internal error' })
  }
}
