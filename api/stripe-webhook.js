import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const PRICE_TO_PLAN = {
  'price_1TUQ2v42zEKI9M7x7cL23QhD': { plan: 'solo',   billingPeriod: 'monthly' },
  'price_1TUQ2v42zEKI9M7xxQUMUJ6d': { plan: 'solo',   billingPeriod: 'annual'  },
  'price_1TUQ3V42zEKI9M7xp7BACxdk': { plan: 'pro',    billingPeriod: 'monthly' },
  'price_1TUQ3V42zEKI9M7xvnrF066R': { plan: 'pro',    billingPeriod: 'annual'  },
  'price_1TUQ3x42zEKI9M7xvB7j13k4': { plan: 'agency', billingPeriod: 'monthly' },
  'price_1TUQ3x42zEKI9M7xHK7QCUMA': { plan: 'agency', billingPeriod: 'annual'  },
}

async function readRawBody(req) {
  if (req.rawBody) return Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.from(req.rawBody)
  const chunks = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const stripeKey     = process.env.STRIPE_SECRET_KEY
  const supabaseUrl   = process.env.SUPABASE_URL
  const serviceKey    = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!webhookSecret || !stripeKey || !supabaseUrl || !serviceKey) {
    console.error('[DashPlot] stripe-webhook — missing env vars')
    return res.status(500).json({ error: 'Server misconfiguration' })
  }

  const rawBody = await readRawBody(req)
  const sig = req.headers['stripe-signature']
  const stripe = new Stripe(stripeKey)

  let event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
  } catch (err) {
    console.error('[DashPlot] stripe-webhook — signature verification failed:', err.message)
    return res.status(400).json({ error: 'Webhook signature invalid' })
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object, supabase, stripe)
        break
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object, supabase)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object, supabase)
        break
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object, supabase)
        break
      default:
        break
    }
  } catch (err) {
    console.error('[DashPlot] stripe-webhook — handler error for', event.type, ':', err.message)
    return res.status(500).json({ error: 'Handler error' })
  }

  return res.status(200).json({ received: true })
}

async function handleCheckoutCompleted(session, supabase, stripe) {
  const userId        = session.metadata?.supabase_user_id
  const plan          = session.metadata?.plan
  const billingPeriod = session.metadata?.billing_period
  const customerId    = session.customer
  const subscriptionId = session.subscription

  if (!userId || !plan) {
    console.error('[DashPlot] stripe-webhook — checkout.session.completed missing metadata, session id:', session.id)
    return
  }

  const { error: userErr } = await supabase
    .from('users')
    .update({ plan, billing_period: billingPeriod })
    .eq('id', userId)

  if (userErr) console.error('[DashPlot] stripe-webhook — failed to update user plan:', userErr.message)

  let periodEnd = null
  if (subscriptionId) {
    try {
      const stripeSub = await stripe.subscriptions.retrieve(subscriptionId)
      periodEnd = new Date(stripeSub.current_period_end * 1000).toISOString()
    } catch (e) {
      console.error('[DashPlot] stripe-webhook — failed to retrieve subscription for period_end:', e.message)
    }
  }

  const { error: subErr } = await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: customerId,
      plan,
      status: 'active',
      billing_period: billingPeriod,
      current_period_end: periodEnd,
    }, { onConflict: 'stripe_subscription_id' })

  if (subErr) console.error('[DashPlot] stripe-webhook — failed to upsert subscription:', subErr.message)
}

async function handleSubscriptionUpdated(subscription, supabase) {
  const userId = subscription.metadata?.supabase_user_id
  if (!userId) return

  const priceId    = subscription.items?.data?.[0]?.price?.id
  const planInfo   = PRICE_TO_PLAN[priceId]
  const status     = subscription.status
  const periodEnd  = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null

  if (planInfo) {
    const { error } = await supabase
      .from('users')
      .update({ plan: planInfo.plan, billing_period: planInfo.billingPeriod })
      .eq('id', userId)
    if (error) console.error('[DashPlot] stripe-webhook — subscription.updated user update failed:', error.message)
  }

  const updateFields = { status, current_period_end: periodEnd }
  if (planInfo) {
    updateFields.plan = planInfo.plan
    updateFields.billing_period = planInfo.billingPeriod
  }

  const { error: subErr } = await supabase
    .from('subscriptions')
    .update(updateFields)
    .eq('stripe_subscription_id', subscription.id)

  if (subErr) console.error('[DashPlot] stripe-webhook — subscription.updated sub update failed:', subErr.message)
}

async function handleSubscriptionDeleted(subscription, supabase) {
  const userId = subscription.metadata?.supabase_user_id
  if (!userId) return

  const { error: userErr } = await supabase
    .from('users')
    .update({ plan: 'trial', billing_period: null })
    .eq('id', userId)

  if (userErr) console.error('[DashPlot] stripe-webhook — subscription.deleted user update failed:', userErr.message)

  const { error: subErr } = await supabase
    .from('subscriptions')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('stripe_subscription_id', subscription.id)

  if (subErr) console.error('[DashPlot] stripe-webhook — subscription.deleted sub update failed:', subErr.message)
}

async function handlePaymentFailed(invoice, supabase) {
  const subscriptionId = invoice.subscription
  if (!subscriptionId) return

  const { error } = await supabase
    .from('subscriptions')
    .update({ status: 'past_due' })
    .eq('stripe_subscription_id', subscriptionId)

  if (error) console.error('[DashPlot] stripe-webhook — invoice.payment_failed update failed:', error.message)
}
