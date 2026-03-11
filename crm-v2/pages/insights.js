import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { WTP_ORDER, CatTag, calcOppScore } from '../lib/helpers'
import Link from 'next/link'

function Bar({ label, value, max, color, suffix='' }) {
  return (
    <div className="insight-row">
      <div className="insight-label" title={label}>{label}</div>
      <div className="insight-track"><div className="insight-fill" style={{ width:`${Math.round(value/max*100)}%`, background:color||'var(--accent)' }} /></div>
      <div className="insight-val">{typeof value==='number'&&!Number.isInteger(value)?value.toFixed(1):value}{suffix}</div>
    </div>
  )
}

export default function Insights() {
  const [agg, setAgg] = useState([])
  const [contacts, setContacts] = useState([])
  const [problems, setProblems] = useState([])

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data:p },{ data:c }] = await Promise.all([
      supabase.from('problems').select('*'),
      supabase.from('contacts').select('*'),
    ])
    setProblems(p||[])
    setContacts(c||[])

    const clusters = {}
    ;(p||[]).forEach(prob => {
      const k = prob.title.toLowerCase().trim()
      if (!clusters[k]) clusters[k] = { title:prob.title, category:prob.category, count:0, totalSev:0, totalUrg:0, wtpScores:[], contactIds:new Set(), problems:[] }
      clusters[k].count++
      clusters[k].totalSev += prob.severity
      clusters[k].totalUrg += (prob.urgency||prob.severity)
      clusters[k].wtpScores.push(WTP_ORDER[prob.wtp]>=0?WTP_ORDER[prob.wtp]:0)
      if (prob.contact_id) clusters[k].contactIds.add(prob.contact_id)
      clusters[k].problems.push(prob)
    })
    const aggData = Object.values(clusters).map(c => ({
      ...c,
      avgSev: c.count?c.totalSev/c.count:0,
      avgUrg: c.count?c.totalUrg/c.count:0,
      avgWtp: c.wtpScores.length?c.wtpScores.reduce((a,b)=>a+b,0)/c.wtpScores.length:0,
      ownerCount: c.contactIds.size,
      contactIds: [...c.contactIds],
    })).sort((a,b)=>b.count-a.count)
    setAgg(aggData)
  }

  const betas = contacts.filter(c=>c.flag_beta||c.future_fit==='Beta Candidate')
  const warmLeads = contacts.filter(c=>c.flag_interested||c.flag_future_customer||c.future_fit==='Likely Early Customer')
  const maxCount = Math.max(1,...agg.map(a=>a.ownerCount))
  const bySev = [...agg].sort((a,b)=>b.avgSev-a.avgSev)
  const byWtp = [...agg].sort((a,b)=>b.avgWtp-a.avgWtp)

  const demandScore = (a) => Math.min(100, Math.round(a.ownerCount*25 + a.avgSev*10 + a.avgWtp*8))

  return (
    <Layout>
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Insights</h1>
            <p className="page-sub">Problem patterns, demand signals, and future opportunity analysis</p>
          </div>
        </div>

        {/* Summary stats */}
        <div className="stat-grid" style={{ gridTemplateColumns:'repeat(4,1fr)', marginBottom:20 }}>
          {[
            { label:'Unique Problem Types', val:agg.length, cls:'stat-c1' },
            { label:'Beta Candidates', val:betas.length, cls:'stat-c2' },
            { label:'Warm / Future Leads', val:warmLeads.length, cls:'stat-c3' },
            { label:'Avg Severity', val:problems.length?(problems.reduce((a,p)=>a+p.severity,0)/problems.length).toFixed(1):'—', cls:'stat-c4' },
          ].map(s => (
            <div key={s.label} className={`stat-card ${s.cls}`}>
              <div className="stat-label">{s.label}</div>
              <div className="stat-val">{s.val}</div>
            </div>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18, marginBottom:18 }}>
          <div className="card">
            <span className="sec-label">Most Commonly Mentioned Problems</span>
            {!agg.length ? <div style={{ fontSize:13, color:'var(--muted)' }}>No data yet</div>
              : agg.slice(0,8).map(p=><Bar key={p.title} label={p.title} value={p.ownerCount} max={maxCount} color="var(--blue)" suffix={` owner${p.ownerCount!==1?'s':''}`} />)}
          </div>
          <div className="card">
            <span className="sec-label">Highest Severity Problems</span>
            {!bySev.length ? <div style={{ fontSize:13, color:'var(--muted)' }}>No data yet</div>
              : bySev.slice(0,8).map(p=><Bar key={p.title} label={p.title} value={p.avgSev} max={5} color="var(--accent)" suffix="/5" />)}
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18, marginBottom:18 }}>
          <div className="card">
            <span className="sec-label">Willingness to Pay Signal</span>
            {!byWtp.length ? <div style={{ fontSize:13, color:'var(--muted)' }}>No data yet</div>
              : byWtp.slice(0,8).map(p=><Bar key={p.title} label={p.title} value={p.avgWtp} max={4} color="var(--green)" />)}
          </div>
          <div className="card">
            <span className="sec-label">Beta & Future Customer Pool</span>
            {!betas.length && !warmLeads.length ? <div style={{ fontSize:13, color:'var(--muted)' }}>No flagged contacts yet</div>
              : [...new Map([...betas,...warmLeads].map(c=>[c.id,c])).values()].map(c => (
                <div key={c.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid var(--paper2)' }}>
                  <div>
                    <Link href={`/contacts/${c.id}`} style={{ fontSize:13, fontWeight:500, color:'var(--ink)', textDecoration:'none' }}>{c.name}</Link>
                    <div style={{ fontSize:11, color:'var(--muted)' }}>{c.future_fit||c.prop_type}</div>
                  </div>
                  <div style={{ display:'flex', gap:4 }}>
                    {c.flag_beta && <span className="badge badge-beta" style={{ fontSize:9 }}>Beta</span>}
                    {c.flag_future_customer && <span className="badge badge-lead" style={{ fontSize:9 }}>Customer</span>}
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        {/* Full aggregate */}
        <div className="card">
          <span className="sec-label">Full Problem Cluster Analysis</span>
          {!agg.length ? <div style={{ fontSize:13, color:'var(--muted)' }}>No problems logged yet</div>
            : agg.map(p => {
              const ds = demandScore(p)
              return (
                <div key={p.title} style={{ background:'var(--white)', border:'1.5px solid var(--border)', borderRadius:10, padding:'14px 16px', marginBottom:10 }}>
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
                    <div>
                      <div style={{ fontSize:14, fontWeight:600 }}>{p.title}</div>
                      <div style={{ fontSize:11, color:'var(--muted)', fontFamily:'Geist Mono,monospace', marginTop:2 }}>{p.ownerCount} owner{p.ownerCount!==1?'s':''} · {p.count} instance{p.count!==1?'s':''}</div>
                    </div>
                    <CatTag category={p.category} />
                  </div>
                  <div style={{ display:'flex', gap:20, marginBottom:10 }}>
                    {[['Owners',p.ownerCount],['Avg Sev',p.avgSev.toFixed(1)],['Avg Urg',p.avgUrg.toFixed(1)],['WTP Signal',p.avgWtp.toFixed(1)]].map(([l,v])=>(
                      <div key={l} style={{ textAlign:'center' }}>
                        <div style={{ fontFamily:'Instrument Serif,serif', fontSize:22 }}>{v}</div>
                        <div style={{ fontSize:9, textTransform:'uppercase', letterSpacing:'1px', color:'var(--muted)', fontFamily:'Geist Mono,monospace' }}>{l}</div>
                      </div>
                    ))}
                    <div style={{ textAlign:'center', marginLeft:'auto' }}>
                      <div style={{ fontFamily:'Instrument Serif,serif', fontSize:22, color:ds>=70?'var(--green)':ds>=40?'var(--gold)':'var(--muted)' }}>{ds}</div>
                      <div style={{ fontSize:9, textTransform:'uppercase', letterSpacing:'1px', color:'var(--muted)', fontFamily:'Geist Mono,monospace' }}>Demand Score</div>
                    </div>
                  </div>
                  <div style={{ background:'var(--paper2)', borderRadius:4, height:5, overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:4, background:`linear-gradient(90deg,var(--blue),var(--accent))`, width:`${ds}%`, transition:'width .5s' }} />
                  </div>
                </div>
              )
            })
          }
        </div>
      </div>
    </Layout>
  )
}
