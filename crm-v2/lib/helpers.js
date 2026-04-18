import { useState } from 'react'

export const STAGES = [
  'Identified',
  'Outreach Prepared',
  'Outreach Sent',
  'Replied',
  'Insight Captured',
  'Follow-Up Later',
  'Beta Candidate',
  'Re-Engage When Ready',
  'Active Opportunity',
]

export const WARMTH = ['Cold', 'Slightly Warm', 'Warm', 'Strong Relationship']
export const FUTURE_FIT = ['Research Only', 'Possible Future Fit', 'Good Future Fit', 'Beta Candidate', 'Likely Early Customer']
export const FOLLOWUP_PRIORITY = ['Low', 'Medium', 'High', 'Very High']

export const CATEGORIES = ['Operations', 'Finance', 'Guest Experience', 'Maintenance', 'Technology', 'Legal / Compliance', 'Other']

export const CAT_CLASS = {
  'Operations': 'cat-ops',
  'Finance': 'cat-fin',
  'Guest Experience': 'cat-guest',
  'Maintenance': 'cat-maint',
  'Technology': 'cat-tech',
  'Legal / Compliance': 'cat-legal',
  'Other': 'cat-other',
}

export const WTP_ORDER = { 'None':0,'Low':1,'Medium':2,'High':3,'Very High':4,'Unknown':-1 }

export const MSG_TYPES = [
  { value: 'warm_checkin', label: 'Warm Check-in' },
  { value: 'reopen', label: 'Re-open Conversation' },
  { value: 'beta_invite', label: 'Beta Invitation' },
  { value: 'product_ready', label: 'Product Now Ready' },
  { value: 'problem_callback', label: '"You Mentioned This" Outreach' },
  { value: 'custom', label: 'Custom Message' },
]

export function formatDate(d) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return d }
}

export function formatDateShort(d) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) }
  catch { return d }
}

export function calcOppScore(contact, problems = [], convos = []) {
  if (contact.opp_score > 0) return contact.opp_score
  let s = 0
  s += Math.min(2, problems.length * 0.5)
  const avgSev = problems.length ? problems.reduce((a,p) => a + p.severity, 0) / problems.length : 0
  s += avgSev * 0.8
  s += Math.min(1.5, convos.length * 0.4)
  if (contact.flag_interested) s += 1.5
  if (contact.flag_beta) s += 1
  if (contact.flag_future_customer) s += 0.5
  const wtpMax = problems.reduce((max,p) => Math.max(max, WTP_ORDER[p.wtp] || 0), 0)
  s += wtpMax * 0.4
  const fitIdx = FUTURE_FIT.indexOf(contact.future_fit || '')
  if (fitIdx > 0) s += fitIdx * 0.3
  return Math.min(10, Math.round(s * 10) / 10)
}

export function SevDots({ severity = 1 }) {
  return (
    <div className={`sev-dots sev-${severity}`}>
      {[1,2,3,4,5].map(i => <div key={i} className="sev-dot" />)}
    </div>
  )
}

export function StageB({ stage }) {
  return <span className={`badge badge-${stage}`}>{STAGES[stage] || '—'}</span>
}

export function WarmthB({ warmth }) {
  const cls = { 'Cold':'badge-cold','Slightly Warm':'badge-warm','Warm':'badge-warm','Strong Relationship':'badge-hot' }
  return warmth ? <span className={`badge ${cls[warmth]||'badge-cold'}`}>{warmth}</span> : null
}

export function FlagBadges({ c }) {
  return (
    <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
      {c.flag_beta && <span className="badge badge-beta">🔬 Beta</span>}
      {c.flag_interested && <span className="badge badge-lead">💡 Interested</span>}
      {c.flag_followup && <span className="badge" style={{ background:'#ffe8e8', color:'#7a1a1a', border:'1px solid #e07070' }}>🔔 Follow-up</span>}
      {c.flag_future_customer && <span className="badge" style={{ background:'#e6eeff', color:'#1a2a8a', border:'1px solid #7080d0' }}>💰 Future Customer</span>}
    </div>
  )
}

export function CatTag({ category }) {
  return <span className={`cat-tag ${CAT_CLASS[category] || 'cat-other'}`}>{category}</span>
}

export function useToast() {
  const [msg, setMsg] = useState(null)
  function toast(m) { setMsg(m); setTimeout(() => setMsg(null), 3000) }
  return [msg, toast]
}

export function Toast({ message }) {
  return message ? <div className="toast">{message}</div> : null
}

export function Spinner() {
  return <div className="spinner" />
}
