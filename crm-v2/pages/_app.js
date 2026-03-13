import '../styles/globals.css'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/router'
import { Analytics } from '@vercel/analytics/next'

export default function App({ Component, pageProps }) {
  const [session, setSession] = useState(undefined)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (!session && router.pathname !== '/login') router.push('/login')
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      if (session && router.pathname === '/login') router.push('/')
      if (!session) router.push('/login')
    })
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#111110' }}>
      <div style={{ color:'#444', fontFamily:'Geist Mono,monospace', fontSize:12 }}>Loading…</div>
    </div>
  )

  return <>
    <Component {...pageProps} session={session} />
    <Analytics />
  </>
}
