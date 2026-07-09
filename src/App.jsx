import { useEffect, useState } from 'react'
import { ADMIN_EMAIL, supabase } from './supabaseClient'
import Login from './components/Login'
import Unauthorized from './components/Unauthorized'
import TopNav from './components/TopNav'
import MetricsDashboard from './components/MetricsDashboard'
import FeedbackTab from './components/FeedbackTab'

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = not checked yet
  const [tab, setTab] = useState('metrics')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return <div className="centered-page">Loading…</div>
  }

  if (!session) {
    return <Login />
  }

  const email = session.user?.email

  // Client-side UX guard only — gives a non-admin a clear message instead of
  // a confusing blank/broken dashboard. The real enforcement is server-side:
  // get_admin_dashboard_stats() and get-crash-stats both independently check
  // the caller's JWT against the admin account and reject otherwise.
  if (email !== ADMIN_EMAIL) {
    return <Unauthorized email={email} />
  }

  return (
    <div className="app-shell">
      <TopNav email={email} tab={tab} onTabChange={setTab} />
      <main className="main-content">
        {tab === 'metrics' ? <MetricsDashboard /> : <FeedbackTab />}
      </main>
    </div>
  )
}
