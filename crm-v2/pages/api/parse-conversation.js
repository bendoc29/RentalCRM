export const config = {
  api: { bodyParser: { sizeLimit: '20mb' } },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const rawKey = process.env.ANTHROPIC_API_KEY || '';
  console.log('Raw key first 10 char codes:', [...rawKey.slice(0, 10)].map(c => c.charCodeAt(0)));
  console.log('Raw key last 10 char codes:', [...rawKey.slice(-10)].map(c => c.charCodeAt(0)));
  console.log('Raw key length:', rawKey.length);
  console.log('Trimmed key length:', rawKey.trim().length);

  if (!rawKey.trim()) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })

  const { text, images } = req.body

  if (!text && (!images || images.length === 0)) {
    return res.status(400).json({ error: 'Provide pasted text or at least one image' })
  }

  const systemPrompt = `You are a CRM assistant that parses conversation screenshots and copy-pasted message threads from social media and messaging apps. You extract structured data for a sales CRM.

The CRM user is Jack, doing B2B outreach for a property management SaaS (OvrSee) targeting short-term rental property managers and Airbnb hosts.

Return ONLY valid JSON — no markdown, no explanation, just raw JSON matching the schema exactly.`

  const userContent = []

  if (images && images.length > 0) {
    for (const img of images) {
      userContent.push({
        type: 'image',
        source: { type: 'base64', media_type: img.mediaType, data: img.data },
      })
    }
  }

  const extractionPrompt = `Parse the conversation and return this exact JSON structure:

{
  "platform": "Instagram DM | LinkedIn | Facebook Messenger | WhatsApp | Email | SMS | Other",
  "otherParty": {
    "name": "their full name or null",
    "handle": "their social handle / username or null"
  },
  "messages": [
    { "sender": "jack OR other", "content": "message text", "timestamp": "time string or null" }
  ],
  "summary": "1-2 sentence summary of the conversation",
  "insights": [
    "specific CRM-useful fact (company, role, portfolio size, pain point, buying signal, objection, budget, timeline)"
  ],
  "suggestedNextAction": "specific actionable next step, e.g. Follow up in 3 days with pricing, or Send demo link"
}

Rules:
- sender: "jack" if the message is clearly from the outreach sender, "other" for the prospect. Use position/style in screenshots as a clue.
- insights: be specific and factual, not generic. E.g. "Manages 6 properties in Edinburgh" not "interested in the product".
- suggestedNextAction: concrete, not vague. E.g. "Follow up Thursday with a demo offer" not "follow up soon".
- If you cannot read part of a screenshot clearly, skip those messages rather than guessing.
${text ? `\nPASTED TEXT:\n${text}` : ''}

Return JSON now.`

  userContent.push({ type: 'text', text: extractionPrompt })

  const headers = {
    'x-api-key': rawKey.trim(),
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
  }
  console.log('Header keys:', Object.keys(headers))
  console.log('x-api-key length being sent:', headers['x-api-key'].length)

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }],
      }),
    })

    const responseText = await response.text()
    console.log('Anthropic response status:', response.status)
    console.log('Anthropic response body:', responseText)

    if (!response.ok) {
      return res.status(500).json({ error: JSON.parse(responseText)?.error?.message || 'Failed to parse conversation' })
    }

    const data = JSON.parse(responseText)
    const raw = data.content[0]?.text || '{}'
    const cleaned = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim()

    try {
      const parsed = JSON.parse(cleaned)
      return res.status(200).json(parsed)
    } catch {
      return res.status(500).json({ error: 'AI response was not valid JSON', raw })
    }
  } catch (err) {
    console.error('[parse-conversation] fetch error:', err.message)
    return res.status(500).json({ error: err.message || 'Failed to parse conversation' })
  }
}
