import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [mode, setMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)
  const [err, setErr] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setLoading(true); setErr(null); setMsg(null)
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw })
      if (error) setErr(error.message)
    } else {
      const { error } = await supabase.auth.signUp({ email, password: pw })
      if (error) setErr(error.message)
      else setMsg('Check your email to confirm your account, then sign in.')
    }
    setLoading(false)
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-title">FounderCRM</div>
        <div className="auth-sub">Property Discovery · Pre-Sales Outreach</div>

        <form onSubmit={submit}>
          <div className="form-group" style={{ marginBottom:12 }}>
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>
          <div className="form-group" style={{ marginBottom:20 }}>
            <label className="form-label">Password</label>
            <input className="form-input" type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="••••••••" required />
          </div>

          {err && <div style={{ background:'#fbe8e8', color:'var(--danger)', padding:'9px 13px', borderRadius:7, fontSize:12.5, marginBottom:14 }}>{err}</div>}
          {msg && <div style={{ background:'#e6f4ec', color:'var(--green)', padding:'9px 13px', borderRadius:7, fontSize:12.5, marginBottom:14 }}>{msg}</div>}

          <button type="submit" className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }} disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div style={{ marginTop:16, textAlign:'center', fontSize:12.5, color:'var(--muted)' }}>
          {mode === 'login'
            ? <>No account? <span style={{ color:'var(--ink)', cursor:'pointer', fontWeight:500 }} onClick={() => setMode('signup')}>Sign up</span></>
            : <>Have an account? <span style={{ color:'var(--ink)', cursor:'pointer', fontWeight:500 }} onClick={() => setMode('login')}>Sign in</span></>
          }
        </div>
      </div>
    </div>
  )
}
