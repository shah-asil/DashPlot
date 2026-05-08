import Anthropic from '@anthropic-ai/sdk'
import { supabase } from './supabase'
import posthog from './posthog'

const client = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
})

function buildPrompt(title, colConfig, rows) {
  const headers = colConfig.headers ?? []
  const xAxis   = colConfig.xAxis ?? ''
  const yAxis   = (colConfig.yAxis ?? []).join(', ')
  const types   = colConfig.columnTypes ?? {}
  const sample  = rows.slice(0, 50)

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

export async function generateReportInsight(report) {
  const prompt = buildPrompt(report.title, report.column_config ?? {}, report.raw_data ?? [])

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }],
  })

  const summary = msg.content[0]?.text?.trim() ?? ''
  if (!summary) throw new Error('Claude returned an empty response')

  await supabase.from('reports').update({ ai_summary: summary }).eq('id', report.id)

  posthog.capture('ai_insight_generated', { report_id: report.id })

  await supabase.from('report_history').insert({
    report_id: report.id,
    user_id: report.user_id,
    snapshot_data: report.column_config,
    ai_summary: summary,
    period_label: new Date().toISOString().slice(0, 10),
  })

  return summary
}
