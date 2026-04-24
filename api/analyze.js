export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })
  }

  const { data } = req.body ?? {}
  if (!data) {
    return res.status(400).json({ error: 'Missing analysis data' })
  }

  const systemPrompt = `You are Zen Motion, an AI kinesiology coach. \
Analyze the movement data and return a JSON coaching report with exactly these fields:
- overall_score (integer 0-100)
- summary (2-3 sentences, conversational, specific to the data)
- strengths (array of up to 3 strings)
- improvements (array of up to 3 strings, specific and actionable)
- priority_fix (single most important cue, one sentence)
The data includes detected_patterns — pre-computed flags for asymmetry, restricted range, high flag rates, and hyperextension risk. Use these to make your coaching specific and accurate.
Return raw JSON only — no markdown, no code fences.`

  const patternSummary = data.detected_patterns?.length > 0
    ? `\n\nPre-detected issues:\n${data.detected_patterns.map(p => `- [${p.severity}] ${p.label}`).join('\n')}`
    : ''
  const userMessage = `Analyze this movement session:\n${JSON.stringify(data, null, 2)}${patternSummary}`

  let claudeRes
  try {
    claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    })
  } catch (err) {
    return res.status(502).json({ error: `Claude API unreachable: ${err.message}` })
  }

  if (!claudeRes.ok) {
    const detail = await claudeRes.text()
    return res.status(502).json({ error: `Claude API ${claudeRes.status}`, detail })
  }

  const result = await claudeRes.json()
  const text = result.content?.[0]?.text ?? ''

  // Strip markdown code fences if Claude wraps the JSON anyway
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

  try {
    const report = JSON.parse(cleaned)
    return res.status(200).json(report)
  } catch {
    return res.status(500).json({ error: 'Could not parse coaching report', raw: text })
  }
}
