import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { CAT_STYLES, formatDate, SevDots } from '../lib/helpers'
import Link from 'next/link'

export default function Problems() {
  const [problems, setProblems] = useState([])
  const [contacts, setContacts] = useState({})

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from('problems').select('*').order('severity', { ascending: false }),
      supabase.from('contacts').select('id, name'),
    ])
    setProblems(p || [])
    const cm = {}
    ;(c || []).forEach(x => cm[x.id] = x.name)
    setContacts(cm)
  }

  return (
    <Layout>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:28 }}>
        <div>
          <h1 style={{ fontFamily:'DM Serif Display,serif', fontSize:28, letterSpacing:'-0.5px' }}>Problems</h1>
          <p style={{ fontSize:12, color:'var(--muted)', marginTop:3 }}>All pain points discovered across your conversations</p>
        </div>
      </div>

      {!problems.length ? (
        <div className="empty-state">
          <div style={{ fontSize:36, marginBottom:12 }}>⚠️</div>
          <div style={{ fontSize:15, fontWeight:600, color:'var(--ink)', marginBottom:6 }}>No problems logged yet</div>
          <div style={{ fontSize:13 }}>Log problems from individual contact profiles</div>
        </div>
      ) : problems.map(p => {
        const catStyle = CAT_STYLES[p.category] || CAT_STYLES['Other']
        return (
          <div key={p.id} style={{ background:'var(--white)', border:'1.5px solid var(--border)', borderRadius:10, padding:16, marginBottom:10 }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
              <div>
                <div style={{ fontSize:14, fontWeight:600 }}>{p.title}</div>
                <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:1, color:'var(--muted)', fontFamily:'DM Mono,monospace', marginTop:2 }}>
                  {p.category}
                  {p.contact_id && contacts[p.contact_id] && (
                    <> · <Link href={`/contacts/${p.contact_id}`} style={{ color:'var(--accent3)', textDecoration:'none' }}>{contacts[p.contact_id]}</Link></>
                  )}
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
                <SevDots severity={p.severity} />
                <span style={{ padding:'2px 8px', borderRadius:4, fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.8px', fontFamily:'DM Mono,monospace', background:catStyle.bg, color:catStyle.color }}>{p.category}</span>
              </div>
            </div>
            {p.description && <div style={{ fontSize:13, color:'var(--muted)', marginTop:8, lineHeight:1.5 }}>{p.description}</div>}
            {p.quote && <div style={{ fontSize:12, color:'var(--accent3)', fontStyle:'italic', marginTop:8, padding:8, background:'var(--paper)', borderRadius:6, borderLeft:'3px solid var(--accent3)' }}>"{p.quote}"</div>}
            <div style={{ display:'flex', gap:16, marginTop:10, flexWrap:'wrap' }}>
              {[['Severity',`${p.severity}/5`],['Frequency',p.frequency],['WTP',p.wtp],['Date',formatDate(p.created_at)]].map(([l,v])=>(
                <div key={l} style={{ fontSize:11, color:'var(--muted)' }}><strong style={{ color:'var(--ink)' }}>{l}:</strong> {v}</div>
              ))}
              {p.workaround && <div style={{ fontSize:11, color:'var(--muted)', flex:'1 0 100%' }}><strong style={{ color:'var(--ink)' }}>Workaround:</strong> {p.workaround}</div>}
            </div>
          </div>
        )
      })}
    </Layout>
  )
}
