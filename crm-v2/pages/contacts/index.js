import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import { supabase } from '../../lib/supabase'
import { STAGES, formatDate, FlagBadges, StageB, WarmthB, calcOppScore } from '../../lib/helpers'
import Link from 'next/link'
import ContactModal from '../../components/ContactModal'

const FILTERS = [
  { id:'all', label:'All' },
  { id:'active_convos', label:'Active Conversations' },
  { id:'not_contacted', label:'Not Contacted' },
  { id:'outreach_sent', label:'Outreach Sent' },
  { id:'replied', label:'Replied' },
  { id:'insight_captured', label:'Insight Captured' },
  { id:'beta', label:'Beta Candidates' },
  { id:'warm_lead', label:'Warm Leads' },
  { id:'followup_due', label:'Follow-up Due' },
]

export default function Contacts() {
  const [contacts, setContacts] = useState([])
  const [problems, setProblems] = useState([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => { load() }, [refresh])

  async function load() {
    const [{ data:c },{ data:p }] = await Promise.all([
      supabase.from('contacts').select('*').order('created_at',{ascending:false}),
      supabase.from('problems').select('contact_id,severity,wtp'),
    ])
    setContacts(c||[])
    setProblems(p||[])
  }

  const today = new Date().toISOString().split('T')[0]

  function applyFilter(c) {
    if (filter === 'active_convos') return !!c.conversation_active
    if (filter === 'not_contacted') return c.stage <= 1
    if (filter === 'outreach_sent') return c.stage === 2
    if (filter === 'replied') return c.stage === 3
    if (filter === 'insight_captured') return c.stage >= 5
    if (filter === 'beta') return c.flag_beta || c.future_fit === 'Beta Candidate'
    if (filter === 'warm_lead') return c.flag_interested || c.flag_future_customer || c.future_fit === 'Likely Early Customer'
    if (filter === 'followup_due') return c.followup_date && c.followup_date <= today
    return true
  }

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !search || c.name.toLowerCase().includes(q) || (c.location||'').toLowerCase().includes(q) || (c.prop_type||'').toLowerCase().includes(q) || (c.business_name||'').toLowerCase().includes(q)
    return matchSearch && applyFilter(c)
  })

  async function deleteContact(id) {
    if (!confirm('Delete this contact and all data?')) return
    await supabase.from('contacts').delete().eq('id', id)
    setRefresh(r=>r+1)
  }

  async function toggleActive(e, contactId, current) {
    e.stopPropagation()
    const next = !current
    await supabase.from('contacts').update({ conversation_active: next }).eq('id', contactId)
    setContacts(cs => cs.map(c => c.id === contactId ? { ...c, conversation_active: next } : c))
  }

  return (
    <Layout>
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Contacts</h1>
            <p className="page-sub">{contacts.length} people in your research network</p>
          </div>
          <div className="header-actions">
            <div className="search-wrap">
              <svg className="search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input className="search-input" placeholder="Search contacts…" value={search} onChange={e=>setSearch(e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Contact
            </button>
          </div>
        </div>

        <div className="filter-pills">
          {FILTERS.map(f => (
            <div key={f.id} className={`filter-pill ${filter===f.id?'active':''}`} onClick={() => setFilter(f.id)}>{f.label}</div>
          ))}
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th><th>Type / Business</th><th>Location</th><th>Stage</th>
                <th>Warmth</th><th>Flags</th><th>Score</th><th>Follow-up</th><th></th>
              </tr>
            </thead>
            <tbody>
              {!filtered.length ? (
                <tr><td colSpan="9"><div className="empty"><div className="empty-icon">👤</div><div className="empty-title">No contacts found</div><div className="empty-sub">Try a different filter or add your first contact</div></div></td></tr>
              ) : filtered.map(c => {
                const cProbs = problems.filter(p=>p.contact_id===c.id)
                const score = calcOppScore(c, cProbs)
                const overdue = c.followup_date && c.followup_date <= today
                return (
                  <tr key={c.id} onClick={() => window.location.href=`/contacts/${c.id}`}>
                    <td>
                      <div style={{ fontWeight:500, display:'flex', alignItems:'center', gap:6 }}>
                        {c.name}
                        {c.conversation_active && (
                          <span
                            className="badge badge-active"
                            style={{ cursor:'pointer', fontSize:9.5, padding:'1px 7px' }}
                            onClick={e => toggleActive(e, c.id, true)}
                            title="Click to deactivate"
                          >● Active</span>
                        )}
                      </div>
                      {c.email && <div style={{ fontSize:11, color:'var(--muted)' }}>{c.email}</div>}
                    </td>
                    <td>
                      <div style={{ fontSize:12 }}>{c.prop_type}</div>
                      {c.business_name && <div style={{ fontSize:11, color:'var(--muted)' }}>{c.business_name}</div>}
                    </td>
                    <td style={{ fontSize:12 }}>{c.location||'—'}</td>
                    <td><StageB stage={c.stage} /></td>
                    <td><WarmthB warmth={c.relationship_warmth} /></td>
                    <td onClick={e=>e.stopPropagation()}><FlagBadges c={c} /></td>
                    <td>
                      <span style={{ fontFamily:'Geist Mono,monospace', fontWeight:700, fontSize:12.5, color:score>=8?'var(--green)':score>=5?'var(--gold)':'var(--muted)' }}>{score}/10</span>
                    </td>
                    <td style={{ fontSize:11, color:overdue?'var(--accent)':'var(--muted)' }}>
                      {overdue && '⚠ '}{c.followup_date?formatDate(c.followup_date):'—'}
                    </td>
                    <td onClick={e=>e.stopPropagation()}>
                      <button className="btn btn-xs btn-danger" onClick={() => deleteContact(c.id)}>Del</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && <ContactModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); setRefresh(r=>r+1) }} />}
    </Layout>
  )
}
