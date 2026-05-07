import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

function buildPrompt(title, colConfig, rows) {
  const headers = colConfig.headers ?? []
  const xAxis = colConfig.xAxis ?? ''
  const yAxis = (colConfig.yAxis ?? []).join(', ')
  const types = colConfig.columnTypes ?? {}
  const sample = rows.slice(0, 50)

  const dataStr = [
    headers.join('\t'),
    ...sample.map(row => headers.map(h => String(row[h] ?? '')).join('\t')),
  ].join('\n')

  return `You are a business analyst. Write a concise 3–4 sentence narrative insight about this dataset.

Report title: "${title}"
X-axis column: ${xAxis} (${types[xAxis] ?? 'unknown'} type)
Y-axis columns: ${yAxis}
Total rows: ${rows.length}

Sample data (first ${sample.length} of ${rows.length} rows):
${dataStr}

Write only the insight paragraph. Be specific — reference actual values and trends from the data. Do not include a preamble, title, or bullet points.`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  // ── Step 1: env vars ────────────────────────────────────────────────────────
  const apiKey     = process.env.ANTHROPIC_API_KEY
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

  console.error('[DashPlot] generate-insight [1] env check:',
    'ANTHROPIC_API_KEY=', apiKey ? apiKey.slice(0, 10) + '…' : 'MISSING',
    '| SUPABASE_URL=', supabaseUrl ? supabaseUrl.slice(0, 30) + '…' : 'MISSING',
    '| SUPABASE_SERVICE_ROLE_KEY=', serviceKey ? 'present (' + serviceKey.slice(0, 6) + '…)' : 'MISSING',
  )

  if (!apiKey || !supabaseUrl || !serviceKey) {
    const missing = ['ANTHROPIC_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
      .filter(k => !process.env[k])
    console.error('[DashPlot] generate-insight [1] ABORT — missing env vars:', missing.join(', '))
    return res.status(500).json({ error: 'Server misconfiguration' })
  }

  // ── Step 2: auth header + body ──────────────────────────────────────────────
  const authHeader = req.headers.authorization ?? ''
  console.error('[DashPlot] generate-insight [2] Authorization header present:', authHeader.startsWith('Bearer '))

  if (!authHeader.startsWith('Bearer ')) {
    console.error('[DashPlot] generate-insight [2] ABORT — missing or malformed Authorization header')
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const token = authHeader.slice(7)
  console.error('[DashPlot] generate-insight [2] token prefix:', token.slice(0, 20) + '…')

  const { reportId } = req.body ?? {}
  console.error('[DashPlot] generate-insight [2] reportId:', reportId ?? 'MISSING')
  if (!reportId) return res.status(400).json({ error: 'reportId required' })

  // ── Step 3: JWT verification ────────────────────────────────────────────────
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.error('[DashPlot] generate-insight [3] verifying JWT…')
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) {
    console.error('[DashPlot] generate-insight [3] ABORT — JWT failed:', authErr?.message ?? 'no user returned')
    return res.status(401).json({ error: 'Invalid session' })
  }
  console.error('[DashPlot] generate-insight [3] JWT OK — userId:', user.id)

  // ── Step 4: fetch report ────────────────────────────────────────────────────
  console.error('[DashPlot] generate-insight [4] fetching report:', reportId)
  const { data: report, error: reportErr } = await supabase
    .from('reports')
    .select('*')
    .eq('id', reportId)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single()

  if (reportErr || !report) {
    console.error('[DashPlot] generate-insight [4] ABORT — report fetch failed:', reportErr?.message, '| code:', reportErr?.code)
    return res.status(404).json({ error: 'Report not found' })
  }
  console.error('[DashPlot] generate-insight [4] report OK — title:', report.title, '| raw_data rows:', report.raw_data?.length ?? 0)

  // ── Step 5: build prompt + call Claude ──────────────────────────────────────
  const prompt = buildPrompt(report.title, report.column_config ?? {}, report.raw_data ?? [])
  console.error('[DashPlot] generate-insight [5] prompt built — length:', prompt.length, 'chars')
  console.error('[DashPlot] generate-insight [5] calling claude-sonnet-4-6…')

  const anthropic = new Anthropic({ apiKey })

  let summary
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    })
    console.error('[DashPlot] generate-insight [5] Claude responded — stop_reason:', msg.stop_reason, '| content blocks:', msg.content?.length)
    summary = msg.content[0]?.text?.trim() ?? ''
    console.error('[DashPlot] generate-insight [5] summary length:', summary.length, '| preview:', summary.slice(0, 60) + '…')
  } catch (err) {
    console.error('[DashPlot] generate-insight [5] ABORT — Claude API error:',
      'status:', err?.status,
      '| message:', err?.message,
      '| error_type:', err?.error?.type,
    )
    return res.status(500).json({ error: 'AI generation failed' })
  }

  if (!summary) {
    console.error('[DashPlot] generate-insight [5] ABORT — Claude returned empty summary')
    return res.status(500).json({ error: 'AI returned empty response' })
  }

  // ── Step 6: save to DB ──────────────────────────────────────────────────────
  console.error('[DashPlot] generate-insight [6] saving summary to reports…')
  const { error: updateErr } = await supabase
    .from('reports')
    .update({ ai_summary: summary })
    .eq('id', reportId)

  if (updateErr) {
    console.error('[DashPlot] generate-insight [6] WARNING — failed to save summary:', updateErr.message)
  } else {
    console.error('[DashPlot] generate-insight [6] summary saved OK')
  }

  const { error: historyErr } = await supabase.from('report_history').insert({
    report_id: reportId,
    user_id: user.id,
    snapshot_data: report.column_config,
    ai_summary: summary,
    period_label: new Date().toISOString().slice(0, 10),
  })

  if (historyErr) {
    console.error('[DashPlot] generate-insight [6] WARNING — failed to insert report_history:', historyErr.message)
  }

  console.error('[DashPlot] generate-insight [6] done — returning 200')
  return res.status(200).json({ summary })
}
