const MSG_PROMPTS = {
  warm_checkin: `Write a warm, brief check-in message. The tone should feel like a genuine follow-up from someone who remembered the conversation — not a sales pitch. Keep it short (3–5 sentences). Reference something specific from their context. Don't mention any product or solution yet.`,

  reopen: `Write a message to reopen a conversation that has gone quiet. Acknowledge the time that has passed naturally. Reference the problems they mentioned to show you remember the conversation. Keep it conversational and non-pushy. 4–6 sentences.`,

  beta_invite: `Write a beta invitation message. The product they discussed is now being built and we are looking for a small group of early testers. This should feel exclusive and personal — reference the exact problems they mentioned as the reason they were chosen. Keep it concise and compelling. 5–7 sentences.`,

  product_ready: `Write a "product is now ready" announcement message. Reference the specific problems they mentioned in the earlier conversation and explain how the solution addresses those exact issues. Make it feel like a natural follow-up to a real conversation, not a marketing email. 6–8 sentences.`,

  problem_callback: `Write a highly personalized "you mentioned this before" outreach message. The core of the message should reference the specific problem(s) they mentioned, using language that mirrors what they said. Explain that a solution is being built specifically for this. Make them feel heard and remembered. 5–7 sentences.`,

  custom: `Write a thoughtful, personalized follow-up message based on the context provided. Make it feel genuine and relevant to this specific person.`,
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })

  const { contact, problems, convos, msgType, customInstruction } = req.body

  const problemsText = problems.length
    ? problems.map(p => `- "${p.title}" (Severity: ${p.severity}/5, Frequency: ${p.frequency}${p.quote ? `, Their words: "${p.quote}"` : ''}${p.workaround ? `, Current workaround: ${p.workaround}` : ''})`).join('\n')
    : 'No specific problems logged yet.'

  const convosText = convos.length
    ? convos.slice(0, 5).map(cv => `[${cv.date}] ${cv.type.toUpperCase()}${cv.channel ? ` via ${cv.channel}` : ''}: ${cv.notes || cv.message || ''}${cv.reply ? ` | Their reply: ${cv.reply}` : ''}`).join('\n')
    : 'No prior interactions logged.'

  const systemPrompt = `You are a skilled business writer helping a founder write personalized outreach messages to property owners and operators.

Your messages must:
- Sound completely human and natural — never robotic or template-like
- Be highly specific to this person using the context provided
- Never be generic or could-apply-to-anyone language
- Feel like a genuine follow-up from a real conversation
- Be commercially intelligent — understanding the relationship stage
- Match the tone of the relationship (warmer for stronger relationships)
- Be concise — no unnecessary padding

You write ONLY the message body. No subject lines unless asked. No preamble. Just the message itself.`

  const userPrompt = `Write a follow-up message for this contact.

CONTACT DETAILS:
Name: ${contact.name}
Business: ${contact.business_name || 'Not recorded'}
Role: ${contact.role || 'Property owner/manager'}
Property type: ${contact.prop_type}
Portfolio: ${contact.portfolio}
Location: ${contact.location || 'Not recorded'}
Relationship warmth: ${contact.relationship_warmth || 'Cold'}
Future fit assessment: ${contact.future_fit || 'Research only'}

PROBLEMS THEY MENTIONED:
${problemsText}

INTERACTION HISTORY:
${convosText}

${contact.re_engagement_angle ? `RECOMMENDED RE-ENGAGEMENT ANGLE:\n${contact.re_engagement_angle}\n` : ''}
${contact.notes ? `NOTES ABOUT THIS PERSON:\n${contact.notes}\n` : ''}

MESSAGE TYPE: ${msgType}
INSTRUCTION: ${MSG_PROMPTS[msgType] || MSG_PROMPTS.custom}
${customInstruction ? `\nADDITIONAL INSTRUCTION FROM USER: ${customInstruction}` : ''}

Write the message now. Address them by first name. Make it feel personal and relevant.`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 600,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('[generate-message] Anthropic error:', response.status, data)
      return res.status(500).json({ error: data?.error?.message || 'Failed to generate message' })
    }

    const text = data.content[0]?.text || ''
    res.status(200).json({ message: text })
  } catch (err) {
    console.error('[generate-message] fetch error:', err.message)
    res.status(500).json({ error: err.message || 'Failed to generate message' })
  }
}
