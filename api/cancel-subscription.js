import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const stripeKey   = process.env.STRIPE_SECRET_KEY
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!stripeKey || !supabaseUrl || !serviceKey) {
    console.error('[DashPlot] cancel-subscription — missing env vars')
    return res.status(500).json({ error: 'Server misconfiguration' })
  }

  const authHeader = req.headers.authorization ?? ''
  if (!authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
  const token = authHeader.slice(7)

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return res.status(401).json({ error: 'Invalid session' })

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id, stripe_subscription_id, status, created_at, current_period_end')
    .eq('user_id', user.id)
    .in('status', ['active', 'past_due'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!sub?.stripe_subscription_id) {
    return res.status(404).json({ error: 'No active subscription found' })
  }

  try {
    const stripe = new Stripe(stripeKey)
    const updated = await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: true,
    })

    await supabase
      .from('subscriptions')
      .update({ cancelled_at: new Date().toISOString() })
      .eq('id', sub.id)

    const endsAt = sub.current_period_end
      ?? (updated.current_period_end
        ? new Date(updated.current_period_end * 1000).toISOString()
        : null)

    return res.status(200).json({ success: true, ends_at: endsAt })
  } catch (err) {
    console.error('[DashPlot] cancel-subscription — Stripe error:', err.message)
    return res.status(500).json({ error: 'Failed to cancel subscription' })
  }
}
