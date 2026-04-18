import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { STAGES, formatDate, FlagBadges, StageB, calcOppScore } from '../lib/helpers'
import Link from 'next/link'
import ContactModal from '../components/ContactModal'

export default function Dashboard() {
  const [data, setData] = useState({ contacts:[], problems:[], convos:[] })
  const [showAdd, setShowAdd] = useState(false)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => { load() }, [refresh])

  async function load() {
    const [{ data:contacts },{ data:problems },{ data:convos }] = await Promise.all([
      supabase.from('contacts').select('*').order('created_at',{ascending:false}),
      supabase.from('problems').select('*'),
      supabase.from('conversations').select('*'),
    ])
    setData({ contacts:contacts||[], problems:problems||[], convos:convos||[] })
  }

  const { contacts, problems, convos } = data
  const today = new Date().toISOString().split('T')[0]

  const totalContacts = contacts.length
  const activeResearch = contacts.filter(c => c.stage >= 2 && c.stage <= 4).length
  const convosComplete = contacts.filter(c => c.stage >= 4).length
  const warmLeads = contacts.filter(c => c.flag_interested || c.flag_future_customer || c.future_fit === 'Likely Early Customer').length
  const betaCandidates = contacts.filter(c => c.flag_beta || c.future_fit === 'Beta Candidate').length
  const followupsDue = contacts.filter(c => c.followup_date && c.followup_date <= today).length

  // Aggregate problems
  const clusters = {}
  problems.forEach(p => {
    const k = p.title.toLowerCase().trim()
    if (!clusters[k]) clusters[k] = { title:p.title, count:0, totalSev:0 }
    clusters[k].count++; clusters[k].totalSev += p.severity
  })
  const topProblems = Object.values(clusters).map(c=>({...c,avgSev:c.totalSev/c.count})).sort((a,b)=>b.count-a.count).slice(0,5)

  const recent = contacts.slice(0,6)
  const overdue = contacts.filter(c=>c.followup_date && c.followup_date <= today).slice(0,4)
  const hotLeads = contacts.filter(c=>calcOppScore(c, problems.filter(p=>p.contact_id===c.id)) >= 7).slice(0,4)

  return (
    <Layout>
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-sub">Your pre-sales outreach overview</p>
          </div>
          <div className="header-actions">
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Contact
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="stat-grid" style={{ gridTemplateColumns:'repeat(6,1fr)' }}>
          {[
            { label:'Total Contacts', val:totalContacts, sub:'In database', cls:'stat-c1' },
            { label:'Active Research', val:activeResearch, sub:'Conversations ongoing', cls:'stat-c2' },
            { label:'Convos Complete', val:convosComplete, sub:'Insight captured', cls:'stat-c3' },
            { label:'Warm Leads', val:warmLeads, sub:'Future potential', cls:'stat-c4' },
            { label:'Beta Candidates', val:betaCandidates, sub:'Ready to trial', cls:'stat-c5' },
            { label:'Follow-ups Due', val:followupsDue, sub:'Need attention', cls:followupsDue>0?'stat-c1':'' },
          ].map(s => (
            <div key={s.label} className={`stat-card ${s.cls}`}>
              <div className="stat-label">{s.label}</div>
              <div className="stat-val">{s.val}</div>
              <div className="stat-sub">{s.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18, marginBottom:18 }}>
          {/* Recent contacts */}
          <div className="card">
            <span className="sec-label">Recent Contacts</span>
            {!recent.length ? <div className="empty"><div className="empty-sub">No contacts yet</div></div>
              : recent.map(c => (
              <div key={c.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--paper2)' }}>
                <div>
                  <Link href={`/contacts/${c.id}`} style={{ fontWeight:500, fontSize:13, color:'var(--ink)', textDecoration:'none' }}>{c.name}</Link>
                  <div style={{ fontSize:11, color:'var(--muted)' }}>{c.prop_type}{c.location?` · ${c.location}`:''}</div>
                </div>
                <StageB stage={c.stage} />
              </div>
            ))}
            <Link href="/contacts" style={{ display:'block', marginTop:12, fontSize:12, color:'var(--muted)', textDecoration:'none' }}>View all contacts →</Link>
          </div>

          {/* Top problems */}
          <div className="card">
            <span className="sec-label">Top Recurring Problems</span>
            {!topProblems.length ? <div className="empty"><div className="empty-sub">No problems logged yet</div></div>
              : topProblems.map(p => (
              <div key={p.title} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--paper2)' }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:500 }}>{p.title}</div>
                  <div style={{ fontSize:11, color:'var(--muted)' }}>{p.count} owner{p.count>1?'s':''} · avg severity {p.avgSev.toFixed(1)}/5</div>
                </div>
                <span style={{ fontFamily:'Geist Mono,monospace', fontWeight:700, color:'var(--accent)', fontSize:16 }}>{p.count}×</span>
              </div>
            ))}
            <Link href="/problems" style={{ display:'block', marginTop:12, fontSize:12, color:'var(--muted)', textDecoration:'none' }}>View problem database →</Link>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 }}>
          {/* Overdue follow-ups */}
          <div className="card">
            <span className="sec-label">Overdue Follow-ups {overdue.length > 0 && <span style={{ color:'var(--accent)', marginLeft:4 }}>({overdue.length})</span>}</span>
            {!overdue.length
              ? <div style={{ fontSize:13, color:'var(--muted)' }}>No overdue follow-ups 🎉</div>
              : overdue.map(c => (
                <div key={c.id} className="fu-card fu-overdue" style={{ marginBottom:8 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div>
                      <Link href={`/contacts/${c.id}`} className="fu-card-name">{c.name}</Link>
                      <div className="fu-card-date">Due: {formatDate(c.followup_date)}</div>
                      {c.followup_reason && <div className="fu-card-reason">{c.followup_reason}</div>}
                    </div>
                    <Link href={`/contacts/${c.id}`} className="btn btn-sm btn-ghost">View →</Link>
                  </div>
                </div>
              ))
            }
            <Link href="/followups" style={{ display:'block', marginTop:8, fontSize:12, color:'var(--muted)', textDecoration:'none' }}>View full follow-up queue →</Link>
          </div>

          {/* High-value contacts */}
          <div className="card">
            <span className="sec-label">Highest Opportunity Contacts</span>
            {!hotLeads.length
              ? <div style={{ fontSize:13, color:'var(--muted)' }}>Score contacts by adding problems and flags</div>
              : hotLeads.map(c => {
                const cProbs = problems.filter(p=>p.contact_id===c.id)
                const score = calcOppScore(c, cProbs)
                return (
                  <div key={c.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--paper2)' }}>
                    <div>
                      <Link href={`/contacts/${c.id}`} style={{ fontWeight:500, fontSize:13, color:'var(--ink)', textDecoration:'none' }}>{c.name}</Link>
                      <div style={{ fontSize:11, color:'var(--muted)' }}>{c.prop_type}{c.location?` · ${c.location}`:''}</div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <FlagBadges c={c} />
                      <span style={{ fontFamily:'Geist Mono,monospace', fontWeight:700, color: score>=8?'var(--green)':score>=6?'var(--gold)':'var(--muted)', fontSize:13 }}>{score}/10</span>
                    </div>
                  </div>
                )
              })
            }
          </div>
        </div>
      </div>

      {showAdd && <ContactModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); setRefresh(r=>r+1) }} />}
    </Layout>
  )
}
