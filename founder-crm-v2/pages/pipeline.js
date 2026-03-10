import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { STAGES, calcOppScore } from '../lib/helpers'
import Link from 'next/link'
import ContactModal from '../components/ContactModal'

export default function Pipeline() {
  const [contacts, setContacts] = useState([])
  const [problems, setProblems] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => { load() }, [refresh])

  async function load() {
    const [{ data: c }, { data: p }] = await Promise.all([
      supabase.from('contacts').select('*').order('created_at', { ascending: false }),
      supabase.from('problems').select('*'),
    ])
    setContacts(c || [])
    setProblems(p || [])
  }

  return (
    <Layout>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:28 }}>
        <div>
          <h1 style={{ fontFamily:'DM Serif Display,serif', fontSize:28, letterSpacing:'-0.5px' }}>Pipeline</h1>
          <p style={{ fontSize:12, color:'var(--muted)', marginTop:3 }}>Track contacts through your discovery journey</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Contact
        </button>
      </div>

      <div style={{ display:'flex', gap:14, overflowX:'auto', paddingBottom:16 }}>
        {STAGES.map((stage, i) => {
          const stageContacts = contacts.filter(c => c.stage === i)
          return (
            <div key={i} style={{ flex:'0 0 220px' }}>
              <div className="pipeline-col-header">
                <div style={{ fontSize:12, fontWeight:600, letterSpacing:'0.3px' }}>{stage}</div>
                <div style={{ fontSize:10, opacity:0.6, marginTop:1, fontFamily:'DM Mono,monospace' }}>{stageContacts.length} contact{stageContacts.length!==1?'s':''}</div>
              </div>
              <div className="pipeline-col-body">
                {stageContacts.length ? stageContacts.map(c => {
                  const cProblems = problems.filter(p => p.contact_id === c.id)
                  const score = calcOppScore(c, cProblems)
                  return (
                    <Link key={c.id} href={`/contacts/${c.id}`} className="pipeline-card" style={{ display:'block', textDecoration:'none', color:'var(--ink)' }}>
                      <div style={{ fontSize:13, fontWeight:500, marginBottom:2 }}>{c.name}</div>
                      <div style={{ fontSize:11, color:'var(--muted)' }}>{c.prop_type}</div>
                      <div style={{ fontSize:11, color:'var(--muted)' }}>{c.location||''}</div>
                      {cProblems.length > 0 && <div style={{ fontSize:11, color:'var(--accent)', marginTop:4 }}>⚠ {cProblems.length} problem{cProblems.length>1?'s':''}</div>}
                      <div style={{ display:'flex', gap:4, marginTop:6, flexWrap:'wrap' }}>
                        {c.flag_beta && <span className="badge badge-beta" style={{ fontSize:9, padding:'2px 6px' }}>Beta</span>}
                        {c.flag_interested && <span className="badge badge-interested" style={{ fontSize:9, padding:'2px 6px' }}>Interested</span>}
                        {score > 6 && <span style={{ fontSize:9, fontFamily:'DM Mono,monospace', color:'var(--accent2)', fontWeight:600 }}>⭐ {score}/10</span>}
                      </div>
                    </Link>
                  )
                }) : <div style={{ fontSize:12, color:'var(--muted)', textAlign:'center', padding:'20px 10px' }}>No contacts</div>}
              </div>
            </div>
          )
        })}
      </div>

      {showAdd && <ContactModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); setRefresh(r=>r+1) }} />}
    </Layout>
  )
}
