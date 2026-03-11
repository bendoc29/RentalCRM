import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { formatDate, SevDots, CatTag, CAT_CLASS, CATEGORIES } from '../lib/helpers'
import Link from 'next/link'
import { ProblemModal } from '../components/Modals'

export default function Problems() {
  const [problems, setProblems] = useState([])
  const [contacts, setContacts] = useState({})
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => { load() }, [refresh])

  async function load() {
    const [{ data:p },{ data:c }] = await Promise.all([
      supabase.from('problems').select('*').order('severity',{ascending:false}),
      supabase.from('contacts').select('id,name'),
    ])
    setProblems(p||[])
    const cm = {}; (c||[]).forEach(x => cm[x.id]=x.name)
    setContacts(cm)
  }

  const filtered = problems.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !search || p.title.toLowerCase().includes(q) || (p.description||'').toLowerCase().includes(q)
    const matchFilter = filter === 'all' || p.category === filter || (filter === 'critical' && p.severity >= 4) || (filter === 'high_wtp' && ['High','Very High'].includes(p.wtp))
    return matchSearch && matchFilter
  })

  const filters = [
    { id:'all', label:'All Problems' },
    { id:'critical', label:'Critical (4–5)' },
    { id:'high_wtp', label:'High WTP' },
    ...CATEGORIES.map(c => ({ id:c, label:c })),
  ]

  return (
    <Layout>
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Problem Database</h1>
            <p className="page-sub">{problems.length} pain points discovered across all conversations</p>
          </div>
          <div className="header-actions">
            <div className="search-wrap">
              <svg className="search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input className="search-input" placeholder="Search problems…" value={search} onChange={e=>setSearch(e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Log Problem</button>
          </div>
        </div>

        <div className="filter-pills">
          {filters.map(f => (
            <div key={f.id} className={`filter-pill ${filter===f.id?'active':''}`} onClick={() => setFilter(f.id)}>{f.label}</div>
          ))}
        </div>

        {!filtered.length ? (
          <div className="empty">
            <div className="empty-icon">⚠️</div>
            <div className="empty-title">No problems found</div>
            <div className="empty-sub">Log problems from individual contact profiles or click "Log Problem"</div>
          </div>
        ) : filtered.map(p => {
          const contactName = p.contact_id ? contacts[p.contact_id] : null
          return (
            <div key={p.id} className="problem-card">
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
                <div style={{ flex:1 }}>
                  <div className="problem-title">{p.title}</div>
                  <div style={{ display:'flex', gap:8, marginTop:5, flexWrap:'wrap', alignItems:'center' }}>
                    <CatTag category={p.category} />
                    {contactName && <Link href={`/contacts/${p.contact_id}`} style={{ fontSize:11, color:'var(--blue)', textDecoration:'none' }}>{contactName}</Link>}
                    <span style={{ fontSize:10, color:'var(--muted)', fontFamily:'Geist Mono,monospace' }}>{formatDate(p.created_at)}</span>
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:5, flexShrink:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontSize:10, color:'var(--muted)' }}>Severity</span><SevDots severity={p.severity} />
                  </div>
                  {p.urgency && <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontSize:10, color:'var(--muted)' }}>Urgency</span><SevDots severity={p.urgency} />
                  </div>}
                </div>
              </div>
              {p.description && <div style={{ fontSize:12.5, color:'var(--muted)', marginTop:8, lineHeight:1.55 }}>{p.description}</div>}
              {p.quote && <div className="quote-block">"{p.quote}"</div>}
              <div className="problem-meta">
                {[['Frequency',p.frequency],['WTP',p.wtp],['Impact',p.business_impact]].filter(([,v])=>v).map(([l,v])=>(
                  <div key={l} className="problem-meta-item"><strong>{l}:</strong> {v}</div>
                ))}
                {p.workaround && <div className="problem-meta-item" style={{ flex:'1 0 100%' }}><strong>Workaround:</strong> {p.workaround}</div>}
                {p.product_relevance && <div className="problem-meta-item" style={{ flex:'1 0 100%', color:'var(--blue)' }}><strong>Product angle:</strong> {p.product_relevance}</div>}
              </div>
            </div>
          )
        })}
      </div>
      {showAdd && <ProblemModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); setRefresh(r=>r+1) }} />}
    </Layout>
  )
}
