import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { STAGES, FOLLOWUP_PRIORITY, formatDate, FlagBadges, StageB, calcOppScore } from '../lib/helpers'
import Link from 'next/link'

export default function Followups() {
  const [contacts, setContacts] = useState([])
  const [problems, setProblems] = useState({})
  const [convos, setConvos] = useState({})
  const [filter, setFilter] = useState('all')

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data:c },{ data:p },{ data:cv }] = await Promise.all([
      supabase.from('contacts').select('*').or('followup_date.not.is.null,flag_followup.eq.true').order('followup_date',{ascending:true,nullsFirst:false}),
      supabase.from('problems').select('*'),
      supabase.from('conversations').select('contact_id,date,type,notes,reply'),
    ])
    setContacts(c||[])
    const pm = {}; (p||[]).forEach(x => { if(!pm[x.contact_id]) pm[x.contact_id]=[]; pm[x.contact_id].push(x) })
    setProblems(pm)
    const cm = {}; (cv||[]).forEach(x => { if(!cm[x.contact_id]) cm[x.contact_id]=[]; cm[x.contact_id].push(x) })
    setConvos(cm)
  }

  const today = new Date().toISOString().split('T')[0]

  const filtered = contacts.filter(c => {
    if (filter === 'overdue') return c.followup_date && c.followup_date <= today
    if (filter === 'this_week') {
      const week = new Date(); week.setDate(week.getDate() + 7)
      return c.followup_date && c.followup_date > today && c.followup_date <= week.toISOString().split('T')[0]
    }
    if (filter === 'high') return c.followup_priority === 'High' || c.followup_priority === 'Very High'
    if (filter === 'beta') return c.flag_beta
    return true
  })

  const overdueCnt = contacts.filter(c=>c.followup_date && c.followup_date<=today).length

  return (
    <Layout>
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Follow-up Queue</h1>
            <p className="page-sub">{overdueCnt > 0 ? `${overdueCnt} overdue · ` : ''}{contacts.length} contacts scheduled</p>
          </div>
        </div>

        <div className="filter-pills">
          {[
            { id:'all', label:`All (${contacts.length})` },
            { id:'overdue', label:`Overdue (${overdueCnt})` },
            { id:'this_week', label:'This Week' },
            { id:'high', label:'High Priority' },
            { id:'beta', label:'Beta Candidates' },
          ].map(f => (
            <div key={f.id} className={`filter-pill ${filter===f.id?'active':''}`} onClick={() => setFilter(f.id)}>{f.label}</div>
          ))}
        </div>

        {!filtered.length ? (
          <div className="empty">
            <div className="empty-icon">📅</div>
            <div className="empty-title">No follow-ups in this view</div>
            <div className="empty-sub">Set follow-up dates when editing contacts</div>
          </div>
        ) : filtered.map(c => {
          const overdue = c.followup_date && c.followup_date <= today
          const cProbs = problems[c.id]||[]
          const cConvos = convos[c.id]||[]
          const score = calcOppScore(c, cProbs, cConvos)
          const lastConvo = cConvos.sort((a,b)=>b.date.localeCompare(a.date))[0]
          const avgSev = cProbs.length ? cProbs.reduce((a,p)=>a+p.severity,0)/cProbs.length : 0

          return (
            <div key={c.id} className="card" style={{ marginBottom:14 }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:5 }}>
                    <Link href={`/contacts/${c.id}`} style={{ fontFamily:'Instrument Serif,serif', fontSize:20, color:'var(--ink)', textDecoration:'none' }}>{c.name}</Link>
                    <StageB stage={c.stage} />
                    {overdue && <span style={{ fontSize:11, color:'var(--accent)', fontWeight:700 }}>⚠ OVERDUE</span>}
                    {c.followup_priority && ['High','Very High'].includes(c.followup_priority) && (
                      <span className="badge badge-hot" style={{ fontSize:9 }}>{c.followup_priority} Priority</span>
                    )}
                  </div>

                  <div style={{ fontSize:12, color:'var(--muted)', marginBottom:8 }}>
                    {[c.prop_type, c.location, c.portfolio].filter(Boolean).join(' · ')}
                  </div>

                  {c.followup_date && (
                    <div style={{ fontSize:13, color:overdue?'var(--accent)':'var(--ink)', marginBottom:3, fontWeight:overdue?600:400 }}>
                      📅 {overdue?'Overdue: ':''}{formatDate(c.followup_date)}
                    </div>
                  )}
                  {c.followup_reason && <div style={{ fontSize:12, color:'var(--muted)', marginBottom:8 }}>{c.followup_reason}</div>}

                  <FlagBadges c={c} />

                  {/* Context snapshot */}
                  <div style={{ marginTop:12, display:'grid', gridTemplateColumns:'repeat(3,auto)', gap:'6px 20px', width:'fit-content' }}>
                    {[
                      cProbs.length ? `${cProbs.length} problem${cProbs.length>1?'s':''}` : null,
                      avgSev > 0 ? `Avg severity ${avgSev.toFixed(1)}/5` : null,
                      cConvos.length ? `${cConvos.length} interaction${cConvos.length>1?'s':''}` : null,
                      score > 0 ? `Score: ${score}/10` : null,
                    ].filter(Boolean).map(s => (
                      <span key={s} style={{ fontSize:11, color:'var(--muted)', fontFamily:'Geist Mono,monospace' }}>{s}</span>
                    ))}
                  </div>

                  {/* Last interaction */}
                  {lastConvo && (
                    <div style={{ marginTop:10, padding:'9px 12px', background:'var(--paper2)', borderRadius:7, fontSize:12 }}>
                      <span style={{ color:'var(--muted)', fontFamily:'Geist Mono,monospace', fontSize:10, textTransform:'uppercase', letterSpacing:'.7px' }}>Last interaction · {formatDate(lastConvo.date)}</span>
                      <div style={{ marginTop:3, color:'var(--ink)', lineHeight:1.4 }}>{(lastConvo.notes||lastConvo.reply||'No notes').substring(0,140)}{(lastConvo.notes||lastConvo.reply||'').length>140?'…':''}</div>
                    </div>
                  )}

                  {/* Key problems */}
                  {cProbs.length > 0 && (
                    <div style={{ marginTop:8, display:'flex', gap:6, flexWrap:'wrap' }}>
                      {cProbs.slice(0,3).map(p => (
                        <span key={p.id} style={{ fontSize:11, padding:'3px 9px', background:'var(--paper)', border:'1px solid var(--border)', borderRadius:5 }}>{p.title} ({p.severity}/5)</span>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display:'flex', flexDirection:'column', gap:7, alignItems:'flex-end', flexShrink:0 }}>
                  <Link href={`/contacts/${c.id}`} className="btn btn-primary btn-sm">View Profile →</Link>
                  <Link href={`/contacts/${c.id}`} className="btn btn-green btn-sm">Generate Message</Link>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </Layout>
  )
}
