import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import { useEffect, useState } from 'react'

const navItems = [
  { href: '/', label: 'Dashboard', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> },
  { href: '/pipeline', label: 'Pipeline', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg> },
  { href: '/contacts', label: 'Contacts', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { href: '/problems', label: 'Problems', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> },
  { href: '/insights', label: 'Insights', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
  { href: '/followups', label: 'Follow-ups', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
]

export default function Layout({ children }) {
  const router = useRouter()
  const [counts, setCounts] = useState({ contacts: 0, problems: 0 })

  useEffect(() => {
    async function load() {
      const { count: contacts } = await supabase.from('contacts').select('*', { count: 'exact', head: true })
      const { count: problems } = await supabase.from('problems').select('*', { count: 'exact', head: true })
      setCounts({ contacts: contacts || 0, problems: problems || 0 })
    }
    load()
  }, [router.pathname])

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <div style={{ display: 'flex' }}>
      <div className="sidebar">
        <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid #2a2825' }}>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 18, color: 'white', letterSpacing: '-0.3px' }}>FounderCRM</h1>
          <p style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: '1.5px', marginTop: 2, fontFamily: 'DM Mono, monospace' }}>Property Discovery</p>
        </div>

        <div style={{ padding: '16px 12px 8px' }}>
          <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: '#666', padding: '0 8px', marginBottom: 6, fontFamily: 'DM Mono, monospace' }}>Navigation</div>
          {navItems.map(item => (
            <Link key={item.href} href={item.href} className={`nav-item ${router.pathname === item.href || (item.href !== '/' && router.pathname.startsWith(item.href)) ? 'active' : ''}`}>
              <span style={{ opacity: 0.8 }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>

        <div style={{ marginTop: 'auto', borderTop: '1px solid #2a2825', padding: 16 }}>
          <div style={{ background: '#1a1916', borderRadius: 8, padding: '10px 12px', marginBottom: 6 }}>
            <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#666', fontFamily: 'DM Mono, monospace' }}>Contacts</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: 'white', fontFamily: 'DM Serif Display, serif' }}>{counts.contacts}</div>
          </div>
          <div style={{ background: '#1a1916', borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
            <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#666', fontFamily: 'DM Mono, monospace' }}>Problems Found</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: 'white', fontFamily: 'DM Serif Display, serif' }}>{counts.problems}</div>
          </div>
          <button onClick={signOut} className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center', borderColor: '#2a2825', color: '#888' }}>
            Sign out
          </button>
        </div>
      </div>

      <div className="main-content">
        {children}
      </div>
    </div>
  )
}
