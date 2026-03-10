import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { STAGES, formatDate, FlagBadges } from '../lib/helpers'
import Link from 'next/link'

export default function Followups() {
  const [contacts, setContacts] = useState([])
  const [problems, setProblems] = useState({})
  const [convos, setConvos] = useState({})

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: c }, { data: p }, { data: cv }] = await Promise.all([
      supabase.from('contacts').select('*').or('followup_date.not.is.null,flag_followup.eq.true').order('followup_date', { ascending: true, nullsFirst: false }),
      supabase.from('problems').select('*'),
      supabase.from('conversations').select('contact_id'),
    ])
    setContacts(c || [])
    const pm = {}
    ;(p || []).forEach(x => { if (!pm[x.contact_id]) pm[x.contact_id] = []; pm[x.contact_id].push(x) })
    setProblems(pm)
    const cm = {}
    ;(cv || []).forEach(x => { cm[x.contact_id] = (cm[x.contact_id]||0)+1 })
    setConvos(cm)
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <Layout>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontFamily:'DM Serif Display,serif', fontSize:28, letterSpacing:'-0.5px' }}>Follow-ups</h1>
        <p style={{ fontSize:12, color:'var(--muted)', marginTop:3 }}>Contacts scheduled for re-engagement</p>
      </div>

      {!contacts.length ? (
        <div className="empty-state">
          <div style={{ fontSize:36, marginBottom:12 }}>📅</div>
          <div style={{ fontSize:15, fontWeight:600, color:'var(--ink)', marginBottom:6 }}>No follow-ups scheduled</div>
          <div style={{ fontSize:13 }}>Set follow-up dates when editing contacts</div>
        </div>
      ) : contacts.map(c => {
        const overdue = c.followup_date && c.followup_date <= today
        const cProblems = problems[c.id] || []
        const convoCount = convos[c.id] || 0
        const avgSev = cProblems.length ? cProblems.reduce((a,p)=>a+p.severity,0)/cProblems.length : 0

        return (
          <div key={c.id} className="card" style={{ marginBottom:12 }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16 }}>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                  <Link href={`/contacts/${c.id}`} style={{ fontFamily:'DM Serif Display,serif', fontSize:18, color:'var(--ink)', textDecoration:'none' }}>{c.name}</Link>
                  <span className={`badge badge-stage-${c.stage}`}>{STAGES[c.stage]}</span>
                  {overdue && <span style={{ fontSize:11, color:'var(--danger)', fontWeight:600 }}>⚠ OVERDUE</span>}
                </div>
                <div style={{ fontSize:12, color:'var(--muted)', marginBottom:8 }}>{c.prop_type} · {c.location||'No location'} · {c.portfolio}</div>
                {c.followup_date && <div style={{ fontSize:13, color: overdue?'var(--danger)':'var(--ink)', marginBottom:3 }}>📅 Follow-up: {formatDate(c.followup_date)}</div>}
                {c.followup_reason && <div style={{ fontSize:12, color:'var(--muted)', marginBottom:8 }}>Reason: {c.followup_reason}</div>}
                <div style={{ fontSize:12, color:'var(--muted)', marginBottom:8 }}>
                  {cProblems.length ? `⚠ ${cProblems.length} problem${cProblems.length>1?'s':''} found` : 'No problems logged'}
                  {' · '}{convoCount ? `${convoCount} conversation${convoCount>1?'s':''}` : 'No conversations'}
                  {avgSev > 0 ? ` · Avg severity: ${avgSev.toFixed(1)}/5` : ''}
                </div>
                <FlagBadges flags={c} />
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8, alignItems:'flex-end' }}>
                <Link href={`/contacts/${c.id}`} className="btn btn-primary btn-sm">View Profile →</Link>
              </div>
            </div>

            {cProblems.length > 0 && (
              <>
                <div className="divider" />
                <span className="section-label">Key Problems</span>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {cProblems.slice(0,3).map(p => (
                    <div key={p.id} style={{ fontSize:12, padding:'4px 10px', background:'var(--paper2)', borderRadius:6 }}>{p.title} ({p.severity}/5)</div>
                  ))}
                </div>
              </>
            )}
          </div>
        )
      })}
    </Layout>
  )
}
