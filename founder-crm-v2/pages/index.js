import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { STAGES, formatDate, FlagBadges, calcOppScore } from '../lib/helpers'
import Link from 'next/link'
import ContactModal from '../components/ContactModal'

export default function Dashboard({ session }) {
  const [stats, setStats] = useState({ contacts: 0, convos: 0, problems: 0, validated: 0 })
  const [recent, setRecent] = useState([])
  const [topProblems, setTopProblems] = useState([])
  const [pipeline, setPipeline] = useState([])
  const [followups, setFollowups] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    load()
  }, [refresh])

  async function load() {
    const [
      { count: contacts },
      { count: convos },
      { count: problems },
      { count: validated },
      { data: recentData },
      { data: problemsData },
      { data: contactsAll },
      { data: fuData },
    ] = await Promise.all([
      supabase.from('contacts').select('*', { count: 'exact', head: true }),
      supabase.from('conversations').select('*', { count: 'exact', head: true }),
      supabase.from('problems').select('*', { count: 'exact', head: true }),
      supabase.from('problems').select('*', { count: 'exact', head: true }).gte('severity', 4),
      supabase.from('contacts').select('*').order('created_at', { ascending: false }).limit(5),
      supabase.from('problems').select('*'),
      supabase.from('contacts').select('*'),
      supabase.from('contacts').select('*').not('followup_date', 'is', null).lte('followup_date', new Date().toISOString().split('T')[0]).limit(5),
    ])
    setStats({ contacts: contacts || 0, convos: convos || 0, problems: problems || 0, validated: validated || 0 })
    setRecent(recentData || [])

    // Aggregate problems
    const clusters = {}
    ;(problemsData || []).forEach(p => {
      const k = p.title.toLowerCase().trim()
      if (!clusters[k]) clusters[k] = { title: p.title, count: 0, totalSev: 0 }
      clusters[k].count++
      clusters[k].totalSev += p.severity
    })
    const agg = Object.values(clusters).map(c => ({ ...c, avgSev: c.totalSev / c.count })).sort((a,b) => b.count - a.count).slice(0, 5)
    setTopProblems(agg)

    // Pipeline counts
    const counts = STAGES.map((s, i) => ({ stage: s, count: (contactsAll || []).filter(c => c.stage === i).length }))
    setPipeline(counts)

    setFollowups(fuData || [])
  }

  return (
    <Layout>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:28 }}>
        <div>
          <h1 style={{ fontFamily:'DM Serif Display,serif', fontSize:28, letterSpacing:'-0.5px' }}>Dashboard</h1>
          <p style={{ fontSize:12, color:'var(--muted)', marginTop:3 }}>Your property owner discovery overview</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Contact
        </button>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:28 }}>
        {[
          { label:'Total Contacts', value:stats.contacts, sub:'Property owners tracked', cls:'c1' },
          { label:'Conversations', value:stats.convos, sub:'Logged interactions', cls:'c2' },
          { label:'Problems Found', value:stats.problems, sub:'Across all owners', cls:'c3' },
          { label:'Validated', value:stats.validated, sub:'High-severity confirmed', cls:'c4' },
        ].map(s => (
          <div key={s.label} className={`stat-card ${s.cls}`}>
            <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'1.5px', color:'var(--muted)', fontFamily:'DM Mono,monospace', marginBottom:8 }}>{s.label}</div>
            <div style={{ fontFamily:'DM Serif Display,serif', fontSize:36, lineHeight:1 }}>{s.value}</div>
            <div style={{ fontSize:11, color:'var(--muted)', marginTop:6 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
        {/* Recent contacts */}
        <div className="card">
          <span className="section-label">Recent Contacts</span>
          {!recent.length ? <p style={{ fontSize:13, color:'var(--muted)' }}>No contacts yet</p> : recent.map(c => (
            <div key={c.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--paper2)' }}>
              <div>
                <Link href={`/contacts/${c.id}`} style={{ fontSize:13, fontWeight:500, color:'var(--ink)', textDecoration:'none' }}>{c.name}</Link>
                <div style={{ fontSize:11, color:'var(--muted)' }}>{c.prop_type} · {c.location || 'No location'}</div>
              </div>
              <span className={`badge badge-stage-${c.stage}`}>{STAGES[c.stage]}</span>
            </div>
          ))}
        </div>

        {/* Top problems */}
        <div className="card">
          <span className="section-label">Top Problems</span>
          {!topProblems.length ? <p style={{ fontSize:13, color:'var(--muted)' }}>No problems logged yet</p> : topProblems.map(p => (
            <div key={p.title} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--paper2)' }}>
              <div>
                <div style={{ fontSize:13, fontWeight:500 }}>{p.title}</div>
                <div style={{ fontSize:11, color:'var(--muted)' }}>{p.count} owner{p.count>1?'s':''} · avg {p.avgSev.toFixed(1)}/5</div>
              </div>
              <div style={{ fontSize:13, fontWeight:700, fontFamily:'DM Mono,monospace', color:'var(--accent)' }}>{p.count}×</div>
            </div>
          ))}
        </div>
      </div>

      {/* Pipeline */}
      <div className="card" style={{ marginBottom:20 }}>
        <span className="section-label">Pipeline</span>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {pipeline.map((s, i) => (
            <div key={s.stage} style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', background:'var(--white)', border:'1.5px solid var(--border)', borderRadius:8, fontSize:12 }}>
              <span className={`badge badge-stage-${i}`}>{s.stage}</span>
              <span style={{ fontWeight:700, fontFamily:'DM Mono,monospace' }}>{s.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Follow-ups */}
      <div className="card">
        <span className="section-label">Overdue Follow-ups</span>
        {!followups.length
          ? <p style={{ fontSize:13, color:'var(--muted)' }}>No overdue follow-ups 🎉</p>
          : followups.map(c => (
            <div key={c.id} style={{ background:'#fff8e1', border:'1.5px solid #f0c040', borderRadius:10, padding:'12px 14px', marginBottom:8, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:'#7a5500', fontFamily:'DM Mono,monospace', textTransform:'uppercase', letterSpacing:'0.8px' }}>Follow-up due</div>
                <Link href={`/contacts/${c.id}`} style={{ fontSize:14, fontWeight:600, color:'#4a3200', textDecoration:'none' }}>{c.name}</Link>
                <div style={{ fontSize:12, color:'#7a5500', marginTop:2 }}>{c.followup_reason || 'No reason given'} · Due: {formatDate(c.followup_date)}</div>
              </div>
              <Link href={`/contacts/${c.id}`} className="btn btn-sm btn-ghost">View →</Link>
            </div>
          ))
        }
      </div>

      {showAdd && <ContactModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); setRefresh(r => r+1) }} />}
    </Layout>
  )
}
