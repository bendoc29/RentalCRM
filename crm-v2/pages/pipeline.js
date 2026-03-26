import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { STAGES, calcOppScore, FlagBadges } from '../lib/helpers'
import Link from 'next/link'
import ContactModal from '../components/ContactModal'

export default function Pipeline() {
  const [contacts, setContacts] = useState([])
  const [problems, setProblems] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => { load() }, [refresh])
  async function load() {
    const [{ data:c },{ data:p }] = await Promise.all([
      supabase.from('contacts').select('*').order('created_at',{ascending:false}),
      supabase.from('problems').select('contact_id,severity,wtp'),
    ])
    setContacts(c||[]); setProblems(p||[])
  }

  return (
    <Layout>
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Pipeline</h1>
            <p className="page-sub">Track contacts through your discovery and re-engagement journey</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Contact</button>
        </div>

        <div className="pipeline-board">
          {STAGES.map((stage, i) => {
            const stageContacts = contacts.filter(c=>c.stage===i)
            return (
              <div key={i} className="pipe-col">
                <div className="pipe-head">
                  <div className="pipe-head-title">{stage}</div>
                  <div className="pipe-head-count">{stageContacts.length} contact{stageContacts.length!==1?'s':''}</div>
                </div>
                <div className="pipe-body">
                  {stageContacts.length ? stageContacts.map(c => {
                    const cProbs = problems.filter(p=>p.contact_id===c.id)
                    const score = calcOppScore(c, cProbs)
                    return (
                      <Link key={c.id} href={`/contacts/${c.id}`} className="pipe-card">
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                          <div className="pipe-card-name">{c.name}</div>
                          {c.owner && (
                            <span style={{
                              fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:5,
                              background: c.owner==='BDoc' ? '#dbeafe' : '#fce7f3',
                              color: c.owner==='BDoc' ? '#1d4ed8' : '#be185d'
                            }}>{c.owner}</span>
                          )}
                        </div>
                        <div className="pipe-card-sub">{c.prop_type}</div>
                        {c.location && <div className="pipe-card-sub">{c.location}</div>}
                        {cProbs.length > 0 && <div style={{ fontSize:11, color:'var(--accent)', marginTop:4 }}>⚠ {cProbs.length} problem{cProbs.length>1?'s':''}</div>}
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:6 }}>
                          <FlagBadges c={c} />
                          {score >= 6 && <span style={{ fontFamily:'Geist Mono,monospace', fontSize:10, fontWeight:700, color:'var(--green)' }}>{score}/10</span>}
                        </div>
                      </Link>
                    )
                  }) : <div style={{ fontSize:11, color:'var(--muted)', textAlign:'center', padding:'16px 8px' }}>Empty</div>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      {showAdd && <ContactModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); setRefresh(r=>r+1) }} />}
    </Layout>
  )
}
