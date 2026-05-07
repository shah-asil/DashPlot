# DashPlot — CLAUDE.md

You are building **DashPlot**: an AI-powered data visualisation SaaS.
Users upload CSV/Excel files or connect Google Sheets → DashPlot auto-generates
beautiful dashboards, writes an AI narrative summary, and provides a shareable link.

Read this file fully before writing any code. Follow every rule here exactly.

---

## What You Are Building

- **Product:** DashPlot
- **Tagline:** "Your data deserves better than a spreadsheet."
- **Target users:** SMEs and marketing teams
- **Goal:** $1,000/month MRR. No human intervention once live.
- **Domain:** dashplot.vercel.app (launch) → dashplot.com (after first paying users)

---

## Tech Stack — Use Exactly These, No Substitutions

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Styling | Tailwind CSS (mobile-first, responsive) |
| Charts | Recharts — ALWAYS wrap in ResponsiveContainer |
| Database + Auth | Supabase (RLS already enabled on all tables) |
| AI insights | Anthropic Claude API (claude-sonnet-4-20250514) |
| Payments | Stripe (subscriptions + webhooks + coupons) |
| Email | Resend (transactional only) |
| Analytics | PostHog |
| PDF export | html2canvas + jsPDF |
| CSV parsing | PapaParse |
| Excel parsing | SheetJS |
| Hosting | Vercel (auto-deploy on push to main) |
| Font | Inter from Google Fonts — weights 400 and 500 ONLY |

**Never introduce new libraries without asking first.**

---

## Environment Variables

All secrets live in `.env` (local) and Vercel Environment Variables (production).
Never hardcode any key. Always read from `import.meta.env.VITE_*` for frontend,
`process.env.*` for server-side (Vercel functions).

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
VITE_ANTHROPIC_API_KEY
VITE_STRIPE_PUBLISHABLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
VITE_POSTHOG_KEY
RESEND_API_KEY
```

---

## Brand & Design — Follow Exactly

### Colours
```
Primary accent (teal):   #1D9E75
Light accent:            #9FE1CB
Mint surface:            #E1F5EE
Navy (headings, logo):   #185FA5
Hero gradient:           #E1F5EE → #E6F1FB
Success / positive:      #1D9E75
Error / negative:        #E24B4A
Subtle text:             #B4B2A9
AI card text:            #085041
Gold peak dot:           #EF9F27
```

### Typography
- Font: Inter from Google Fonts
- Weights: 400 and 500 only — never bold (700) except logo wordmark
- Headings: letter-spacing -0.2px

### Components
- **Primary button:** `#1D9E75` background, white text, `border-radius: 99px`
- **Secondary button:** `#E1F5EE` background, `#0F6E56` text, teal border, `border-radius: 99px`
- **Cards:** white bg, `border: 0.5px solid #E1F5EE`, `border-radius: 10px`, subtle teal box-shadow
- **Inputs:** pill shape `border-radius: 99px`, teal border on focus
- **AI insight card:** `#E1F5EE` bg, `#9FE1CB` border, `#085041` text — always visually distinct from regular cards
- **Chart colours in order:** `#1D9E75`, `#9FE1CB`, `#185FA5`, `#EF9F27`
- **Border radius scale:** 99px (buttons/inputs), 10px (cards), 4px (small elements)
- **Spacing scale:** 4 / 8 / 12 / 16 / 24 / 32 / 48px only

### Logo
- Icon: gradient hexagon (teal → navy), white EKG/pulse line inside, gold peak dot
- Wordmark: `Dash` in bold `#185FA5` + `Plot` in regular `#1D9E75`, no space
- Tagline under logo: "Upload. Analyse. Share." in `#B4B2A9`, letter-spacing 3px

---

## Database — Already Created in Supabase

**Do NOT run CREATE TABLE or ALTER TABLE.** The schema already exists.
Work with these tables exactly as defined:

### public.users
```
id                  uuid  PK — matches auth.users.id
email               text
display_name        text
plan                text  'trial' | 'solo' | 'pro' | 'agency'  ← ONLY source of truth for access
trial_ends_at       timestamptz
trial_reports_used  int
billing_period      text  'monthly' | 'annual' | null
referral_code       text
referred_by         uuid
is_admin            boolean
deleted_at          timestamptz
created_at          timestamptz
```

### public.subscriptions
```
id, user_id, stripe_subscription_id, stripe_customer_id,
plan, status, billing_period, current_period_end, cancelled_at, created_at
```

### public.reports
```
id, user_id, title, data_source, raw_data (jsonb),
column_config (jsonb), chart_config (jsonb), ai_summary,
share_token, is_shared, deleted_at, created_at
```

### public.report_history
```
id, report_id, user_id, snapshot_data (jsonb),
ai_summary, period_label, created_at
```

### public.referrals
```
id, referrer_id, referred_id, status, converted_at, reward_applied_at, created_at
```

### public.sheet_connections
```
id, user_id, report_id, sheet_id, sheet_name,
access_token, refresh_token, last_synced_at, token_expires_at, created_at
```

### Database Rules — Never Break These
- RLS is enabled on ALL tables — never disable it
- `users.plan` is the ONLY field that controls feature access — never check stripe status directly in UI
- **Never use DELETE** — always set `deleted_at = now()` (soft delete)
- Reports with `share_token` are accessible without auth when `is_shared = true`
- `sheet_connections.access_token` must be encrypted via Supabase Vault

---

## Feature Gates by Plan

Check `users.plan` for every gated feature. Never gate on subscription status.

| Feature | trial | solo | pro | agency |
|---|---|---|---|---|
| Reports | max 3 | unlimited | unlimited | unlimited |
| Chart types | bar + line only | all except scatter/funnel | all | all |
| AI insight | first sentence only (rest blurred) | full | full | full |
| Dashboard layout | 1 fixed template | custom | custom | custom |
| Sharing | ❌ | ✅ (DashPlot branding) | ✅ (white-label) | ✅ |
| PDF export | ❌ | ❌ | ✅ | ✅ |
| Google Sheets | ❌ | ❌ | ✅ | ✅ |
| Password protection | ❌ | ❌ | ✅ | ✅ |
| Workspaces | 1 | 1 | 3 | unlimited |
| Seats | 1 | 1 | 1 | 5 |
| History retention | none | 3 months | 12 months | unlimited |

### Upgrade Prompts — Always Inline, Never Full-Screen Modal
1. Sharing → inline banner + "Unlock sharing" button
2. AI insight → blurred text + "Read full insight" button directly below
3. Locked chart → greyed out with lock icon, banner appears on click
4. 3rd trial report created → celebratory message + soft upgrade nudge
5. PDF export → locked buttons + inline banner

Persistent trial status bar on every authenticated page: days left + reports used.

---

## Pricing

| Plan | Monthly | Annual |
|---|---|---|
| Solo | $19 | $190 |
| Pro | $29 | $290 |
| Agency | $79 | $790 |

Annual = 2 months free. Trial = 14 days, no credit card required.

---

## Error Handling — Apply to Every External API Call

```javascript
async function callWithRetry(fn, userMessage) {
  try {
    return { success: true, data: await fn() };
  } catch (error) {
    console.error('[DashPlot]', error);
    if (error.status === 503 || error.status === 429) {
      await sleep(3000);
      try { return { success: true, data: await fn() }; }
      catch (e) { console.error('[DashPlot] retry failed', e); }
    }
    return { success: false, userMessage };
  }
}
```

- **Never** show raw errors or stack traces to users
- Always provide a next action in every error message
- Partial success > total failure: if AI summary fails, still show the charts
- Show rotating progress messages every 3s during dashboard generation
- 404 on shared report page → show conversion CTA: "Try DashPlot free"

---

## Mobile Responsiveness — Non-Negotiable

- Every component uses Tailwind responsive prefixes: `sm:` `md:` `lg:`
- Mobile-first by default — style mobile first, then override for larger screens
- Recharts: always use `<ResponsiveContainer width="100%" height={300}>`
- Dashboard creator: if `window.innerWidth < 768`, show notice with "Continue anyway" option
- CSV upload preview: same mobile notice at < 768px
- Shared report page: fully responsive, this is priority #1 for mobile
- Navbar: hamburger menu on mobile
- All tap targets: minimum 44px height

---

## PostHog Analytics — Track Exactly These 12 Events

```javascript
posthog.capture('page_viewed',             { page_name })
posthog.capture('signup_completed',        { method })           // 'email' | 'google'
posthog.capture('onboarding_completed',    { business_type, data_preference })
posthog.capture('file_uploaded',           { file_type, row_count })
posthog.capture('report_created',          { chart_types, data_source })
posthog.capture('ai_insight_generated',    { report_id })
posthog.capture('upgrade_prompt_seen',     { gate_type })        // 'sharing'|'ai'|'chart'|'report_limit'|'pdf'
posthog.capture('upgrade_clicked',         { gate_type, plan_shown })
posthog.capture('upgrade_completed',       { plan_name, billing_period })
posthog.capture('report_shared',           { report_id })
posthog.capture('cancellation_initiated',  { cancellation_reason })
posthog.capture('cancellation_completed',  { plan, months_active })
```

No other events. Do not rename these.

---

## File Upload Rules

- Accepted: `.csv`, `.xlsx`, `.xls` — max 10MB
- Not supported in v1: PDF, images, multi-sheet combining
- Parse CSV with PapaParse, Excel with SheetJS

### Data Preview Step (between upload and dashboard generation)
1. Show parsed data table — "Does this look right?"
2. Flag issues: merged cells, missing headers, ambiguous dates, non-numeric columns
3. Column selector — user picks which columns to chart (X axis, Y axis, series)
4. "Looks good — generate dashboard" button

### Auto-Cleaning
- Strip currency symbols (£, $, €)
- Standardise date formats to ISO
- Handle null/empty values gracefully
- Auto-detect header row position

Link to `/guide` from upload screen for file prep tips.

---

## Onboarding Flow

1. Signup (email+password OR Google OAuth) — no credit card
2. 3-question wizard: business type / metric to track / preferred data source — single click answers
3. Sample dashboard pre-loaded based on wizard answers
4. Upload prompt: "This is sample data — upload your own CSV to see your real data"
5. First real dashboard generated
6. Welcome email sent via Resend

Rules:
- No forced product tour before first dashboard
- Blurred AI insight visible from day 1 even on sample data
- Trial status bar always visible after signup

---

## Auth Rules

- Email + password signup and Google OAuth both supported
- No credit card at signup
- On signup: Supabase trigger auto-creates `public.users` row
- Session managed by Supabase Auth — use `supabase.auth.getUser()` server-side for protected routes
- After trial expires: account goes read-only (can view but not create/edit)
- Data permanently deleted at Day 37 post-trial-expiry

---

## Stripe Integration

- Subscriptions only — no one-time payments
- Webhook endpoint at `/api/stripe-webhook` handles:
  - `checkout.session.completed` → update `users.plan` + insert into `subscriptions`
  - `customer.subscription.updated` → update plan/status
  - `customer.subscription.deleted` → set plan back to 'trial', update subscription status
  - `invoice.payment_failed` → set subscription status to 'past_due'
- Always update `users.plan` from webhook — never trust client-side plan updates
- Referral discount: 20% off first 2 months as Stripe coupon auto-applied at checkout
- Referrer reward: 1 month free Stripe credit auto-applied after referred user converts

### Cancellation Flow (Smart Retention)
Show reason selector before cancelling:
- Too expensive → offer 30% off for 3 months
- Not using it → offer 2-month pause
- Missing feature → log feature request + promise to notify
- Switching tools → ask what the competitor does better (log answer)
- Just testing → offer downgrade to Solo

Post-cancellation: trigger 30-day re-engagement email with 20% discount.

---

## Resend Emails

Trigger these emails via Resend. Use React Email templates with DashPlot brand colours.

| Trigger | Email |
|---|---|
| Signup | Welcome + trial status |
| Trial Day 10 | Soft nudge — "4 days left" |
| Trial Day 13 | Upgrade offer with small discount |
| Trial Day 14 | Final day warning |
| Trial Day 30 | Re-engagement — "your data is still here" |
| Subscription active | Payment confirmation |

From address: `hello@dashplot.com`
All emails link to FAQ at `/faq`.

---

## Admin Panel (/admin)

- Hidden route — no link anywhere in public UI
- Gate with server-side check: `users.is_admin = true` — redirect to `/` silently if false
- Session timeout: 2 hours inactivity
- Sections:
  - **Overview:** MRR, trial→paid conversion rate, churn rate
  - **Users:** searchable table, extend trial (1-click), change plan manually
  - **Revenue:** MRR over time chart, plan breakdown
  - **Reports:** usage stats, most active users
  - **Referrals:** all referral relationships, manual reward application
- Build trial extension first — it's the most important admin action

---

## Referral Program

- Referral link: `dashplot.com/ref/{referral_code}` (code stored in `users.referral_code`)
- Referred user: 20% off first 2 months auto-applied at Stripe checkout
- Referrer reward: 1 month free Stripe credit after referred user converts to paid
- No cap on rewards
- Show referral prompt: after first successful report AND after upgrading
- Track in `public.referrals` table

---

## Routing Structure

```
/                   Landing page (public)
/signup             Signup page
/login              Login page
/onboarding         3-question wizard (auth required)
/dashboard          Main app — report list (auth required)
/dashboard/new      Upload + data preview (auth required)
/dashboard/:id      View/edit a specific report (auth required)
/share/:token       Public shared report (no auth)
/ref/:code          Referral landing (public, redirects to /signup)
/account            Account settings (auth required)
/account/billing    Billing + plan management (auth required)
/upgrade            Pricing + upgrade page (auth required)
/admin              Admin panel (is_admin required)
/privacy            Privacy Policy
/terms              Terms of Service
/faq                FAQ
/guide              File preparation guide
```

---

## SEO + Meta Tags

- Page title format: `DashPlot — [Page Name]`
- Meta description: "DashPlot — turn your CSV and spreadsheet data into beautiful AI-powered dashboards. Share reports in one click. Try free for 14 days."
- Favicon: hexagon logo icon, 32×32 and 16×16 PNG
- Open Graph image: 1200×630px, logo + tagline on teal gradient

---

## Legal Pages

- `/privacy` — Privacy Policy (Mauritius Data Protection Act 2017 + GDPR compliant)
- `/terms` — Terms of Service (governing law: Republic of Mauritius)
- Disclose Claude API data transmission in Privacy Policy
- Cookie notice on first visit for EU users
- Both pages linked in footer

---

## Development Phases — Build in This Order

| Phase | What to build |
|---|---|
| **1** | Project scaffold, Tailwind config, brand tokens, router setup, landing page, `/privacy`, `/terms`, `/faq`, `/guide`, 404 page |
| **2** | Supabase client setup, auth (signup/login/Google OAuth), onboarding wizard, protected routes |
| **3** | CSV/Excel upload, PapaParse + SheetJS integration, data preview step, column selector |
| **4** | Dashboard generation, Recharts integration (bar, line, pie, area, scatter, funnel), chart config, save to Supabase |
| **5** | Claude API integration, AI summary generation, AI insight card with blur gate, report history |
| **6** | Stripe integration, pricing page, checkout, webhooks, plan enforcement, upgrade prompts |
| **7** | Report sharing (share_token), public share page `/share/:token`, PDF export |
| **8** | PostHog integration, all 12 events |
| **9** | Google Sheets OAuth connection, sync |
| **10** | Account page, billing page, cancellation flow, referral program |
| **11** | Admin panel `/admin` |
| **12** | Resend email sequences |
| **13** | QA pass — mobile responsiveness, error states, edge cases, Vercel deploy |

**When I say "build Phase N", complete everything in that phase before stopping.**
Ask clarifying questions before starting a phase, not during.

---

## Code Quality Rules

- TypeScript is optional — JavaScript is fine, but be consistent
- No `console.log` left in production code — use `console.error('[DashPlot]', ...)` for errors only
- No commented-out code blocks left behind
- Components go in `src/components/`
- Pages go in `src/pages/`
- Supabase client: single instance in `src/lib/supabase.js`
- PostHog client: single instance in `src/lib/posthog.js`
- All API calls wrapped in the `callWithRetry` pattern defined above
- Never expose `SUPABASE_SERVICE_ROLE_KEY` or `STRIPE_SECRET_KEY` to the frontend

---

## When in Doubt

- Ask before introducing a new library
- Ask before changing the database schema
- Ask before changing the routing structure
- If a feature is ambiguous, implement the simpler version and note what was assumed
- Partial working code > broken ambitious code
