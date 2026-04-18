import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Spinner } from '../lib/helpers'

const PLATFORMS = ['Instagram DM', 'LinkedIn', 'Facebook Messenger', 'WhatsApp', 'Email', 'SMS', 'Other']

async function resizeImageToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = (e) => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        const MAX = 1568
        const scale = Math.min(1, MAX / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
        resolve({ data: dataUrl.split(',')[1], mediaType: 'image/jpeg', thumbnail: dataUrl })
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

function fuzzyMatchContacts(contacts, otherParty) {
  if (!otherParty?.name && !otherParty?.handle) return null
  const name = (otherParty.name || '').toLowerCase().trim()
  const handle = (otherParty.handle || '').replace('@', '').toLowerCase().trim()

  // High-confidence: exact name match or handle appears in linkedin field
  const exact = contacts.find(c =>
    c.name.toLowerCase() === name ||
    (handle && c.linkedin && c.linkedin.toLowerCase().includes(handle))
  )
  if (exact) return { contact: exact, confidence: 'high' }

  // Low-confidence: name contains first name or vice-versa
  const firstName = name.split(' ')[0]
  const partial = firstName.length > 2 && contacts.find(c =>
    c.name.toLowerCase().includes(firstName) || firstName.includes(c.name.toLowerCase().split(' ')[0])
  )
  if (partial) return { contact: partial, confidence: 'low' }

  return null
}

export function ConversationImportModal({ contactId = null, onClose, onSaved }) {
  const [step, setStep] = useState('input') // input | processing | preview
  const [pastedText, setPastedText] = useState('')
  const [images, setImages] = useState([]) // [{file, thumbnail, data, mediaType}]
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  const [extracted, setExtracted] = useState(null)
  const [error, setError] = useState(null)

  // Contact state
  const [allContacts, setAllContacts] = useState([])
  const [selectedContactId, setSelectedContactId] = useState(contactId)
  const [contactSearch, setContactSearch] = useState('')
  const [showContactDrop, setShowContactDrop] = useState(false)
  const [matchInfo, setMatchInfo] = useState(null)

  // Editable preview fields
  const [editPlatform, setEditPlatform] = useState('')
  const [editSummary, setEditSummary] = useState('')
  const [editInsights, setEditInsights] = useState([])
  const [editNextAction, setEditNextAction] = useState('')
  const [editMessages, setEditMessages] = useState([])
  const [markActive, setMarkActive] = useState(true)

  // Create-new-contact inline state
  const [showCreateContact, setShowCreateContact] = useState(false)
  const [newContactName, setNewContactName] = useState('')
  const [newContactEmail, setNewContactEmail] = useState('')
  const [creatingContact, setCreatingContact] = useState(false)

  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('contacts').select('id,name,email,linkedin').order('name').then(({ data }) => {
      setAllContacts(data || [])
    })
  }, [])

  // ── Image handling ──────────────────────────────────────────────────────────

  async function handleFiles(fileList) {
    const files = Array.from(fileList).filter(f => f.type.startsWith('image/'))
    if (!files.length) return
    const unsupported = Array.from(fileList).filter(f => !f.type.startsWith('image/'))
    if (unsupported.length) setError(`Unsupported file type(s): ${unsupported.map(f=>f.name).join(', ')}. Use PNG, JPG, or WEBP.`)
    const processed = await Promise.all(files.map(resizeImageToBase64))
    setImages(prev => [...prev, ...processed])
  }

  function removeImage(i) {
    setImages(prev => prev.filter((_, idx) => idx !== i))
  }

  // ── Process ────────────────────────────────────────────────────────────────

  async function handleProcess() {
    if (!pastedText.trim() && !images.length) {
      setError('Paste a conversation or upload at least one screenshot.')
      return
    }
    setError(null)
    setStep('processing')

    try {
      const res = await fetch('/api/parse-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: pastedText.trim() || null,
          images: images.map(img => ({ data: img.data, mediaType: img.mediaType })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Parsing failed')

      setExtracted(data)
      setEditPlatform(data.platform || 'Other')
      setEditSummary(data.summary || '')
      setEditInsights(data.insights || [])
      setEditNextAction(data.suggestedNextAction || '')
      setEditMessages(data.messages || [])

      // Auto-match contact if none pre-selected
      if (!selectedContactId) {
        const match = fuzzyMatchContacts(allContacts, data.otherParty)
        if (match) {
          setMatchInfo(match)
          setSelectedContactId(match.contact.id)
          setContactSearch(match.contact.name)
        } else if (data.otherParty?.name) {
          setNewContactName(data.otherParty.name)
        }
      } else {
        const pre = allContacts.find(c => c.id === selectedContactId)
        if (pre) setContactSearch(pre.name)
      }

      setStep('preview')
    } catch (err) {
      setError(err.message)
      setStep('input')
    }
  }

  // ── Create contact inline ──────────────────────────────────────────────────

  async function handleCreateContact() {
    if (!newContactName.trim()) return
    setCreatingContact(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: newC, error: e } = await supabase.from('contacts').insert({
      name: newContactName.trim(),
      email: newContactEmail.trim() || null,
      user_id: user.id,
      prop_type: 'Airbnb Host',
      portfolio: '1 property',
      stage: 0,
      relationship_warmth: 'Cold',
      opp_score: 0,
      owner: 'Kearns',
    }).select('id,name,email,linkedin').single()
    setCreatingContact(false)
    if (e) { setError(e.message); return }
    setAllContacts(prev => [...prev, newC])
    setSelectedContactId(newC.id)
    setContactSearch(newC.name)
    setShowCreateContact(false)
    setMatchInfo({ contact: newC, confidence: 'high' })
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!selectedContactId) { setError('Select or create a contact first.'); return }
    setSaving(true); setError(null)

    // Build message body (full thread)
    const threadLines = []
    if (editMessages.length) {
      const otherName = extracted?.otherParty?.name || 'Them'
      editMessages.forEach(m => {
        const sender = m.sender === 'jack' ? 'Jack' : otherName
        threadLines.push(`${m.timestamp ? `[${m.timestamp}] ` : ''}${sender}: ${m.content}`)
      })
    }

    const msgBody = [
      `Platform: ${editPlatform}`,
      extracted?.otherParty?.name ? `With: ${extracted.otherParty.name}${extracted.otherParty.handle ? ` (${extracted.otherParty.handle})` : ''}` : null,
      '',
      ...threadLines,
    ].filter(l => l !== null).join('\n')

    const notesBody = [
      'SUMMARY:',
      editSummary,
      '',
      'KEY INSIGHTS:',
      ...editInsights.map(i => `• ${i}`),
    ].join('\n')

    const { data: newConvo, error: insertErr } = await supabase
      .from('conversations')
      .insert({
        contact_id: selectedContactId,
        type: 'imported',
        channel: editPlatform,
        date: new Date().toISOString().split('T')[0],
        message: msgBody,
        notes: notesBody,
        next_step: editNextAction,
        sentiment: 'Neutral',
      })
      .select()
      .single()

    if (insertErr) { setError(insertErr.message); setSaving(false); return }

    if (markActive) {
      await supabase.from('contacts').update({ conversation_active: true }).eq('id', selectedContactId)
    }

    // Upload screenshots to Supabase Storage (non-blocking — silently skip if bucket missing)
    if (images.length && newConvo) {
      for (let i = 0; i < images.length; i++) {
        try {
          const blob = await fetch(`data:image/jpeg;base64,${images[i].data}`).then(r => r.blob())
          await supabase.storage
            .from('conversation-imports')
            .upload(`${selectedContactId}/${newConvo.id}/${i + 1}-${Date.now()}.jpg`, blob, {
              contentType: 'image/jpeg',
              upsert: false,
            })
        } catch {}
      }
    }

    setSaving(false)
    onSaved(newConvo)
  }

  // ── Filtered contacts for dropdown ─────────────────────────────────────────

  const filteredContacts = contactSearch.trim()
    ? allContacts.filter(c =>
        c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
        (c.email && c.email.toLowerCase().includes(contactSearch.toLowerCase()))
      )
    : allContacts.slice(0, 8)

  const selectedContact = allContacts.find(c => c.id === selectedContactId)

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" style={{ maxHeight:'92vh', display:'flex', flexDirection:'column' }}>

        {/* Header */}
        <div className="modal-header" style={{ flexShrink:0 }}>
          <div className="modal-title">
            {step === 'input' && 'Import Conversation'}
            {step === 'processing' && 'Parsing conversation…'}
            {step === 'preview' && 'Review & Save'}
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div style={{ overflowY:'auto', flex:1, paddingRight:2 }}>

          {/* ── INPUT STEP ── */}
          {step === 'input' && (
            <div>
              {/* Paste text */}
              <div className="form-group" style={{ marginBottom:16 }}>
                <label className="form-label">Paste conversation text</label>
                <textarea
                  className="form-textarea"
                  style={{ minHeight:140, fontFamily:'Geist Mono,monospace', fontSize:12 }}
                  placeholder="Paste the full conversation here — Instagram, LinkedIn, Facebook, anywhere."
                  value={pastedText}
                  onChange={e => setPastedText(e.target.value)}
                />
              </div>

              {/* Divider */}
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
                <div style={{ flex:1, height:1, background:'var(--border)' }} />
                <span style={{ fontSize:11, color:'var(--muted)', fontFamily:'Geist Mono,monospace' }}>OR</span>
                <div style={{ flex:1, height:1, background:'var(--border)' }} />
              </div>

              {/* Image upload */}
              <div className="form-group" style={{ marginBottom:16 }}>
                <label className="form-label">Upload screenshots</label>
                <div
                  style={{
                    border:`2px dashed ${dragOver ? 'var(--ink)' : 'var(--border)'}`,
                    borderRadius:10, padding:'20px 16px', textAlign:'center',
                    background: dragOver ? 'var(--paper2)' : 'var(--paper)',
                    cursor:'pointer', transition:'all .15s',
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
                >
                  <div style={{ fontSize:22, marginBottom:6 }}>📷</div>
                  <div style={{ fontSize:13, fontWeight:500, marginBottom:3 }}>Drop screenshots here or click to upload</div>
                  <div style={{ fontSize:11, color:'var(--muted)' }}>PNG, JPG, WEBP — multiple files supported</div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                    style={{ display:'none' }}
                    onChange={e => handleFiles(e.target.files)}
                  />
                </div>

                {/* Thumbnails */}
                {images.length > 0 && (
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:10 }}>
                    {images.map((img, i) => (
                      <div key={i} style={{ position:'relative', width:72, height:72 }}>
                        <img src={img.thumbnail} alt={`Screenshot ${i+1}`} style={{ width:72, height:72, objectFit:'cover', borderRadius:7, border:'1.5px solid var(--border)' }} />
                        <button
                          onClick={() => removeImage(i)}
                          style={{ position:'absolute', top:-6, right:-6, width:18, height:18, borderRadius:'50%', background:'var(--danger)', color:'#fff', border:'none', cursor:'pointer', fontSize:11, display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1 }}
                        >✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {error && <div style={{ background:'#fbe8e8', color:'var(--danger)', padding:'9px 13px', borderRadius:7, fontSize:12.5, marginBottom:14 }}>{error}</div>}
            </div>
          )}

          {/* ── PROCESSING STEP ── */}
          {step === 'processing' && (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'60px 20px', gap:14 }}>
              <Spinner />
              <div style={{ fontSize:13, color:'var(--muted)' }}>Claude is reading the conversation…</div>
            </div>
          )}

          {/* ── PREVIEW STEP ── */}
          {step === 'preview' && extracted && (
            <div>
              {/* Contact picker */}
              <div className="form-group" style={{ marginBottom:16, position:'relative' }}>
                <label className="form-label">Contact</label>
                {matchInfo && (
                  <div style={{ fontSize:11, color: matchInfo.confidence === 'high' ? 'var(--green)' : 'var(--gold)', marginBottom:5 }}>
                    {matchInfo.confidence === 'high' ? '✓ Matched to' : '~ Possible match:'} {matchInfo.contact.name}
                    <button onClick={() => { setSelectedContactId(null); setContactSearch(''); setMatchInfo(null) }} style={{ marginLeft:8, background:'none', border:'none', color:'var(--muted)', cursor:'pointer', fontSize:11 }}>Change</button>
                  </div>
                )}
                <div style={{ position:'relative' }}>
                  <input
                    className="form-input"
                    placeholder="Search contacts by name…"
                    value={contactSearch}
                    onChange={e => { setContactSearch(e.target.value); setSelectedContactId(null); setShowContactDrop(true) }}
                    onFocus={() => setShowContactDrop(true)}
                    onBlur={() => setTimeout(() => setShowContactDrop(false), 150)}
                  />
                  {showContactDrop && (
                    <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'var(--white)', border:'1.5px solid var(--border)', borderRadius:8, zIndex:10, maxHeight:200, overflowY:'auto', boxShadow:'0 4px 16px rgba(0,0,0,.1)' }}>
                      {filteredContacts.map(c => (
                        <div
                          key={c.id}
                          style={{ padding:'8px 12px', cursor:'pointer', fontSize:13, borderBottom:'1px solid var(--paper2)' }}
                          onMouseDown={() => { setSelectedContactId(c.id); setContactSearch(c.name); setMatchInfo({ contact:c, confidence:'high' }); setShowContactDrop(false); setShowCreateContact(false) }}
                        >
                          <div style={{ fontWeight:500 }}>{c.name}</div>
                          {c.email && <div style={{ fontSize:11, color:'var(--muted)' }}>{c.email}</div>}
                        </div>
                      ))}
                      <div
                        style={{ padding:'8px 12px', cursor:'pointer', fontSize:12, color:'var(--blue)', fontWeight:500 }}
                        onMouseDown={() => { setShowContactDrop(false); setShowCreateContact(true) }}
                      >
                        + Create new contact
                      </div>
                    </div>
                  )}
                </div>

                {/* Create contact inline form */}
                {showCreateContact && (
                  <div style={{ marginTop:10, padding:'12px 14px', background:'var(--paper2)', borderRadius:8, border:'1.5px solid var(--border)' }}>
                    <div style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'.8px', color:'var(--muted)', fontFamily:'Geist Mono,monospace', marginBottom:8 }}>New contact</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
                      <input className="form-input" placeholder="Full name *" value={newContactName} onChange={e => setNewContactName(e.target.value)} style={{ fontSize:12 }} />
                      <input className="form-input" placeholder="Email (optional)" value={newContactEmail} onChange={e => setNewContactEmail(e.target.value)} style={{ fontSize:12 }} />
                    </div>
                    <div style={{ display:'flex', gap:6 }}>
                      <button className="btn btn-primary btn-sm" onClick={handleCreateContact} disabled={creatingContact || !newContactName.trim()}>
                        {creatingContact ? <><Spinner /> Creating…</> : 'Create & link'}
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setShowCreateContact(false)}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Platform */}
              <div className="form-group" style={{ marginBottom:16 }}>
                <label className="form-label">Platform</label>
                <select className="form-select" value={editPlatform} onChange={e => setEditPlatform(e.target.value)}>
                  {PLATFORMS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>

              {/* Summary */}
              <div className="form-group" style={{ marginBottom:16 }}>
                <label className="form-label">Summary</label>
                <textarea className="form-textarea" style={{ minHeight:60 }} value={editSummary} onChange={e => setEditSummary(e.target.value)} />
              </div>

              {/* Chat thread */}
              {editMessages.length > 0 && (
                <div style={{ marginBottom:16 }}>
                  <div className="sec-label" style={{ marginBottom:8 }}>Conversation thread</div>
                  <div style={{ background:'var(--paper)', border:'1.5px solid var(--border)', borderRadius:10, padding:'12px 14px', maxHeight:260, overflowY:'auto', display:'flex', flexDirection:'column', gap:8 }}>
                    {editMessages.map((m, i) => {
                      const isJack = m.sender === 'jack'
                      return (
                        <div key={i} style={{ display:'flex', justifyContent: isJack ? 'flex-end' : 'flex-start' }}>
                          <div style={{
                            maxWidth:'75%', padding:'7px 11px', borderRadius:12,
                            background: isJack ? 'var(--ink)' : 'var(--white)',
                            color: isJack ? '#fff' : 'var(--ink)',
                            border: isJack ? 'none' : '1.5px solid var(--border)',
                            fontSize:12.5, lineHeight:1.5,
                          }}>
                            {m.timestamp && <div style={{ fontSize:9.5, opacity:.6, marginBottom:3, fontFamily:'Geist Mono,monospace' }}>{m.timestamp}</div>}
                            {m.content}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Insights */}
              <div style={{ marginBottom:16 }}>
                <div className="sec-label" style={{ marginBottom:8 }}>Key insights</div>
                {editInsights.map((ins, i) => (
                  <div key={i} style={{ display:'flex', gap:6, alignItems:'flex-start', marginBottom:6 }}>
                    <span style={{ color:'var(--muted)', marginTop:7, flexShrink:0 }}>•</span>
                    <input
                      className="form-input"
                      style={{ fontSize:12 }}
                      value={ins}
                      onChange={e => setEditInsights(prev => prev.map((x, idx) => idx === i ? e.target.value : x))}
                    />
                    <button
                      onClick={() => setEditInsights(prev => prev.filter((_, idx) => idx !== i))}
                      style={{ background:'none', border:'none', color:'var(--muted)', cursor:'pointer', fontSize:16, padding:'4px', flexShrink:0 }}
                    >✕</button>
                  </div>
                ))}
                <button className="btn btn-ghost btn-xs" style={{ marginTop:4 }} onClick={() => setEditInsights(prev => [...prev, ''])}>+ Add insight</button>
              </div>

              {/* Next action */}
              <div className="form-group" style={{ marginBottom:16 }}>
                <label className="form-label">Suggested next action</label>
                <input className="form-input" value={editNextAction} onChange={e => setEditNextAction(e.target.value)} placeholder="e.g. Follow up Thursday with a demo offer" />
              </div>

              {/* Mark active */}
              <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13, marginBottom:6 }}>
                <input type="checkbox" checked={markActive} onChange={e => setMarkActive(e.target.checked)} style={{ width:15, height:15 }} />
                Mark conversation as Active
                <span style={{ fontSize:11, color:'var(--muted)' }}>(sets the green Active badge)</span>
              </label>

              {error && <div style={{ background:'#fbe8e8', color:'var(--danger)', padding:'9px 13px', borderRadius:7, fontSize:12.5, marginTop:10 }}>{error}</div>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ flexShrink:0 }}>
          {step === 'input' && (
            <>
              <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={handleProcess} disabled={!pastedText.trim() && !images.length}>
                Process →
              </button>
            </>
          )}
          {step === 'processing' && (
            <button className="btn btn-ghost" onClick={() => { setStep('input'); setError(null) }}>Cancel</button>
          )}
          {step === 'preview' && (
            <>
              <button className="btn btn-ghost" onClick={() => { setStep('input'); setError(null) }}>← Back</button>
              <button className="btn btn-ghost" onClick={onClose}>Discard</button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving || !selectedContactId}
              >
                {saving ? <><Spinner /> Saving…</> : `Save to ${selectedContact?.name || 'Contact'}`}
              </button>
            </>
          )}
          {step === 'input' && error && (
            <button className="btn btn-ghost" onClick={() => { setError(null); handleProcess() }}>Retry</button>
          )}
        </div>
      </div>
    </div>
  )
}
