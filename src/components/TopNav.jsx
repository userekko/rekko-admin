import { supabase } from '../supabaseClient'

export default function TopNav({ email, tab, onTabChange, needsResponseCount = 0 }) {
  return (
    <nav className="top-nav">
      <div className="top-nav-left">
        <span className="brand">Rekko Admin</span>
        <button
          className={tab === 'metrics' ? 'nav-tab active' : 'nav-tab'}
          onClick={() => onTabChange('metrics')}
        >
          Metrics
        </button>
        <button
          className={tab === 'feedback' ? 'nav-tab active' : 'nav-tab'}
          onClick={() => onTabChange('feedback')}
        >
          Feedback
          {needsResponseCount > 0 && (
            <span className="nav-tab-badge">
              {needsResponseCount > 9 ? '9+' : needsResponseCount}
            </span>
          )}
        </button>
      </div>
      <div className="top-nav-right">
        <span className="user-email">{email}</span>
        <button className="signout-btn" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
      </div>
    </nav>
  )
}
