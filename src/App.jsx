import { useCallback, useEffect, useState } from 'react'
import { ADMIN_EMAIL, supabase } from './supabaseClient'
import Login from './components/Login'
import Unauthorized from './components/Unauthorized'
import TopNav from './components/TopNav'
import MetricsDashboard from './components/MetricsDashboard'
import FeedbackTab from './components/FeedbackTab'

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = not checked yet
  const [tab, setTab] = useState('metrics')
  const [needsResponseCount, setNeedsResponseCount] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  // Fetched independently of the Feedback tab being mounted, so the nav
  // badge is accurate before the tab is ever opened. FeedbackTab calls
  // this again after any load/reply/status-toggle so the count stays in
  // sync with what's shown once you do open it.
  const refreshNeedsResponseCount = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_admin_feedback_list')
    if (!error) {
      setNeedsResponseCount((data ?? []).filter((item) => item.needs_response).length)
    }
  }, [])

  useEffect(() => {
    if (session?.user?.email === ADMIN_EMAIL) {
      refreshNeedsResponseCount()
    }
  }, [session, refreshNeedsResponseCount])

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
      <TopNav
        email={email}
        tab={tab}
        onTabChange={setTab}
        needsResponseCount={needsResponseCount}
      />
      <main className="main-content">
        {tab === 'metrics' ? (
          <MetricsDashboard />
        ) : (
          <FeedbackTab onFeedbackChange={refreshNeedsResponseCount} />
        )}
      </main>
    </div>
  )
}
