import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import { supabase } from '../../lib/supabase'
import { STAGES, formatDate, FlagBadges, calcOppScore } from '../../lib/helpers'
import Link from 'next/link'
import ContactModal from '../../components/ContactModal'

export default function Contacts() {
  const [contacts, setContacts] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => { load() }, [refresh])

  async function load() {
    const { data } = await supabase.from('contacts').select('*').order('created_at', { ascending: false })
    setContacts(data || [])
    setFiltered(data || [])
  }

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(contacts.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.location || '').toLowerCase().includes(q) ||
      (c.prop_type || '').toLowerCase().includes(q)
    ))
  }, [search, contacts])

  async function deleteContact(id) {
    if (!confirm('Delete this contact and all their data?')) return
    await supabase.from('contacts').delete().eq('id', id)
    setRefresh(r => r + 1)
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <Layout>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:28 }}>
        <div>
          <h1 style={{ fontFamily:'DM Serif Display,serif', fontSize:28, letterSpacing:'-0.5px' }}>Contacts</h1>
          <p style={{ fontSize:12, color:'var(--muted)', marginTop:3 }}>All property owners in your research network</p>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <div style={{ position:'relative' }}>
            <svg style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'var(--muted)' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input style={{ padding:'9px 12px 9px 36px', border:'1.5px solid var(--border)', borderRadius:8, fontSize:13, fontFamily:'DM Sans,sans-serif', background:'var(--white)', outline:'none', width:240 }}
              placeholder="Search contacts..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Contact
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th><th>Type</th><th>Location</th><th>Stage</th>
              <th>Flags</th><th>Opportunity</th><th>Follow-up</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!filtered.length ? (
              <tr><td colSpan="8">
                <div className="empty-state">
                  <div style={{ fontSize:32, marginBottom:10 }}>👤</div>
                  <div style={{ fontSize:15, fontWeight:600, color:'var(--ink)', marginBottom:6 }}>No contacts yet</div>
                  <div style={{ fontSize:13 }}>Add your first property owner to get started</div>
                </div>
              </td></tr>
            ) : filtered.map(c => {
              const score = calcOppScore(c)
              const overdue = c.followup_date && c.followup_date <= today
              return (
                <tr key={c.id}>
                  <td>
                    <Link href={`/contacts/${c.id}`} style={{ fontWeight:500, color:'var(--ink)', textDecoration:'none' }}>{c.name}</Link>
                    <div style={{ fontSize:11, color:'var(--muted)' }}>{c.email||''}</div>
                  </td>
                  <td>{c.prop_type}</td>
                  <td>{c.location||'—'}</td>
                  <td><span className={`badge badge-stage-${c.stage}`}>{STAGES[c.stage]}</span></td>
                  <td><FlagBadges flags={c} /></td>
                  <td>
                    <span style={{ fontFamily:'DM Mono,monospace', fontWeight:600, fontSize:13, color: score>7?'var(--accent2)':score>4?'var(--gold)':'var(--muted)' }}>{score}/10</span>
                  </td>
                  <td>
                    <span style={{ fontSize:12, color: overdue?'var(--danger)':'var(--muted)' }}>
                      {overdue?'⚠ ':''}{c.followup_date?formatDate(c.followup_date):'—'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display:'flex', gap:6 }}>
                      <Link href={`/contacts/${c.id}`} className="btn btn-sm btn-ghost">View</Link>
                      <button className="btn btn-sm btn-danger" onClick={() => deleteContact(c.id)}>Del</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showAdd && <ContactModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); setRefresh(r => r+1) }} />}
    </Layout>
  )
}
