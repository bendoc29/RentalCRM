import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const EMPTY = {
  name:'', email:'', phone:'', prop_type:'Airbnb Host', portfolio:'1 property',
  location:'', stage:0, source:'', notes:'', followup_date:'', followup_reason:'',
  flag_beta:false, flag_interested:false, flag_followup:false, flag_future_customer:false, opp_score:0
}

export default function ContactModal({ onClose, onSaved, existing }) {
  const [form, setForm] = useState(existing ? { ...existing } : { ...EMPTY })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }
  function toggleFlag(k) { setForm(f => ({ ...f, [k]: !f[k] })) }

  async function save() {
    if (!form.name.trim()) { setError('Name is required'); return }
    setLoading(true); setError(null)
    const { data: { user } } = await supabase.auth.getUser()
    const payload = { ...form, user_id: user.id }
    let err
    if (existing) {
      const { error: e } = await supabase.from('contacts').update(payload).eq('id', existing.id)
      err = e
    } else {
      const { error: e } = await supabase.from('contacts').insert(payload)
      err = e
    }
    setLoading(false)
    if (err) { setError(err.message); return }
    onSaved()
  }

  const flags = [
    { key:'flag_beta', label:'🔬 Potential Beta User', cls:'on-beta' },
    { key:'flag_interested', label:'💡 Interested in Solution', cls:'on-interested' },
    { key:'flag_followup', label:'🔔 Follow-up Required', cls:'on-followup' },
    { key:'flag_future_customer', label:'💰 Future Customer', cls:'on-future' },
  ]

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width:700 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
          <h2 style={{ fontFamily:'DM Serif Display,serif', fontSize:20 }}>{existing ? 'Edit Contact' : 'Add Property Owner'}</h2>
          <button onClick={onClose} style={{ background:'var(--paper2)', border:'none', borderRadius:'50%', width:30, height:30, cursor:'pointer', fontSize:16, color:'var(--muted)' }}>✕</button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          {[
            { label:'Full Name *', key:'name', placeholder:'Jane Smith' },
            { label:'Email', key:'email', placeholder:'jane@example.com' },
            { label:'Phone', key:'phone', placeholder:'+1 555 000 0000' },
            { label:'Location', key:'location', placeholder:'City, State' },
            { label:'How Found', key:'source', placeholder:'Airbnb listing, LinkedIn...' },
          ].map(f => (
            <div key={f.key}>
              <label className="form-label">{f.label}</label>
              <input className="form-input" value={form[f.key]} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder} />
            </div>
          ))}

          <div>
            <label className="form-label">Property Type</label>
            <select className="form-select" value={form.prop_type} onChange={e => set('prop_type', e.target.value)}>
              {['Airbnb Host','Short-term Rental','Long-term Landlord','Property Manager','Mixed Portfolio','Other'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Portfolio Size</label>
            <select className="form-select" value={form.portfolio} onChange={e => set('portfolio', e.target.value)}>
              {['1 property','2–5 properties','6–20 properties','20+ properties','Unknown'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Pipeline Stage</label>
            <select className="form-select" value={form.stage} onChange={e => set('stage', parseInt(e.target.value))}>
              {['Property Identified','Outreach Sent','Conversation Started','Problem Identified','Problem Validation','Future Opportunity'].map((s,i) => <option key={i} value={i}>{s}</option>)}
            </select>
          </div>
          {existing && (
            <div>
              <label className="form-label">Opportunity Score (0–10)</label>
              <input type="number" className="form-input" min="0" max="10" value={form.opp_score} onChange={e => set('opp_score', parseFloat(e.target.value)||0)} />
            </div>
          )}
          <div>
            <label className="form-label">Follow-up Date</label>
            <input type="date" className="form-input" value={form.followup_date||''} onChange={e => set('followup_date', e.target.value)} />
          </div>
          <div>
            <label className="form-label">Follow-up Reason</label>
            <input className="form-input" value={form.followup_reason||''} onChange={e => set('followup_reason', e.target.value)} placeholder="Why follow up?" />
          </div>
          <div style={{ gridColumn:'1/-1' }}>
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" value={form.notes||''} onChange={e => set('notes', e.target.value)} placeholder="Initial observations..." />
          </div>
        </div>

        <div style={{ marginTop:16 }}>
          <span className="section-label">Flags</span>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {flags.map(f => (
              <button key={f.key} className={`flag-btn ${form[f.key] ? f.cls : ''}`} onClick={() => toggleFlag(f.key)}>{f.label}</button>
            ))}
          </div>
        </div>

        {error && <div style={{ background:'#fde8e8', color:'var(--danger)', padding:'10px 14px', borderRadius:8, fontSize:13, marginTop:14 }}>{error}</div>}

        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20, paddingTop:16, borderTop:'1.5px solid var(--paper2)' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={loading}>{loading ? 'Saving...' : 'Save Contact'}</button>
        </div>
      </div>
    </div>
  )
}
