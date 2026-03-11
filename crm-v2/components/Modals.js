import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { CATEGORIES } from '../lib/helpers'

export function ConvoModal({ contactId, onClose, onSaved }) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({ type:'outreach', channel:'Email', date:today, message:'', reply:'', notes:'', sentiment:'Neutral', next_step:'' })
  const [loading, setLoading] = useState(false)

  function set(k,v) { setForm(f=>({...f,[k]:v})) }

  async function save() {
    setLoading(true)
    await supabase.from('conversations').insert({ ...form, contact_id: contactId })
    // Auto-advance stage based on type
    const stageMap = { outreach:2, reply:3, call:4, meeting:4 }
    const newStage = stageMap[form.type]
    if (newStage) await supabase.from('contacts').update({ stage: newStage }).eq('id', contactId).lt('stage', newStage)
    setLoading(false)
    onSaved()
  }

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal modal-md">
        <div className="modal-header">
          <div className="modal-title">Log Interaction</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="form-grid form-grid-2">
          <div className="form-group"><label className="form-label">Type</label>
            <select className="form-select" value={form.type} onChange={e=>set('type',e.target.value)}>
              {[['outreach','Outreach Sent'],['reply','Reply Received'],['call','Call / Meeting'],['note','Internal Note'],['followup','Follow-up Sent']].map(([v,l])=><option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Channel</label>
            <select className="form-select" value={form.channel} onChange={e=>set('channel',e.target.value)}>
              {['Email','LinkedIn','Phone','WhatsApp','In Person','Airbnb Message','Other'].map(o=><option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Date</label><input type="date" className="form-input" value={form.date} onChange={e=>set('date',e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Sentiment / Tone</label>
            <select className="form-select" value={form.sentiment} onChange={e=>set('sentiment',e.target.value)}>
              {['Very Positive','Positive','Neutral','Hesitant','Negative'].map(o=><option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="form-group col-span-2"><label className="form-label">Message Sent / Summary</label><textarea className="form-textarea" value={form.message} onChange={e=>set('message',e.target.value)} placeholder="Paste message or summarise the conversation…" /></div>
          <div className="form-group col-span-2"><label className="form-label">Their Reply</label><textarea className="form-textarea" value={form.reply} onChange={e=>set('reply',e.target.value)} placeholder="What did they say? Capture their exact words where possible…" style={{ minHeight:60 }} /></div>
          <div className="form-group col-span-2"><label className="form-label">Notes & Observations</label><textarea className="form-textarea" value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="Key insights, signals, anything worth remembering…" style={{ minHeight:60 }} /></div>
          <div className="form-group col-span-2"><label className="form-label">Next Step</label><input className="form-input" value={form.next_step} onChange={e=>set('next_step',e.target.value)} placeholder="What should happen next with this person?" /></div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={loading}>{loading?'Saving…':'Save Interaction'}</button>
        </div>
      </div>
    </div>
  )
}

export function ProblemModal({ contactId, onClose, onSaved }) {
  const [form, setForm] = useState({ title:'', description:'', category:'Operations', severity:3, urgency:3, frequency:'Occasionally', wtp:'Unknown', workaround:'', quote:'', business_impact:'', product_relevance:'' })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)

  function set(k,v) { setForm(f=>({...f,[k]:v})) }

  async function save() {
    if (!form.title.trim()) { setErr('Title is required'); return }
    setLoading(true)
    await supabase.from('problems').insert({ ...form, severity:parseInt(form.severity), urgency:parseInt(form.urgency), contact_id:contactId||null })
    if (contactId) await supabase.from('contacts').update({ stage:5 }).eq('id',contactId).lt('stage',5)
    setLoading(false)
    onSaved()
  }

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div className="modal-title">Log Problem / Pain Point</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="form-grid form-grid-2">
          <div className="form-group col-span-2"><label className="form-label">Problem Title *</label><input className="form-input" value={form.title} onChange={e=>set('title',e.target.value)} placeholder="e.g. Cleaner scheduling falls apart every weekend" /></div>
          <div className="form-group col-span-2"><label className="form-label">Description</label><textarea className="form-textarea" value={form.description} onChange={e=>set('description',e.target.value)} placeholder="Describe the problem in detail — be specific…" /></div>
          <div className="form-group"><label className="form-label">Category</label>
            <select className="form-select" value={form.category} onChange={e=>set('category',e.target.value)}>
              {CATEGORIES.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Frequency</label>
            <select className="form-select" value={form.frequency} onChange={e=>set('frequency',e.target.value)}>
              {['Rarely','Occasionally','Regularly','Constantly'].map(o=><option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Severity (1–5)</label>
            <select className="form-select" value={form.severity} onChange={e=>set('severity',e.target.value)}>
              {[['1','1 — Minor'],['2','2 — Frustrating'],['3','3 — Significant'],['4','4 — Major blocker'],['5','5 — Business-critical']].map(([v,l])=><option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Urgency (1–5)</label>
            <select className="form-select" value={form.urgency} onChange={e=>set('urgency',e.target.value)}>
              {[['1','1 — Low'],['2','2 — Moderate'],['3','3 — Important'],['4','4 — Urgent'],['5','5 — Critical']].map(([v,l])=><option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Willingness to Pay</label>
            <select className="form-select" value={form.wtp} onChange={e=>set('wtp',e.target.value)}>
              {['None','Low','Medium','High','Very High','Unknown'].map(o=><option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="form-group col-span-2"><label className="form-label">Current Workaround</label><textarea className="form-textarea" value={form.workaround} onChange={e=>set('workaround',e.target.value)} placeholder="How do they currently deal with this?" style={{ minHeight:60 }} /></div>
          <div className="form-group col-span-2"><label className="form-label">Business Impact</label><input className="form-input" value={form.business_impact} onChange={e=>set('business_impact',e.target.value)} placeholder="What does this cost them? (time, money, stress, reviews…)" /></div>
          <div className="form-group col-span-2"><label className="form-label">Their Exact Words (Quote)</label><input className="form-input" value={form.quote} onChange={e=>set('quote',e.target.value)} placeholder="Capture their exact language — invaluable later" /></div>
          <div className="form-group col-span-2"><label className="form-label">Product Relevance Note</label><input className="form-input" value={form.product_relevance} onChange={e=>set('product_relevance',e.target.value)} placeholder="Which future product feature would solve this?" /></div>
        </div>
        {err && <div style={{ background:'#fbe8e8', color:'var(--danger)', padding:'9px 13px', borderRadius:7, fontSize:12.5, marginTop:14 }}>{err}</div>}
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={loading}>{loading?'Saving…':'Save Problem'}</button>
        </div>
      </div>
    </div>
  )
}
