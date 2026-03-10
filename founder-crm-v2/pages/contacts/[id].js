import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'
import { supabase } from '../../lib/supabase'
import { STAGES, CAT_STYLES, formatDate, SevDots, FlagBadges, calcOppScore } from '../../lib/helpers'
import Link from 'next/link'
import ContactModal from '../../components/ContactModal'

export default function ContactProfile() {
  const router = useRouter()
  const { id } = router.query
  const [contact, setContact] = useState(null)
  const [convos, setConvos] = useState([])
  const [problems, setProblems] = useState([])
  const [tab, setTab] = useState('convos')
  const [showEdit, setShowEdit] = useState(false)
  const [showConvoModal, setShowConvoModal] = useState(false)
  const [showProbModal, setShowProbModal] = useState(false)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => { if (id) load() }, [id, refresh])

  async function load() {
    const [{ data: c }, { data: cv }, { data: p }] = await Promise.all([
      supabase.from('contacts').select('*').eq('id', id).single(),
      supabase.from('conversations').select('*').eq('contact_id', id).order('date', { ascending: false }),
      supabase.from('problems').select('*').eq('contact_id', id).order('severity', { ascending: false }),
    ])
    setContact(c)
    setConvos(cv || [])
    setProblems(p || [])
  }

  async function deleteContact() {
    if (!confirm('Delete this contact and all their data?')) return
    await supabase.from('contacts').delete().eq('id', id)
    router.push('/contacts')
  }

  if (!contact) return <Layout><div style={{ padding:40, color:'var(--muted)' }}>Loading...</div></Layout>

  const score = calcOppScore(contact, problems, convos)
  const today = new Date().toISOString().split('T')[0]
  const overdue = contact.followup_date && contact.followup_date <= today

  return (
    <Layout>
      <Link href="/contacts" style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:12, color:'var(--muted)', textDecoration:'none', marginBottom:20 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
        Back to Contacts
      </Link>

      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h1 style={{ fontFamily:'DM Serif Display,serif', fontSize:28, letterSpacing:'-0.5px' }}>{contact.name}</h1>
          <p style={{ fontSize:13, color:'var(--muted)', marginTop:4 }}>{contact.prop_type} · {contact.location||'No location'} · {contact.portfolio}</p>
          <div style={{ marginTop:10 }}><FlagBadges flags={contact} /></div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowConvoModal(true)}>+ Log Convo</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowProbModal(true)}>+ Log Problem</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowEdit(true)}>Edit</button>
          <button className="btn btn-danger btn-sm" onClick={deleteContact}>Delete</button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'320px 1fr', gap:20 }}>
        {/* LEFT SIDEBAR */}
        <div>
          {/* Contact info */}
          <div className="card" style={{ marginBottom:14 }}>
            <span className="section-label">Contact Info</span>
            {[
              { label:'Email', value:contact.email },
              { label:'Phone', value:contact.phone },
              { label:'Stage', value:<span className={`badge badge-stage-${contact.stage}`}>{STAGES[contact.stage]}</span> },
              { label:'Portfolio', value:contact.portfolio },
              { label:'Found via', value:contact.source },
              { label:'Added', value:formatDate(contact.created_at) },
            ].filter(r=>r.value).map(r => (
              <div key={r.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:12, padding:'5px 0', borderBottom:'1px solid var(--paper2)' }}>
                <span style={{ color:'var(--muted)', fontFamily:'DM Mono,monospace', fontSize:10, textTransform:'uppercase', letterSpacing:'0.8px' }}>{r.label}</span>
                <span style={{ fontWeight:500, fontSize:12 }}>{r.value}</span>
              </div>
            ))}
          </div>

          {/* Opportunity score */}
          <div className="card" style={{ marginBottom:14, textAlign:'center' }}>
            <span className="section-label">Opportunity Score</span>
            <div style={{ fontFamily:'DM Serif Display,serif', fontSize:48, color: score>7?'var(--accent2)':score>4?'var(--gold)':'var(--muted)', lineHeight:1 }}>{score}</div>
            <div style={{ fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'1px', fontFamily:'DM Mono,monospace', marginTop:4 }}>out of 10</div>
            <div style={{ background:'var(--paper2)', borderRadius:4, height:6, margin:'12px 0 6px' }}>
              <div style={{ height:'100%', borderRadius:4, background:`linear-gradient(90deg,#8bc34a,#ffc107,var(--accent))`, width:`${score*10}%` }} />
            </div>
            <div style={{ fontSize:11, color:'var(--muted)' }}>Based on problems, severity, engagement</div>
          </div>

          {/* Follow-up */}
          <div className="card" style={{ marginBottom:14 }}>
            <span className="section-label">Follow-up</span>
            {contact.followup_date ? (
              <div style={{ background: overdue?'#fff8e1':'transparent', border: overdue?'1px solid #f0c040':'none', borderRadius:8, padding: overdue?'10px 12px':'0' }}>
                <div style={{ fontSize:13, fontWeight:600, color: overdue?'var(--danger)':'var(--ink)' }}>
                  {overdue?'⚠ Overdue: ':''}{formatDate(contact.followup_date)}
                </div>
                {contact.followup_reason && <div style={{ fontSize:12, color:'var(--muted)', marginTop:3 }}>{contact.followup_reason}</div>}
              </div>
            ) : <div style={{ fontSize:12, color:'var(--muted)' }}>No follow-up scheduled</div>}
            <button className="btn btn-sm btn-ghost" style={{ marginTop:10, width:'100%', justifyContent:'center' }} onClick={() => setShowEdit(true)}>Set Follow-up</button>
          </div>

          {/* Notes */}
          {contact.notes && (
            <div className="card">
              <span className="section-label">Notes</span>
              <div style={{ fontSize:13, lineHeight:1.6 }} dangerouslySetInnerHTML={{ __html: contact.notes.replace(/\n/g,'<br>') }} />
            </div>
          )}
        </div>

        {/* RIGHT CONTENT */}
        <div>
          <div style={{ display:'flex', gap:0, borderBottom:'1.5px solid var(--border)', marginBottom:20 }}>
            {[['convos',`Conversations (${convos.length})`],['problems',`Problems (${problems.length})`]].map(([k,label]) => (
              <div key={k} onClick={() => setTab(k)} style={{ padding:'10px 18px', fontSize:13, fontWeight:500, cursor:'pointer', color: tab===k?'var(--ink)':'var(--muted)', borderBottom: tab===k?'2px solid var(--ink)':'2px solid transparent', marginBottom:'-1.5px', transition:'all 0.15s' }}>{label}</div>
            ))}
          </div>

          {tab === 'convos' && (
            <div>
              {!convos.length ? (
                <div className="empty-state">
                  <div style={{ fontSize:32, marginBottom:10 }}>💬</div>
                  <div style={{ fontSize:15, fontWeight:600, color:'var(--ink)', marginBottom:6 }}>No conversations yet</div>
                  <div style={{ fontSize:13 }}>Log your first message or call with this owner</div>
                </div>
              ) : convos.map(cv => (
                <div key={cv.id} style={{ background:'var(--white)', border:'1.5px solid var(--border)', borderRadius:10, padding:16, marginBottom:10 }}>
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:8 }}>
                    <span style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:1, color: cv.type==='outreach'?'var(--accent3)':cv.type==='reply'?'var(--accent2)':'var(--gold)' }}>{cv.type}</span>
                    <span style={{ fontSize:10, color:'var(--muted)', fontFamily:'DM Mono,monospace' }}>{formatDate(cv.date)}</span>
                  </div>
                  {cv.message && <><div style={{ fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.8px', fontFamily:'DM Mono,monospace', marginBottom:3 }}>Message</div><div style={{ fontSize:13, lineHeight:1.6 }} dangerouslySetInnerHTML={{ __html: cv.message.replace(/\n/g,'<br>') }} /></>}
                  {cv.reply && <><div style={{ fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.8px', fontFamily:'DM Mono,monospace', marginTop:10, marginBottom:3 }}>Reply</div><div style={{ fontSize:13, lineHeight:1.6, color:'var(--accent2)' }} dangerouslySetInnerHTML={{ __html: cv.reply.replace(/\n/g,'<br>') }} /></>}
                  {cv.notes && <><div style={{ fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.8px', fontFamily:'DM Mono,monospace', marginTop:10, marginBottom:3 }}>Notes</div><div style={{ fontSize:13, lineHeight:1.6, color:'var(--muted)' }} dangerouslySetInnerHTML={{ __html: cv.notes.replace(/\n/g,'<br>') }} /></>}
                </div>
              ))}
              <button className="btn btn-ghost" style={{ marginTop:10 }} onClick={() => setShowConvoModal(true)}>+ Log Conversation</button>
            </div>
          )}

          {tab === 'problems' && (
            <div>
              {!problems.length ? (
                <div className="empty-state">
                  <div style={{ fontSize:32, marginBottom:10 }}>⚠️</div>
                  <div style={{ fontSize:15, fontWeight:600, color:'var(--ink)', marginBottom:6 }}>No problems logged</div>
                  <div style={{ fontSize:13 }}>Add problems you've uncovered from conversations</div>
                </div>
              ) : problems.map(p => {
                const catStyle = CAT_STYLES[p.category] || CAT_STYLES['Other']
                return (
                  <div key={p.id} style={{ background:'var(--white)', border:'1.5px solid var(--border)', borderRadius:10, padding:16, marginBottom:10 }}>
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
                      <div>
                        <div style={{ fontSize:14, fontWeight:600 }}>{p.title}</div>
                        <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:1, color:'var(--muted)', marginTop:2, fontFamily:'DM Mono,monospace' }}>{p.category}</div>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                        <SevDots severity={p.severity} />
                        <span style={{ padding:'2px 8px', borderRadius:4, fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.8px', fontFamily:'DM Mono,monospace', background:catStyle.bg, color:catStyle.color }}>{p.category}</span>
                      </div>
                    </div>
                    {p.description && <div style={{ fontSize:13, color:'var(--muted)', marginTop:8, lineHeight:1.5 }}>{p.description}</div>}
                    {p.quote && <div style={{ fontSize:12, color:'var(--accent3)', fontStyle:'italic', marginTop:8, padding:8, background:'var(--paper)', borderRadius:6, borderLeft:'3px solid var(--accent3)' }}>"{p.quote}"</div>}
                    <div style={{ display:'flex', gap:16, marginTop:10, flexWrap:'wrap' }}>
                      {[['Severity', `${p.severity}/5`], ['Frequency', p.frequency], ['WTP', p.wtp]].map(([l,v]) => (
                        <div key={l} style={{ fontSize:11, color:'var(--muted)' }}><strong style={{ color:'var(--ink)' }}>{l}:</strong> {v}</div>
                      ))}
                      {p.workaround && <div style={{ fontSize:11, color:'var(--muted)', flex:'1 0 100%' }}><strong style={{ color:'var(--ink)' }}>Workaround:</strong> {p.workaround}</div>}
                    </div>
                  </div>
                )
              })}
              <button className="btn btn-ghost" style={{ marginTop:10 }} onClick={() => setShowProbModal(true)}>+ Log Problem</button>
            </div>
          )}
        </div>
      </div>

      {showEdit && <ContactModal existing={contact} onClose={() => setShowEdit(false)} onSaved={() => { setShowEdit(false); setRefresh(r=>r+1) }} />}
      {showConvoModal && <ConvoModal contactId={id} onClose={() => setShowConvoModal(false)} onSaved={() => { setShowConvoModal(false); setRefresh(r=>r+1) }} />}
      {showProbModal && <ProblemModal contactId={id} onClose={() => setShowProbModal(false)} onSaved={() => { setShowProbModal(false); setRefresh(r=>r+1) }} />}
    </Layout>
  )
}

function ConvoModal({ contactId, onClose, onSaved }) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({ type:'outreach', date:today, message:'', reply:'', notes:'' })
  const [loading, setLoading] = useState(false)
  function set(k,v) { setForm(f=>({...f,[k]:v})) }

  async function save() {
    setLoading(true)
    await supabase.from('conversations').insert({ ...form, contact_id: contactId })
    // Auto-advance stage
    if (form.type === 'outreach') await supabase.from('contacts').update({ stage: 1 }).eq('id', contactId).lt('stage', 1)
    if (form.type === 'reply' || form.type === 'call') await supabase.from('contacts').update({ stage: 2 }).eq('id', contactId).lt('stage', 2)
    setLoading(false)
    onSaved()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
          <h2 style={{ fontFamily:'DM Serif Display,serif', fontSize:20 }}>Log Conversation</h2>
          <button onClick={onClose} style={{ background:'var(--paper2)', border:'none', borderRadius:'50%', width:30, height:30, cursor:'pointer', fontSize:16, color:'var(--muted)' }}>✕</button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          <div><label className="form-label">Type</label>
            <select className="form-select" value={form.type} onChange={e=>set('type',e.target.value)}>
              {[['outreach','Outreach Sent'],['reply','Reply Received'],['note','Note'],['call','Call / Meeting']].map(([v,l])=><option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div><label className="form-label">Date</label><input type="date" className="form-input" value={form.date} onChange={e=>set('date',e.target.value)} /></div>
          <div style={{ gridColumn:'1/-1' }}><label className="form-label">Message / Summary</label><textarea className="form-textarea" value={form.message} onChange={e=>set('message',e.target.value)} placeholder="Paste outreach or summarise the call..." /></div>
          <div style={{ gridColumn:'1/-1' }}><label className="form-label">Their Reply</label><textarea className="form-textarea" value={form.reply} onChange={e=>set('reply',e.target.value)} placeholder="What did they say?" style={{ minHeight:60 }} /></div>
          <div style={{ gridColumn:'1/-1' }}><label className="form-label">Notes</label><textarea className="form-textarea" value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="Key insights from this interaction..." style={{ minHeight:60 }} /></div>
        </div>
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20, paddingTop:16, borderTop:'1.5px solid var(--paper2)' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={loading}>{loading?'Saving...':'Save'}</button>
        </div>
      </div>
    </div>
  )
}

function ProblemModal({ contactId, onClose, onSaved }) {
  const [form, setForm] = useState({ title:'', description:'', category:'Operations', severity:3, frequency:'Occasionally', wtp:'Unknown', workaround:'', quote:'' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  function set(k,v) { setForm(f=>({...f,[k]:v})) }

  async function save() {
    if (!form.title.trim()) { setError('Title required'); return }
    setLoading(true)
    await supabase.from('problems').insert({ ...form, severity:parseInt(form.severity), contact_id: contactId })
    await supabase.from('contacts').update({ stage: 3 }).eq('id', contactId).lt('stage', 3)
    setLoading(false)
    onSaved()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{ width:700 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
          <h2 style={{ fontFamily:'DM Serif Display,serif', fontSize:20 }}>Log Problem</h2>
          <button onClick={onClose} style={{ background:'var(--paper2)', border:'none', borderRadius:'50%', width:30, height:30, cursor:'pointer', fontSize:16, color:'var(--muted)' }}>✕</button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          <div style={{ gridColumn:'1/-1' }}><label className="form-label">Problem Title *</label><input className="form-input" value={form.title} onChange={e=>set('title',e.target.value)} placeholder="e.g. Cleaning coordination chaos" /></div>
          <div style={{ gridColumn:'1/-1' }}><label className="form-label">Description</label><textarea className="form-textarea" value={form.description} onChange={e=>set('description',e.target.value)} placeholder="Describe the problem in detail..." /></div>
          <div><label className="form-label">Category</label>
            <select className="form-select" value={form.category} onChange={e=>set('category',e.target.value)}>
              {['Operations','Finance','Guest Experience','Maintenance','Technology','Legal / Compliance','Other'].map(o=><option key={o}>{o}</option>)}
            </select>
          </div>
          <div><label className="form-label">Severity (1–5)</label>
            <select className="form-select" value={form.severity} onChange={e=>set('severity',e.target.value)}>
              {[['1','1 — Minor'],['2','2 — Frustration'],['3','3 — Significant'],['4','4 — Major blocker'],['5','5 — Business-critical']].map(([v,l])=><option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div><label className="form-label">Frequency</label>
            <select className="form-select" value={form.frequency} onChange={e=>set('frequency',e.target.value)}>
              {['Rarely','Occasionally','Regularly','Constantly'].map(o=><option key={o}>{o}</option>)}
            </select>
          </div>
          <div><label className="form-label">Willingness to Pay</label>
            <select className="form-select" value={form.wtp} onChange={e=>set('wtp',e.target.value)}>
              {['None','Low','Medium','High','Very High','Unknown'].map(o=><option key={o}>{o}</option>)}
            </select>
          </div>
          <div style={{ gridColumn:'1/-1' }}><label className="form-label">Current Workaround</label><textarea className="form-textarea" value={form.workaround} onChange={e=>set('workaround',e.target.value)} placeholder="How do they handle this today?" style={{ minHeight:60 }} /></div>
          <div style={{ gridColumn:'1/-1' }}><label className="form-label">Owner Quote</label><input className="form-input" value={form.quote} onChange={e=>set('quote',e.target.value)} placeholder="Their exact words..." /></div>
        </div>
        {error && <div style={{ background:'#fde8e8', color:'var(--danger)', padding:'10px 14px', borderRadius:8, fontSize:13, marginTop:14 }}>{error}</div>}
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20, paddingTop:16, borderTop:'1.5px solid var(--paper2)' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={loading}>{loading?'Saving...':'Save Problem'}</button>
        </div>
      </div>
    </div>
  )
}
