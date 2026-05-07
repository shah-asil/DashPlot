import Stripe from 'stripe'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const adminSecret = req.headers['x-admin-secret']
  if (!adminSecret || adminSecret !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    return res.status(500).json({ error: 'STRIPE_SECRET_KEY missing' })
  }

  const stripe = new Stripe(stripeKey)
  const results = {}

  const coupons = [
    {
      id: 'REFERRAL20',
      percent_off: 20,
      duration: 'repeating',
      duration_in_months: 2,
      name: '20% off first 2 months (referral)',
    },
    {
      id: 'RETENTION30',
      percent_off: 30,
      duration: 'repeating',
      duration_in_months: 3,
      name: '30% off for 3 months (retention)',
    },
  ]

  for (const couponData of coupons) {
    try {
      await stripe.coupons.retrieve(couponData.id)
      results[couponData.id] = 'already exists'
    } catch {
      try {
        const created = await stripe.coupons.create(couponData)
        results[couponData.id] = created.id
      } catch (err) {
        console.error('[DashPlot] setup-stripe-coupons — failed to create', couponData.id, ':', err.message)
        results[couponData.id] = `error: ${err.message}`
      }
    }
  }

  return res.status(200).json({ coupons: results })
}
