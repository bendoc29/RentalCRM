import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { STAGES, WARMTH, FUTURE_FIT, FOLLOWUP_PRIORITY } from '../lib/helpers'

const EMPTY = {
  name:'', business_name:'', role:'', email:'', phone:'', linkedin:'',
  prop_type:'Airbnb Host', portfolio:'1 property', location:'', source:'', outreach_channel:'Email',
  notes:'', followup_date:'', followup_reason:'', followup_priority:'Medium',
  stage:0, relationship_warmth:'Cold', future_fit:'Research Only',
  flag_beta:false, flag_interested:false, flag_followup:false, flag_future_customer:false,
  opp_score:0, wtp_estimate:'Unknown', re_engagement_angle:'', owner:'Kearns'
}

const FLAGS = [
  { key:'flag_beta', label:'🔬 Beta Candidate', cls:'flag-on-beta' },
  { key:'flag_interested', label:'💡 Interested in Solution', cls:'flag-on-interested' },
  { key:'flag_followup', label:'🔔 Follow-up Required', cls:'flag-on-followup' },
  { key:'flag_future_customer', label:'💰 Future Customer', cls:'flag-on-customer' },
]

export default function ContactModal({ existing, onClose, onSaved }) {
  const [form, setForm] = useState(existing ? { ...EMPTY, ...existing } : { ...EMPTY })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)
  const [tab, setTab] = useState('identity')

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }
  function toggleFlag(k) { setForm(f => ({ ...f, [k]: !f[k] })) }

  async function save() {
    if (!form.name.trim()) { setErr('Name is required'); return }
    setLoading(true); setErr(null)
    const { data: { user } } = await supabase.auth.getUser()
    const { user_id: _uid, id: _id, created_at: _ca, updated_at: _ua, ...updatePayload } = { ...form, user_id: user.id }
    const payload = { ...form, user_id: user.id }
    const { error } = existing
      ? await supabase.from('contacts').update(updatePayload).eq('id', existing.id)
      : await supabase.from('contacts').insert(payload)
    setLoading(false)
    if (error) { setErr(error.message); return }
    onSaved()
  }

  const tabs = [
    { id:'identity', label:'Identity' },
    { id:'outreach', label:'Outreach' },
    { id:'future', label:'Future Fit' },
  ]

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div className="modal-title">{existing ? 'Edit Contact' : 'Add Contact'}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="tabs" style={{ marginBottom:18 }}>
          {tabs.map(t => <div key={t.id} className={`tab ${tab===t.id?'active':''}`} onClick={() => setTab(t.id)}>{t.label}</div>)}
        </div>

        {tab === 'identity' && (
          <div className="form-grid form-grid-2">
            <div className="form-group"><label className="form-label">Full Name *</label><input className="form-input" value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Jane Smith" /></div>
            <div className="form-group"><label className="form-label">Business / Property Name</label><input className="form-input" value={form.business_name||''} onChange={e=>set('business_name',e.target.value)} placeholder="Coastal Stays Ltd" /></div>
            <div className="form-group"><label className="form-label">Role</label><input className="form-input" value={form.role||''} onChange={e=>set('role',e.target.value)} placeholder="Owner / Manager" /></div>
            <div className="form-group"><label className="form-label">Location</label><input className="form-input" value={form.location||''} onChange={e=>set('location',e.target.value)} placeholder="City, Country" /></div>
            <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={form.email||''} onChange={e=>set('email',e.target.value)} placeholder="jane@example.com" /></div>
            <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={form.phone||''} onChange={e=>set('phone',e.target.value)} placeholder="+44 7700 000000" /></div>
            <div className="form-group"><label className="form-label">LinkedIn / Website</label><input className="form-input" value={form.linkedin||''} onChange={e=>set('linkedin',e.target.value)} placeholder="linkedin.com/in/..." /></div>
            <div className="form-group"><label className="form-label">Property / Business Type</label>
              <select className="form-select" value={form.prop_type} onChange={e=>set('prop_type',e.target.value)}>
                {['Airbnb Host','Short-term Rental','Long-term Landlord','Property Manager','Mixed Portfolio','Holiday Let','Co-living','Other'].map(o=><option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Portfolio Size</label>
              <select className="form-select" value={form.portfolio} onChange={e=>set('portfolio',e.target.value)}>
                {['1 property','2–5 properties','6–20 properties','20–50 properties','50+ properties','Unknown'].map(o=><option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="form-group">
  <label className="form-label">Added by</label>
  <div style={{ display:'flex', gap:8 }}>
    {[{label:'BDoc',color:'#1d4ed8',bg:'#dbeafe'},{label:'Kearns',color:'#be185d',bg:'#fce7f3'}].map(o => (
      <button key={o.label} type="button" onClick={() => set('owner', o.label)}
        style={{
          padding:'8px 26px', borderRadius:8,
          border: `2px solid ${o.color}`,
          background: form.owner===o.label ? o.color : o.bg,
          color: form.owner===o.label ? '#fff' : o.color,
          fontWeight:700, cursor:'pointer', fontSize:13,
          opacity: form.owner===o.label ? 1 : 0.45,
          transition:'all 0.15s ease'
        }}>
        {o.label}
      </button>
    ))}
  </div>
</div>
<div className="form-group col-span-2"><label className="form-label">Notes</label><textarea className="form-textarea" value={form.notes||''} onChange={e=>set('notes',e.target.value)} placeholder="Initial observations about this person..." /></div>
          </div>
        )}

        {tab === 'outreach' && (
          <div className="form-grid form-grid-2">
            <div className="form-group"><label className="form-label">Pipeline Stage</label>
              <select className="form-select" value={form.stage} onChange={e=>set('stage',parseInt(e.target.value))}>
                {STAGES.map((s,i)=><option key={i} value={i}>{s}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Relationship Warmth</label>
              <select className="form-select" value={form.relationship_warmth||'Cold'} onChange={e=>set('relationship_warmth',e.target.value)}>
                {WARMTH.map(w=><option key={w}>{w}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Source</label><input className="form-input" value={form.source||''} onChange={e=>set('source',e.target.value)} placeholder="Airbnb, LinkedIn, Referral…" /></div>
            <div className="form-group"><label className="form-label">Outreach Channel</label>
              <select className="form-select" value={form.outreach_channel||'Email'} onChange={e=>set('outreach_channel',e.target.value)}>
                {['Email','LinkedIn','Airbnb Message','Phone','WhatsApp','Twitter / X','Conference','Referral','Other'].map(o=><option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Follow-up Date</label><input className="form-input" type="date" value={form.followup_date||''} onChange={e=>set('followup_date',e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Follow-up Priority</label>
              <select className="form-select" value={form.followup_priority||'Medium'} onChange={e=>set('followup_priority',e.target.value)}>
                {FOLLOWUP_PRIORITY.map(p=><option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="form-group col-span-2"><label className="form-label">Follow-up Reason</label><input className="form-input" value={form.followup_reason||''} onChange={e=>set('followup_reason',e.target.value)} placeholder="Why follow up with this person?" /></div>
            <div className="form-group col-span-2">
              <label className="form-label" style={{ marginBottom:8 }}>Flags</label>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {FLAGS.map(f => (
                  <button key={f.key} type="button" className={`flag-btn ${form[f.key] ? f.cls : ''}`} onClick={() => toggleFlag(f.key)}>{f.label}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'future' && (
          <div className="form-grid form-grid-2">
            <div className="form-group"><label className="form-label">Future Fit</label>
              <select className="form-select" value={form.future_fit||'Research Only'} onChange={e=>set('future_fit',e.target.value)}>
                {FUTURE_FIT.map(f=><option key={f}>{f}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Est. Willingness to Pay</label>
              <select className="form-select" value={form.wtp_estimate||'Unknown'} onChange={e=>set('wtp_estimate',e.target.value)}>
                {['None','Low — <£20/mo','Medium — £20–100/mo','High — £100–500/mo','Very High — £500+/mo','Unknown'].map(o=><option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Opportunity Score (0–10)</label><input className="form-input" type="number" min="0" max="10" step="0.1" value={form.opp_score||0} onChange={e=>set('opp_score',parseFloat(e.target.value)||0)} /></div>
            <div className="form-group col-span-2"><label className="form-label">Recommended Re-engagement Angle</label><textarea className="form-textarea" value={form.re_engagement_angle||''} onChange={e=>set('re_engagement_angle',e.target.value)} placeholder="What angle to use when re-contacting this person later?" style={{ minHeight:60 }} /></div>
          </div>
        )}

        {err && <div style={{ background:'#fbe8e8', color:'var(--danger)', padding:'9px 13px', borderRadius:7, fontSize:12.5, marginTop:14 }}>{err}</div>}

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={loading}>{loading ? 'Saving…' : existing ? 'Update Contact' : 'Save Contact'}</button>
        </div>
      </div>
    </div>
  )
}
