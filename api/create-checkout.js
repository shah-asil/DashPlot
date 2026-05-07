import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const PRICE_IDS = {
  solo_monthly:   'price_1TUQ2v42zEKI9M7x7cL23QhD',
  solo_annual:    'price_1TUQ2v42zEKI9M7xxQUMUJ6d',
  pro_monthly:    'price_1TUQ3V42zEKI9M7xp7BACxdk',
  pro_annual:     'price_1TUQ3V42zEKI9M7xvnrF066R',
  agency_monthly: 'price_1TUQ3x42zEKI9M7xvB7j13k4',
  agency_annual:  'price_1TUQ3x42zEKI9M7xHK7QCUMA',
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const stripeKey   = process.env.STRIPE_SECRET_KEY
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!stripeKey || !supabaseUrl || !serviceKey) {
    console.error('[DashPlot] create-checkout — missing env vars')
    return res.status(500).json({ error: 'Server misconfiguration' })
  }

  const authHeader = req.headers.authorization ?? ''
  if (!authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
  const token = authHeader.slice(7)

  const { plan, billingPeriod } = req.body ?? {}
  if (!plan || !billingPeriod) return res.status(400).json({ error: 'plan and billingPeriod required' })

  const priceId = PRICE_IDS[`${plan}_${billingPeriod}`]
  if (!priceId) return res.status(400).json({ error: `Unknown plan: ${plan}/${billingPeriod}` })

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return res.status(401).json({ error: 'Invalid session' })

  const { data: profile } = await supabase
    .from('users')
    .select('email, referred_by')
    .eq('id', user.id)
    .single()

  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const stripe = new Stripe(stripeKey)

  let customerId = existingSub?.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile?.email ?? user.email,
      metadata: { supabase_user_id: user.id },
    })
    customerId = customer.id
  }

  const origin = req.headers.origin ?? 'https://dashplot.vercel.app'

  const sessionParams = {
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/dashboard?upgraded=1`,
    cancel_url: `${origin}/upgrade`,
    subscription_data: {
      metadata: { supabase_user_id: user.id, plan, billing_period: billingPeriod },
    },
    metadata: { supabase_user_id: user.id, plan, billing_period: billingPeriod },
  }

  if (profile?.referred_by) {
    sessionParams.discounts = [{ coupon: 'REFERRAL20' }]
  }

  try {
    const session = await stripe.checkout.sessions.create(sessionParams)
    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('[DashPlot] create-checkout — Stripe error:', err.message)
    return res.status(500).json({ error: 'Failed to create checkout session' })
  }
}
