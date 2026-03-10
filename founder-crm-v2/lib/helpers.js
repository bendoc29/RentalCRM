export const STAGES = ['Property Identified','Outreach Sent','Conversation Started','Problem Identified','Problem Validation','Future Opportunity']

export const STAGE_COLORS = ['badge-stage-0','badge-stage-1','badge-stage-2','badge-stage-3','badge-stage-4','badge-stage-5']

export const CAT_STYLES = {
  'Operations': { bg: '#fde8e0', color: '#8a2800' },
  'Finance': { bg: '#e0f0e0', color: '#1a5a1a' },
  'Guest Experience': { bg: '#e0e8ff', color: '#1a2a8a' },
  'Maintenance': { bg: '#fff8e0', color: '#7a5500' },
  'Technology': { bg: '#f0e0ff', color: '#4a1a8a' },
  'Legal / Compliance': { bg: '#ffe0e0', color: '#8a1a1a' },
  'Other': { bg: '#f0f0f0', color: '#4a4a4a' },
}

export const WTP_ORDER = { 'None':0,'Low':1,'Medium':2,'High':3,'Very High':4,'Unknown':-1 }

export function formatDate(d) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch(e) { return d }
}

export function SevDots({ severity }) {
  const colors = { 1:'#8bc34a', 2:'#ffc107', 3:'#ff9800', 4:'#f44336', 5:'#9c27b0' }
  return (
    <div style={{ display:'flex', gap:2, alignItems:'center' }}>
      {[1,2,3,4,5].map(i => (
        <div key={i} className="sev-dot" style={{ background: i <= severity ? colors[severity] : 'var(--border)' }} />
      ))}
    </div>
  )
}

export function FlagBadges({ flags }) {
  if (!flags) return null
  return (
    <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
      {flags.flag_beta && <span className="badge badge-beta">🔬 Beta</span>}
      {flags.flag_interested && <span className="badge badge-interested">💡 Interested</span>}
      {flags.flag_followup && <span className="badge badge-followup">🔔 Follow-up</span>}
      {flags.flag_future_customer && <span className="badge badge-future">💰 Future Customer</span>}
    </div>
  )
}

export function calcOppScore(contact, problems = [], conversations = []) {
  if (contact.opp_score > 0) return contact.opp_score
  let score = 0
  if (problems.length) score += Math.min(3, problems.length)
  const avgSev = problems.length ? problems.reduce((a,p) => a + p.severity, 0) / problems.length : 0
  score += avgSev
  if (conversations.length) score += Math.min(2, conversations.length * 0.5)
  if (contact.flag_interested) score += 1.5
  if (contact.flag_beta) score += 1
  const wtpMax = problems.reduce((max,p) => Math.max(max, WTP_ORDER[p.wtp] || 0), 0)
  score += wtpMax * 0.5
  return Math.min(10, Math.round(score * 10) / 10)
}

export function Toast({ message, onDone }) {
  return message ? (
    <div className="toast" onClick={onDone}>{message}</div>
  ) : null
}

export function useToast() {
  const [msg, setMsg] = useState(null)
  function show(m) { setMsg(m); setTimeout(() => setMsg(null), 2800) }
  return [msg, show]
}

import { useState } from 'react'
