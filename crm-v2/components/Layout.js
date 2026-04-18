import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const NAV = [
  { href:'/', label:'Dashboard', icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> },
  { href:'/pipeline', label:'Pipeline', icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg> },
  { href:'/contacts', label:'Contacts', icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { href:'/active', label:'Active Conversations', countKey:'activeConvos', icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
  { href:'/problems', label:'Problem Database', icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> },
  { href:'/insights', label:'Insights', icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
  { href:'/followups', label:'Follow-up Queue', icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
]

export default function Layout({ children }) {
  const router = useRouter()
  const [counts, setCounts] = useState({ contacts:0, problems:0, followups:0, activeConvos:0 })

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().split('T')[0]
      const [{ count:c },{ count:p },{ count:f },{ count:a }] = await Promise.all([
        supabase.from('contacts').select('*',{count:'exact',head:true}),
        supabase.from('problems').select('*',{count:'exact',head:true}),
        supabase.from('contacts').select('*',{count:'exact',head:true}).not('followup_date','is',null).lte('followup_date',today),
        supabase.from('contacts').select('*',{count:'exact',head:true}).eq('conversation_active',true),
      ])
      setCounts({ contacts:c||0, problems:p||0, followups:f||0, activeConvos:a||0 })
    }
    load()
  }, [router.pathname])

  return (
    <div className="layout">
      <nav className="sidebar">
        <div className="sb-logo">
          <div className="sb-logo-title">FounderCRM</div>
          <div className="sb-logo-sub">Pre-Sales Outreach</div>
        </div>

        <div className="sb-section">
          <div className="sb-label">Navigation</div>
          {NAV.map(n => (
            <Link key={n.href} href={n.href}
              className={`nav-link ${router.pathname === n.href || (n.href !== '/' && router.pathname.startsWith(n.href)) ? 'active' : ''}`}>
              {n.icon}{n.label}
              {n.countKey && counts[n.countKey] > 0 && (
                <span style={{ marginLeft:'auto', background:'#2d7a50', color:'#fff', fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:10, fontFamily:'Geist Mono,monospace', lineHeight:1 }}>
                  {counts[n.countKey]}
                </span>
              )}
            </Link>
          ))}
        </div>

        <div className="sb-footer">
          <div className="sb-stat">
            <div className="sb-stat-label">Contacts</div>
            <div className="sb-stat-val">{counts.contacts}</div>
          </div>
          <div className="sb-stat">
            <div className="sb-stat-label">Problems Found</div>
            <div className="sb-stat-val">{counts.problems}</div>
          </div>
          {counts.followups > 0 && (
            <div className="sb-stat" style={{ background:'#2a1a00', border:'1px solid #4a3000' }}>
              <div className="sb-stat-label" style={{ color:'#8a6020' }}>Follow-ups Due</div>
              <div className="sb-stat-val" style={{ color:'#f0c060' }}>{counts.followups}</div>
            </div>
          )}
          <button onClick={() => supabase.auth.signOut()} className="btn btn-ghost btn-sm"
            style={{ width:'100%', justifyContent:'center', borderColor:'#222', color:'#555', marginTop:8 }}>
            Sign out
          </button>
        </div>
      </nav>

      <main className="main">{children}</main>
    </div>
  )
}
