import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { CAT_STYLES, WTP_ORDER } from '../lib/helpers'
import Link from 'next/link'

function InsightBar({ label, value, max, color }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid var(--paper2)' }}>
      <div style={{ flex:'0 0 200px', fontSize:13, fontWeight:500 }}>{label}</div>
      <div style={{ flex:1, background:'var(--paper2)', borderRadius:4, height:8, overflow:'hidden' }}>
        <div style={{ height:'100%', borderRadius:4, background:color||'var(--accent)', width:`${Math.round(value/max*100)}%`, transition:'width 0.6s ease' }} />
      </div>
      <div style={{ flex:'0 0 60px', textAlign:'right', fontSize:12, fontWeight:600, fontFamily:'DM Mono,monospace' }}>{typeof value === 'number' ? (Number.isInteger(value) ? value : value.toFixed(1)) : value}</div>
    </div>
  )
}

export default function Insights() {
  const [agg, setAgg] = useState([])
  const [betas, setBetas] = useState([])

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: problems }, { data: betaContacts }] = await Promise.all([
      supabase.from('problems').select('*'),
      supabase.from('contacts').select('*').or('flag_beta.eq.true,flag_interested.eq.true'),
    ])

    const clusters = {}
    ;(problems || []).forEach(p => {
      const k = p.title.toLowerCase().trim()
      if (!clusters[k]) clusters[k] = { title:p.title, category:p.category, count:0, totalSev:0, wtpScores:[] }
      clusters[k].count++
      clusters[k].totalSev += p.severity
      clusters[k].wtpScores.push(WTP_ORDER[p.wtp] >= 0 ? WTP_ORDER[p.wtp] : 0)
    })
    const aggData = Object.values(clusters).map(c => ({
      ...c,
      avgSev: c.count ? c.totalSev/c.count : 0,
      avgWtp: c.wtpScores.length ? c.wtpScores.reduce((a,b)=>a+b,0)/c.wtpScores.length : 0,
    })).sort((a,b) => b.count - a.count)
    setAgg(aggData)
    setBetas(betaContacts || [])
  }

  const maxCount = Math.max(1, ...agg.map(a=>a.count))
  const byCount = [...agg].sort((a,b)=>b.count-a.count)
  const bySev = [...agg].sort((a,b)=>b.avgSev-a.avgSev)
  const byWtp = [...agg].sort((a,b)=>b.avgWtp-a.avgWtp)

  return (
    <Layout>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontFamily:'DM Serif Display,serif', fontSize:28, letterSpacing:'-0.5px' }}>Insights</h1>
        <p style={{ fontSize:12, color:'var(--muted)', marginTop:3 }}>Problem aggregation and demand signals</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
        <div className="card">
          <span className="section-label">Most Common Problems</span>
          {!byCount.length ? <p style={{ fontSize:13, color:'var(--muted)' }}>No data yet</p>
            : byCount.slice(0,8).map(p => <InsightBar key={p.title} label={p.title} value={p.count} max={maxCount} color="var(--accent3)" />)}
        </div>
        <div className="card">
          <span className="section-label">Highest Severity</span>
          {!bySev.length ? <p style={{ fontSize:13, color:'var(--muted)' }}>No data yet</p>
            : bySev.slice(0,8).map(p => <InsightBar key={p.title} label={p.title} value={p.avgSev} max={5} color="var(--accent)" />)}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
        <div className="card">
          <span className="section-label">Willingness to Pay Signal</span>
          {!byWtp.length ? <p style={{ fontSize:13, color:'var(--muted)' }}>No data yet</p>
            : byWtp.slice(0,8).map(p => <InsightBar key={p.title} label={p.title} value={p.avgWtp} max={4} color="var(--accent2)" />)}
        </div>
        <div className="card">
          <span className="section-label">Beta User Pool ({betas.length})</span>
          {!betas.length ? <p style={{ fontSize:13, color:'var(--muted)' }}>No beta users flagged yet</p>
            : betas.map(c => (
              <div key={c.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--paper2)' }}>
                <div>
                  <Link href={`/contacts/${c.id}`} style={{ fontSize:13, fontWeight:500, color:'var(--ink)', textDecoration:'none' }}>{c.name}</Link>
                  <div style={{ fontSize:11, color:'var(--muted)' }}>{c.prop_type} · {c.location||'No location'}</div>
                </div>
                <div style={{ display:'flex', gap:4 }}>
                  {c.flag_beta && <span className="badge badge-beta" style={{ fontSize:10 }}>🔬 Beta</span>}
                  {c.flag_interested && <span className="badge badge-interested" style={{ fontSize:10 }}>💡 Interested</span>}
                </div>
              </div>
            ))
          }
        </div>
      </div>

      <div className="card">
        <span className="section-label">Problem Aggregation — All Clusters</span>
        {!agg.length ? <p style={{ fontSize:13, color:'var(--muted)' }}>No problems logged yet</p>
          : agg.map(p => {
            const catStyle = CAT_STYLES[p.category] || CAT_STYLES['Other']
            const demandScore = Math.min(100, Math.round(p.count*20 + p.avgSev*10 + p.avgWtp*10))
            return (
              <div key={p.title} style={{ background:'var(--white)', border:'1.5px solid var(--border)', borderRadius:12, padding:'16px 18px', marginBottom:10 }}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:600 }}>{p.title}</div>
                    <div style={{ fontSize:11, color:'var(--muted)', fontFamily:'DM Mono,monospace', marginTop:2 }}>{p.count} owner{p.count>1?'s':''} mentioned this</div>
                  </div>
                  <span style={{ padding:'2px 8px', borderRadius:4, fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.8px', fontFamily:'DM Mono,monospace', background:catStyle.bg, color:catStyle.color }}>{p.category}</span>
                </div>
                <div style={{ display:'flex', gap:20, marginBottom:10 }}>
                  {[['Owners',p.count],['Avg Sev',p.avgSev.toFixed(1)],['WTP Signal',p.avgWtp.toFixed(1)]].map(([l,v]) => (
                    <div key={l} style={{ textAlign:'center' }}>
                      <div style={{ fontFamily:'DM Serif Display,serif', fontSize:22 }}>{v}</div>
                      <div style={{ fontSize:9, textTransform:'uppercase', letterSpacing:'1.2px', color:'var(--muted)', fontFamily:'DM Mono,monospace' }}>{l}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background:'var(--paper2)', borderRadius:6, height:6, overflow:'hidden' }}>
                  <div style={{ height:'100%', borderRadius:6, background:`linear-gradient(90deg,var(--accent3),var(--accent))`, width:`${demandScore}%` }} />
                </div>
                <div style={{ fontSize:10, color:'var(--muted)', fontFamily:'DM Mono,monospace', marginTop:4 }}>Demand score: {demandScore}/100</div>
              </div>
            )
          })}
      </div>
    </Layout>
  )
}
