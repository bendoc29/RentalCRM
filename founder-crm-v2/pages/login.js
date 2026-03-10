import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login') // login | signup
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setMessage('Check your email to confirm your account, then log in.')
    }
    setLoading(false)
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 24, color: 'var(--ink)', marginBottom: 4 }}>FounderCRM</h1>
          <p style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Property Discovery</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && <div style={{ background: '#fde8e8', color: 'var(--danger)', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 14 }}>{error}</div>}
          {message && <div style={{ background: '#e8ffe8', color: 'var(--accent2)', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 14 }}>{message}</div>}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div style={{ marginTop: 16, textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
          {mode === 'login' ? (
            <>Don't have an account? <span style={{ color: 'var(--ink)', cursor: 'pointer', fontWeight: 500 }} onClick={() => setMode('signup')}>Sign up</span></>
          ) : (
            <>Already have an account? <span style={{ color: 'var(--ink)', cursor: 'pointer', fontWeight: 500 }} onClick={() => setMode('login')}>Sign in</span></>
          )}
        </div>
      </div>
    </div>
  )
}
