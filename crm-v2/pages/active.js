import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { formatDate, FlagBadges, StageB, WarmthB, calcOppScore } from '../lib/helpers'
import Link from 'next/link'
import { ConversationImportModal } from '../components/ConversationImportModal'

export default function ActiveConversations() {
  const [contacts, setContacts] = useState([])
  const [problems, setProblems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showImport, setShowImport] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: c }, { data: p }] = await Promise.all([
      supabase.from('contacts').select('*').eq('conversation_active', true).order('created_at', { ascending: false }),
      supabase.from('problems').select('contact_id,severity,wtp'),
    ])
    setContacts(c || [])
    setProblems(p || [])
    setLoading(false)
  }

  async function deactivate(e, contactId) {
    e.stopPropagation()
    await supabase.from('contacts').update({ conversation_active: false }).eq('id', contactId)
    setContacts(cs => cs.filter(c => c.id !== contactId))
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <Layout>
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Active Conversations</h1>
            <p className="page-sub">
              {loading ? 'Loading…' : `${contacts.length} contact${contacts.length !== 1 ? 's' : ''} in active dialogue`}
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowImport(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Import Conversation
          </button>
        </div>

        {!loading && !contacts.length ? (
          <div className="empty" style={{ paddingTop:80 }}>
            <div className="empty-icon">💬</div>
            <div className="empty-title">No active conversations right now</div>
            <div className="empty-sub">
              Flip a contact to Active from their detail page or the{' '}
              <Link href="/contacts" style={{ color:'var(--blue)', textDecoration:'none' }}>main contacts list</Link>.
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th><th>Type / Business</th><th>Location</th><th>Stage</th>
                  <th>Warmth</th><th>Flags</th><th>Score</th><th>Follow-up</th><th></th>
                </tr>
              </thead>
              <tbody>
                {contacts.map(c => {
                  const cProbs = problems.filter(p => p.contact_id === c.id)
                  const score = calcOppScore(c, cProbs)
                  const overdue = c.followup_date && c.followup_date <= today
                  return (
                    <tr key={c.id} onClick={() => window.location.href = `/contacts/${c.id}`}>
                      <td>
                        <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {c.name}
                          <span className="badge badge-active" style={{ fontSize: 9.5, padding: '1px 7px' }}>● Active</span>
                        </div>
                        {c.email && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{c.email}</div>}
                      </td>
                      <td>
                        <div style={{ fontSize: 12 }}>{c.prop_type}</div>
                        {c.business_name && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{c.business_name}</div>}
                      </td>
                      <td style={{ fontSize: 12 }}>{c.location || '—'}</td>
                      <td><StageB stage={c.stage} /></td>
                      <td><WarmthB warmth={c.relationship_warmth} /></td>
                      <td onClick={e => e.stopPropagation()}><FlagBadges c={c} /></td>
                      <td>
                        <span style={{ fontFamily: 'Geist Mono,monospace', fontWeight: 700, fontSize: 12.5, color: score >= 8 ? 'var(--green)' : score >= 5 ? 'var(--gold)' : 'var(--muted)' }}>
                          {score}/10
                        </span>
                      </td>
                      <td style={{ fontSize: 11, color: overdue ? 'var(--accent)' : 'var(--muted)' }}>
                        {overdue && '⚠ '}{c.followup_date ? formatDate(c.followup_date) : '—'}
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <button className="btn btn-xs btn-ghost" onClick={e => deactivate(e, c.id)}>Deactivate</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showImport && (
        <ConversationImportModal
          onClose={() => setShowImport(false)}
          onSaved={() => { setShowImport(false); load() }}
        />
      )}
    </Layout>
  )
}
