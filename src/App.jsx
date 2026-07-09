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
  const [unreadCount, setUnreadCount] = useState(0)

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
  const refreshUnreadCount = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_admin_feedback_list')
    if (!error) {
      setUnreadCount((data ?? []).filter((item) => item.unread).length)
    }
  }, [])

  const isAdmin = session?.user?.email === ADMIN_EMAIL

  useEffect(() => {
    if (isAdmin) {
      refreshUnreadCount()
    }
  }, [isAdmin, refreshUnreadCount])

  // Keeps the tab badge accurate whether or not the Feedback tab itself is
  // mounted - e.g. a new submission arriving while Metrics is showing.
  useEffect(() => {
    if (!isAdmin) return
    const channel = supabase
      .channel('admin-feedback-badge')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'app_feedback' },
        refreshUnreadCount
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'app_feedback' },
        refreshUnreadCount
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'feedback_replies' },
        refreshUnreadCount
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [isAdmin, refreshUnreadCount])

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
        unreadCount={unreadCount}
      />
      <main className="main-content">
        {tab === 'metrics' ? (
          <MetricsDashboard />
        ) : (
          <FeedbackTab onFeedbackChange={refreshUnreadCount} />
        )}
      </main>
    </div>
  )
}
