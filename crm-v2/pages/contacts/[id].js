import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'
import { supabase } from '../../lib/supabase'
import { STAGES, WARMTH, FUTURE_FIT, formatDate, SevDots, FlagBadges, StageB, WarmthB, CatTag, calcOppScore, useToast, Toast, MSG_TYPES, Spinner } from '../../lib/helpers'
import Link from 'next/link'
import ContactModal from '../../components/ContactModal'
import { ConvoModal, ProblemModal } from '../../components/Modals'

const TYPE_COLORS = { outreach:'var(--blue)', reply:'var(--green)', call:'var(--gold)', note:'var(--muted)', followup:'var(--purple)' }

export default function ContactProfile() {
  const router = useRouter()
  const { id } = router.query
  const [contact, setContact] = useState(null)
  const [convos, setConvos] = useState([])
  const [problems, setProblems] = useState([])
  const [tab, setTab] = useState('timeline')
  const [showEdit, setShowEdit] = useState(false)
  const [showConvo, setShowConvo] = useState(false)
  const [showProb, setShowProb] = useState(false)
  const [showGen, setShowGen] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const [toast, showToast] = useToast()

  useEffect(() => { if (id) load() }, [id, refresh])

  async function load() {
    const [{ data:c },{ data:cv },{ data:p }] = await Promise.all([
      supabase.from('contacts').select('*').eq('id',id).single(),
      supabase.from('conversations').select('*').eq('contact_id',id).order('date',{ascending:false}),
      supabase.from('problems').select('*').eq('contact_id',id).order('severity',{ascending:false}),
    ])
    setContact(c)
    setConvos(cv||[])
    setProblems(p||[])
  }

  async function deleteContact() {
    if (!confirm('Delete this contact and all their data?')) return
    await supabase.from('contacts').delete().eq('id',id)
    router.push('/contacts')
  }

  if (!contact) return <Layout><div className="page" style={{ color:'var(--muted)' }}>Loading…</div></Layout>

  const score = calcOppScore(contact, problems, convos)
  const today = new Date().toISOString().split('T')[0]
  const overdue = contact.followup_date && contact.followup_date <= today

  return (
    <Layout>
      <div className="page">
        <button className="back-link" onClick={() => router.push('/contacts')}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
          Back to Contacts
        </button>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:22 }}>
          <div>
            <h1 style={{ fontFamily:'Instrument Serif,serif', fontSize:32, letterSpacing:'-.3px', marginBottom:4 }}>{contact.name}</h1>
            <div style={{ fontSize:13, color:'var(--muted)', marginBottom:8 }}>
              {[contact.role, contact.business_name, contact.prop_type, contact.location].filter(Boolean).join(' · ')}
            </div>
            <FlagBadges c={contact} />
          </div>
          <div style={{ display:'flex', gap:7, flexWrap:'wrap', justifyContent:'flex-end' }}>
            <button className="btn btn-green" onClick={() => setShowGen(true)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
              Generate Message
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowConvo(true)}>+ Log Interaction</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowProb(true)}>+ Log Problem</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowEdit(true)}>Edit</button>
            <button className="btn btn-danger btn-sm" onClick={deleteContact}>Delete</button>
          </div>
        </div>

        <div className="profile-grid">
          {/* LEFT SIDEBAR */}
          <div className="profile-sidebar">

            {/* Identity */}
            <div className="card card-sm">
              <span className="sec-label">Contact Info</span>
              {[
                { k:'Email', v:contact.email },
                { k:'Phone', v:contact.phone },
                { k:'LinkedIn', v:contact.linkedin, link:true },
                { k:'Portfolio', v:contact.portfolio },
                { k:'Channel', v:contact.outreach_channel },
                { k:'Source', v:contact.source },
                { k:'Added', v:formatDate(contact.created_at) },
              ].filter(r=>r.v).map(r => (
                <div key={r.k} className="meta-row">
                  <span className="meta-key">{r.k}</span>
                  {r.link ? <a href={r.v.startsWith('http')?r.v:`https://${r.v}`} target="_blank" rel="noreferrer" style={{ fontSize:11, color:'var(--blue)', textDecoration:'none' }} className="meta-val">{r.v}</a>
                    : <span className="meta-val">{r.v}</span>}
                </div>
              ))}
            </div>

            {/* Stage + Warmth */}
            <div className="card card-sm">
              <span className="sec-label">Relationship Status</span>
              <div className="meta-row"><span className="meta-key">Stage</span><StageB stage={contact.stage} /></div>
              <div className="meta-row"><span className="meta-key">Warmth</span><WarmthB warmth={contact.relationship_warmth} /></div>
              <div className="meta-row"><span className="meta-key">Future Fit</span><span className="meta-val" style={{ fontSize:11 }}>{contact.future_fit||'—'}</span></div>
              <div className="meta-row"><span className="meta-key">WTP Est.</span><span className="meta-val" style={{ fontSize:11 }}>{contact.wtp_estimate||'—'}</span></div>
            </div>

            {/* Opportunity Score */}
            <div className="card card-sm score-wrap">
              <span className="sec-label">Opportunity Score</span>
              <div className="score-num" style={{ color:score>=8?'var(--green)':score>=5?'var(--gold)':'var(--muted)' }}>{score}</div>
              <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>out of 10</div>
              <div className="score-bar" style={{ marginTop:10 }}>
                <div className="score-fill" style={{ width:`${score*10}%` }} />
              </div>
            </div>

            {/* Follow-up */}
            <div className={`card card-sm ${overdue?'fu-card fu-overdue':''}`} style={{ background:overdue?'#fff5f5':'var(--white)' }}>
              <span className="sec-label">Follow-up</span>
              {contact.followup_date ? (
                <>
                  <div style={{ fontSize:13, fontWeight:600, color:overdue?'var(--accent)':'var(--ink)' }}>
                    {overdue && '⚠ Overdue: '}{formatDate(contact.followup_date)}
                  </div>
                  {contact.followup_priority && <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>Priority: {contact.followup_priority}</div>}
                  {contact.followup_reason && <div style={{ fontSize:12, color:'var(--muted)', marginTop:4, lineHeight:1.5 }}>{contact.followup_reason}</div>}
                </>
              ) : <div style={{ fontSize:12, color:'var(--muted)' }}>No follow-up scheduled</div>}
              <button className="btn btn-sm btn-ghost" style={{ marginTop:10, width:'100%', justifyContent:'center' }} onClick={() => setShowEdit(true)}>
                {contact.followup_date ? 'Update Follow-up' : 'Set Follow-up'}
              </button>
            </div>

            {/* Re-engagement angle */}
            {contact.re_engagement_angle && (
              <div className="card card-sm" style={{ background:'#f0fff4', border:'1.5px solid #80c880' }}>
                <span className="sec-label" style={{ color:'var(--green)' }}>Re-engagement Angle</span>
                <div style={{ fontSize:12.5, lineHeight:1.6, color:'var(--ink)' }}>{contact.re_engagement_angle}</div>
              </div>
            )}

            {/* Notes */}
            {contact.notes && (
              <div className="card card-sm">
                <span className="sec-label">Notes</span>
                <div style={{ fontSize:12.5, lineHeight:1.6 }} dangerouslySetInnerHTML={{ __html:contact.notes.replace(/\n/g,'<br>') }} />
              </div>
            )}
          </div>

          {/* RIGHT CONTENT */}
          <div>
            <div className="tabs">
              {[
                ['timeline',`Timeline (${convos.length})`],
                ['problems',`Problems (${problems.length})`],
                ['commercial','Commercial'],
              ].map(([k,l]) => (
                <div key={k} className={`tab ${tab===k?'active':''}`} onClick={() => setTab(k)}>{l}</div>
              ))}
            </div>

            {/* TIMELINE */}
            {tab === 'timeline' && (
              <div>
                {!convos.length ? (
                  <div className="empty">
                    <div className="empty-icon">💬</div>
                    <div className="empty-title">No interactions logged</div>
                    <div className="empty-sub">Log your first outreach or conversation</div>
                  </div>
                ) : convos.map(cv => (
                  <div key={cv.id} className="timeline-item">
                    <div>
                      <div className={`timeline-dot timeline-dot-${cv.type}`} style={{ marginTop:5 }} />
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                        <span style={{ fontSize:10.5, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', color:TYPE_COLORS[cv.type]||'var(--muted)' }}>{cv.type}</span>
                        {cv.channel && <span style={{ fontSize:10, color:'var(--muted)', fontFamily:'Geist Mono,monospace' }}>{cv.channel}</span>}
                        <span style={{ fontSize:10, color:'var(--muted)', fontFamily:'Geist Mono,monospace', marginLeft:'auto' }}>{formatDate(cv.date)}</span>
                        {cv.sentiment && cv.sentiment !== 'Neutral' && (
                          <span className={`badge ${cv.sentiment==='Very Positive'||cv.sentiment==='Positive'?'badge-lead':'badge-warm'}`} style={{ fontSize:9 }}>{cv.sentiment}</span>
                        )}
                      </div>
                      {cv.message && <><div style={{ fontSize:10, color:'var(--muted)', fontFamily:'Geist Mono,monospace', textTransform:'uppercase', letterSpacing:'.7px', marginBottom:3 }}>Message</div><div style={{ fontSize:13, lineHeight:1.65 }} dangerouslySetInnerHTML={{ __html:cv.message.replace(/\n/g,'<br>') }} /></>}
                      {cv.reply && <><div style={{ fontSize:10, color:'var(--muted)', fontFamily:'Geist Mono,monospace', textTransform:'uppercase', letterSpacing:'.7px', marginTop:10, marginBottom:3 }}>Their Reply</div><div style={{ fontSize:13, lineHeight:1.65, color:'var(--green)' }} dangerouslySetInnerHTML={{ __html:cv.reply.replace(/\n/g,'<br>') }} /></>}
                      {cv.notes && <><div style={{ fontSize:10, color:'var(--muted)', fontFamily:'Geist Mono,monospace', textTransform:'uppercase', letterSpacing:'.7px', marginTop:10, marginBottom:3 }}>Notes</div><div style={{ fontSize:13, lineHeight:1.65, color:'var(--muted)' }} dangerouslySetInnerHTML={{ __html:cv.notes.replace(/\n/g,'<br>') }} /></>}
                      {cv.next_step && <div style={{ marginTop:10, padding:'7px 11px', background:'var(--paper2)', borderRadius:6, fontSize:12, color:'var(--ink)' }}>→ Next: {cv.next_step}</div>}
                    </div>
                  </div>
                ))}
                <button className="btn btn-ghost btn-sm" style={{ marginTop:10 }} onClick={() => setShowConvo(true)}>+ Log Interaction</button>
              </div>
            )}

            {/* PROBLEMS */}
            {tab === 'problems' && (
              <div>
                {!problems.length ? (
                  <div className="empty">
                    <div className="empty-icon">⚠️</div>
                    <div className="empty-title">No problems logged</div>
                    <div className="empty-sub">Log pain points discovered in conversations</div>
                  </div>
                ) : problems.map(p => (
                  <div key={p.id} className="problem-card">
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
                      <div>
                        <div className="problem-title">{p.title}</div>
                        <div style={{ marginTop:4 }}><CatTag category={p.category} /></div>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6, flexShrink:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <span style={{ fontSize:10, color:'var(--muted)' }}>Sev</span><SevDots severity={p.severity} />
                        </div>
                        {p.urgency && <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <span style={{ fontSize:10, color:'var(--muted)' }}>Urg</span><SevDots severity={p.urgency} />
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
                ))}
                <button className="btn btn-ghost btn-sm" style={{ marginTop:8 }} onClick={() => setShowProb(true)}>+ Log Problem</button>
              </div>
            )}

            {/* COMMERCIAL */}
            {tab === 'commercial' && (
              <div>
                <div className="card" style={{ marginBottom:14 }}>
                  <span className="sec-label">Commercial Readiness</span>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                    {[
                      { label:'Future Fit', value:contact.future_fit||'Not assessed' },
                      { label:'WTP Estimate', value:contact.wtp_estimate||'Unknown' },
                      { label:'Opportunity Score', value:`${score}/10` },
                      { label:'Follow-up Priority', value:contact.followup_priority||'Not set' },
                    ].map(r => (
                      <div key={r.label} style={{ background:'var(--paper)', borderRadius:8, padding:'12px 14px' }}>
                        <div style={{ fontFamily:'Geist Mono,monospace', fontSize:9.5, textTransform:'uppercase', letterSpacing:'1px', color:'var(--muted)', marginBottom:4 }}>{r.label}</div>
                        <div style={{ fontSize:14, fontWeight:600 }}>{r.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {problems.length > 0 && (
                  <div className="card" style={{ marginBottom:14 }}>
                    <span className="sec-label">Problems Summary</span>
                    <div style={{ display:'flex', gap:16, marginBottom:12 }}>
                      <div style={{ textAlign:'center' }}>
                        <div style={{ fontFamily:'Instrument Serif,serif', fontSize:28 }}>{problems.length}</div>
                        <div style={{ fontSize:10, color:'var(--muted)', fontFamily:'Geist Mono,monospace', textTransform:'uppercase', letterSpacing:'1px' }}>Problems</div>
                      </div>
                      <div style={{ textAlign:'center' }}>
                        <div style={{ fontFamily:'Instrument Serif,serif', fontSize:28 }}>{(problems.reduce((a,p)=>a+p.severity,0)/problems.length).toFixed(1)}</div>
                        <div style={{ fontSize:10, color:'var(--muted)', fontFamily:'Geist Mono,monospace', textTransform:'uppercase', letterSpacing:'1px' }}>Avg Severity</div>
                      </div>
                      <div style={{ textAlign:'center' }}>
                        <div style={{ fontFamily:'Instrument Serif,serif', fontSize:28 }}>{problems.filter(p=>p.severity>=4).length}</div>
                        <div style={{ fontSize:10, color:'var(--muted)', fontFamily:'Geist Mono,monospace', textTransform:'uppercase', letterSpacing:'1px' }}>Critical (4–5)</div>
                      </div>
                    </div>
                    {problems.map(p => (
                      <div key={p.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid var(--paper2)' }}>
                        <div style={{ fontSize:12.5, fontWeight:500 }}>{p.title}</div>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <CatTag category={p.category} />
                          <SevDots severity={p.severity} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="card" style={{ background:'#f0fff4', border:'1.5px solid #80c880' }}>
                  <span className="sec-label" style={{ color:'var(--green)' }}>Message Generator</span>
                  <p style={{ fontSize:12.5, color:'var(--muted)', marginBottom:12, lineHeight:1.5 }}>
                    Generate a personalized follow-up message using this contact's history, problems, and relationship context.
                  </p>
                  <button className="btn btn-green" onClick={() => setShowGen(true)}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                    Generate Follow-Up Message
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showEdit && <ContactModal existing={contact} onClose={() => setShowEdit(false)} onSaved={() => { setShowEdit(false); setRefresh(r=>r+1) }} />}
      {showConvo && <ConvoModal contactId={id} onClose={() => setShowConvo(false)} onSaved={() => { setShowConvo(false); setRefresh(r=>r+1) }} />}
      {showProb && <ProblemModal contactId={id} onClose={() => setShowProb(false)} onSaved={() => { setShowProb(false); setRefresh(r=>r+1) }} />}
      {showGen && <MessageGenerator contact={contact} problems={problems} convos={convos} onClose={() => setShowGen(false)} onSaved={(m) => { showToast(`Message saved`); setRefresh(r=>r+1) }} />}
      <Toast message={toast} />
    </Layout>
  )
}

// ─── AI MESSAGE GENERATOR ───────────────────────────────────────────────────
function MessageGenerator({ contact, problems, convos, onClose, onSaved }) {
  const [msgType, setMsgType] = useState('warm_checkin')
  const [customInstruction, setCustomInstruction] = useState('')
  const [draft, setDraft] = useState('')
  const [edited, setEdited] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [mode, setMode] = useState('view') // view | edit
  const [saving, setSaving] = useState(false)

  async function generate() {
    setLoading(true); setError(null); setDraft(''); setEdited(''); setMode('view')
    try {
      const res = await fetch('/api/generate-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact, problems, convos, msgType, customInstruction }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setDraft(data.message)
      setEdited(data.message)
    } catch(e) { setError(e.message) }
    setLoading(false)
  }

  async function saveMessage() {
    setSaving(true)
    await supabase.from('generated_messages').insert({
      contact_id: contact.id,
      message_type: msgType,
      draft_output: draft,
      edited_output: edited !== draft ? edited : null,
      context_snapshot: JSON.stringify({ problems: problems.length, convos: convos.length, warmth: contact.relationship_warmth }),
    })
    setSaving(false)
    onSaved(edited)
  }

  function copy() {
    navigator.clipboard.writeText(edited || draft)
  }

  const contextSummary = [
    contact.prop_type && `${contact.prop_type}`,
    contact.portfolio && `${contact.portfolio}`,
    contact.location && `Based in ${contact.location}`,
    contact.relationship_warmth && `Relationship: ${contact.relationship_warmth}`,
    problems.length && `${problems.length} problem${problems.length>1?'s':''} logged`,
    convos.length && `${convos.length} interaction${convos.length>1?'s':''} logged`,
  ].filter(Boolean)

  const topProblems = problems.slice(0,3)

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal modal-xl">
        <div className="modal-header">
          <div className="modal-title">Generate Follow-Up Message</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Type selector */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
          {MSG_TYPES.map(t => (
            <button key={t.value} className={`btn btn-sm ${msgType===t.value?'btn-primary':'btn-ghost'}`} onClick={() => setMsgType(t.value)}>{t.label}</button>
          ))}
        </div>

        <div className="gen-panel">
          {/* Context panel */}
          <div className="gen-context">
            <div className="sec-label">Contact Context</div>
            <div style={{ fontFamily:'Instrument Serif,serif', fontSize:18, marginBottom:4 }}>{contact.name}</div>
            {contextSummary.map((s,i) => (
              <div key={i} style={{ fontSize:11.5, color:'var(--muted)', marginBottom:3, display:'flex', alignItems:'flex-start', gap:5 }}>
                <span style={{ color:'var(--border)' }}>·</span>{s}
              </div>
            ))}

            {topProblems.length > 0 && (
              <>
                <div className="divider" />
                <div className="sec-label">Key Problems</div>
                {topProblems.map(p => (
                  <div key={p.id} style={{ marginBottom:8 }}>
                    <div style={{ fontSize:12, fontWeight:600 }}>{p.title}</div>
                    <div style={{ fontSize:11, color:'var(--muted)' }}>Severity {p.severity}/5 · {p.frequency}</div>
                    {p.quote && <div style={{ fontSize:11, color:'var(--blue)', fontStyle:'italic', marginTop:3 }}>"{p.quote.substring(0,80)}{p.quote.length>80?'…':''}"</div>}
                  </div>
                ))}
              </>
            )}

            {contact.re_engagement_angle && (
              <>
                <div className="divider" />
                <div className="sec-label">Re-engagement Angle</div>
                <div style={{ fontSize:11.5, color:'var(--ink)', lineHeight:1.5 }}>{contact.re_engagement_angle}</div>
              </>
            )}

            <div className="divider" />
            <div className="form-group">
              <label className="form-label">Custom Instruction (optional)</label>
              <textarea className="form-textarea" value={customInstruction} onChange={e=>setCustomInstruction(e.target.value)} placeholder="e.g. Keep it very short, mention our cleaner scheduling feature…" style={{ minHeight:60, fontSize:12 }} />
            </div>

            <button className="btn btn-accent" style={{ width:'100%', justifyContent:'center', marginTop:10 }} onClick={generate} disabled={loading}>
              {loading ? <><Spinner /> Generating…</> : '✦ Generate Message'}
            </button>
          </div>

          {/* Output panel */}
          <div className="gen-output">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <div className="sec-label" style={{ marginBottom:0 }}>
                {MSG_TYPES.find(t=>t.value===msgType)?.label} Message
              </div>
              {draft && (
                <div style={{ display:'flex', gap:6 }}>
                  <button className="btn btn-xs btn-ghost" onClick={() => setMode(mode==='view'?'edit':'view')}>{mode==='view'?'Edit':'Preview'}</button>
                  <button className="btn btn-xs btn-ghost" onClick={copy}>Copy</button>
                </div>
              )}
            </div>

            {loading ? (
              <div className="gen-loading">
                <Spinner />
                <span>Writing your message…</span>
              </div>
            ) : error ? (
              <div style={{ background:'#fbe8e8', color:'var(--danger)', padding:'12px 14px', borderRadius:8, fontSize:13, margin:'auto 0' }}>{error}</div>
            ) : !draft ? (
              <div className="gen-loading" style={{ flexDirection:'column', color:'var(--muted)' }}>
                <div style={{ fontSize:24, marginBottom:8 }}>✦</div>
                <div style={{ fontSize:13 }}>Select a message type and click Generate</div>
                <div style={{ fontSize:12, marginTop:4, opacity:.7 }}>The AI will use {contact.name}'s history and problems to write a personalised message</div>
              </div>
            ) : mode === 'view' ? (
              <div className="gen-message-box">{edited || draft}</div>
            ) : (
              <textarea className="gen-message-edit" value={edited} onChange={e=>setEdited(e.target.value)} />
            )}

            {draft && (
              <div className="gen-actions">
                <button className="btn btn-sm btn-ghost" onClick={generate} disabled={loading}>↺ Regenerate</button>
                <button className="btn btn-sm btn-green" onClick={saveMessage} disabled={saving}>{saving?'Saving…':'Save to History'}</button>
                <button className="btn btn-sm btn-primary" onClick={copy}>Copy Message</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
