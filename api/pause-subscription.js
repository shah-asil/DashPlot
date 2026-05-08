import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const stripeKey   = process.env.STRIPE_SECRET_KEY
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!stripeKey || !supabaseUrl || !serviceKey) {
    console.error('[DashPlot] pause-subscription — missing env vars')
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
    .select('stripe_subscription_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!sub?.stripe_subscription_id) {
    return res.status(404).json({ error: 'No active subscription found' })
  }

  try {
    const stripe = new Stripe(stripeKey)
    const resumesAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 60 // 60 days
    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      pause_collection: { behavior: 'mark_uncollectable', resumes_at: resumesAt },
    })
    return res.status(200).json({ success: true, resumes_at: new Date(resumesAt * 1000).toISOString() })
  } catch (err) {
    console.error('[DashPlot] pause-subscription — Stripe error:', err.message)
    return res.status(500).json({ error: 'Failed to pause subscription' })
  }
}
